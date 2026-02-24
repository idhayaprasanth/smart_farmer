from datetime import datetime, timedelta
import json
import os

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.ai_service import (
    analyze_field_health,
    generate_crop_plan,
    generate_daily_irrigation_target,
    get_future_crop_chat,
    get_general_agri_chat,
)

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    APSCHEDULER_AVAILABLE = True
except ImportError:
    BackgroundScheduler = None
    CronTrigger = None
    APSCHEDULER_AVAILABLE = False


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# FILE PATHS
# =====================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.join(BASE_DIR, "data")
FIELDS_FILE = os.path.join(DATA_FOLDER, "fields.json")
CROPS_FILE = os.path.join(DATA_FOLDER, "crops.json")
SETTINGS_FILE = os.path.join(DATA_FOLDER, "settings.json")
SENSORS_FILE = os.path.join(DATA_FOLDER, "sensors.json")
PLANS_FOLDER = os.path.join(DATA_FOLDER, "plans")
WATERING_TARGETS_FILE = os.path.join(DATA_FOLDER, "watering_targets.json")
WATERING_LOGS_FILE = os.path.join(DATA_FOLDER, "watering_logs.json")

os.makedirs(DATA_FOLDER, exist_ok=True)
os.makedirs(PLANS_FOLDER, exist_ok=True)


# =====================================================
# HELPERS
# =====================================================

def load_json(file, default):
    if not os.path.exists(file):
        return default
    try:
        with open(file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def save_json(file, data):
    with open(file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            pass

    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def ensure_sensor_bucket(sensors: dict, field_id: str) -> dict:
    field_data = sensors.get(field_id)

    if isinstance(field_data, dict) and ("latest" in field_data or "history" in field_data):
        if not isinstance(field_data.get("history"), list):
            field_data["history"] = []
        return field_data

    if isinstance(field_data, dict) and field_data:
        bucket = {"latest": field_data, "history": [field_data]}
    else:
        bucket = {"latest": None, "history": []}

    sensors[field_id] = bucket
    return bucket


def get_sensor_latest_and_history(sensors: dict, field_id: str) -> tuple[dict | None, list[dict]]:
    field_data = sensors.get(field_id, {})
    if not isinstance(field_data, dict):
        return None, []

    if "latest" in field_data or "history" in field_data:
        latest = field_data.get("latest")
        history = field_data.get("history", [])
        if not isinstance(history, list):
            history = []
        return latest, history

    if any(k in field_data for k in ("moisture", "temperature", "humidity")):
        return field_data, [field_data]

    return None, []


def summarize_moisture_trend(history: list[dict], hours: int = 24) -> dict:
    now = datetime.now()
    cutoff = now - timedelta(hours=hours)
    values: list[float] = []

    for row in history:
        ts = parse_datetime(str(row.get("timestamp", "")))
        if ts and ts < cutoff:
            continue
        moisture = row.get("moisture")
        if isinstance(moisture, (int, float)):
            values.append(float(moisture))

    if not values:
        return {
            "points": 0,
            "avg_moisture": None,
            "min_moisture": None,
            "max_moisture": None,
            "trend": "unknown",
            "delta": None,
        }

    delta = round(values[-1] - values[0], 2)
    if delta > 2:
        trend = "increasing"
    elif delta < -2:
        trend = "decreasing"
    else:
        trend = "stable"

    return {
        "points": len(values),
        "avg_moisture": round(sum(values) / len(values), 2),
        "min_moisture": round(min(values), 2),
        "max_moisture": round(max(values), 2),
        "trend": trend,
        "delta": delta,
    }


def get_active_field_id() -> str | None:
    settings = load_json(SETTINGS_FILE, {"active_field": None})
    return settings.get("active_field")


def get_active_crop(field_id: str, crops: list[dict] | None = None) -> dict | None:
    crop_rows = crops if crops is not None else load_json(CROPS_FILE, [])
    return next(
        (c for c in crop_rows if c.get("field_id") == field_id and c.get("status") == "active"),
        None,
    )


def get_last_crop_for_field(field_id: str, crops: list[dict]) -> dict | None:
    field_crops = [c for c in crops if c.get("field_id") == field_id]
    if not field_crops:
        return None

    def _created_at_key(crop: dict) -> datetime:
        return parse_datetime(str(crop.get("created_at", ""))) or datetime.min

    return max(field_crops, key=_created_at_key)


def is_future_crop_question(question: str) -> bool:
    q = question.lower()
    markers = [
        "next crop",
        "future crop",
        "crop rotation",
        "what should i grow next",
        "what crop next",
        "next season",
        "after this crop",
        "suggest next crop",
    ]
    return any(marker in q for marker in markers)


def complete_watering_cycle_log(field_id: str, target: dict, sensor_entry: dict) -> None:
    logs = load_json(WATERING_LOGS_FILE, [])
    if not isinstance(logs, list):
        logs = []

    end_time = parse_datetime(str(sensor_entry.get("timestamp"))) or datetime.now()
    start_time = parse_datetime(str(target.get("started_at", "")))
    duration_minutes = 0.0
    if start_time:
        duration_minutes = max(0.0, round((end_time - start_time).total_seconds() / 60.0, 2))

    logs.append(
        {
            "field_id": field_id,
            "crop_id": target.get("crop_id"),
            "date": end_time.date().isoformat(),
            "initial_moisture": target.get("initial_moisture"),
            "final_moisture": sensor_entry.get("moisture"),
            "duration_minutes": duration_minutes,
            "temperature": sensor_entry.get("temperature"),
            "humidity": sensor_entry.get("humidity"),
        }
    )
    save_json(WATERING_LOGS_FILE, logs)


def get_plan_file_path(field_id: str) -> str:
    return os.path.join(PLANS_FOLDER, f"{field_id}.json")


def save_plan_document(field_id: str, payload: dict) -> None:
    with open(get_plan_file_path(field_id), "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=4)


def run_crop_plan_generation_task(
    field_id: str,
    crop_id: str,
    crop_name: str,
    seed_date: str,
    soil_type: str,
    history: list[dict],
) -> None:
    try:
        plan = generate_crop_plan(crop_name, seed_date, soil_type, history)
        if not isinstance(plan, dict):
            raise ValueError("AI plan response is not a JSON object")

        existing = load_json(get_plan_file_path(field_id), {})
        if isinstance(existing, dict) and existing.get("crop_id") not in (None, crop_id):
            # A newer crop plan job has replaced this one; avoid stale overwrite.
            return

        save_plan_document(
            field_id,
            {
                "crop_id": crop_id,
                "field_id": field_id,
                "status": "ready",
                "plan": plan,
                "last_generated": str(datetime.now()),
            },
        )
    except Exception as exc:
        print(f"Crop plan background generation failed for {field_id}/{crop_id}: {exc}")

        existing = load_json(get_plan_file_path(field_id), {})
        if isinstance(existing, dict) and existing.get("crop_id") not in (None, crop_id):
            return

        save_plan_document(
            field_id,
            {
                "crop_id": crop_id,
                "field_id": field_id,
                "status": "failed",
                "message": "AI plan generation failed. Retry by adding crop again.",
                "plan": {
                    "soil_preparation": "Unable to generate now.",
                    "planting_phase": "Retry in a few minutes.",
                    "growth_timeline": [],
                    "expected_harvest": "Unknown",
                    "pro_tips": "Use soil test and manual irrigation schedule.",
                },
                "last_generated": str(datetime.now()),
            },
        )


# Initialize base files
if not os.path.exists(SETTINGS_FILE):
    save_json(SETTINGS_FILE, {"active_field": None})

if not os.path.exists(SENSORS_FILE):
    save_json(SENSORS_FILE, {})

if not os.path.exists(WATERING_TARGETS_FILE):
    save_json(WATERING_TARGETS_FILE, {})

if not os.path.exists(WATERING_LOGS_FILE):
    save_json(WATERING_LOGS_FILE, [])


# =====================================================
# SCHEDULER (DAILY 6 PM AI IRRIGATION CONTROL)
# =====================================================

scheduler = BackgroundScheduler() if APSCHEDULER_AVAILABLE else None


def run_daily_irrigation_control() -> None:
    active_field = get_active_field_id()
    if not active_field:
        print("Irrigation scheduler skipped: no active field.")
        return

    sensors = load_json(SENSORS_FILE, {})
    latest_sensor, sensor_history = get_sensor_latest_and_history(sensors, active_field)
    if not latest_sensor:
        print(f"Irrigation scheduler skipped: no live sensor data for {active_field}.")
        return

    crops = load_json(CROPS_FILE, [])
    active_crop = get_active_crop(active_field, crops)
    if not active_crop:
        print(f"Irrigation scheduler skipped: no active crop for {active_field}.")
        return

    seed_date = parse_datetime(str(active_crop.get("seed_date", "")))
    crop_age_days = max(0, (datetime.now().date() - seed_date.date()).days) if seed_date else 0

    moisture_trend_24h = summarize_moisture_trend(sensor_history, hours=24)
    decision = generate_daily_irrigation_target(
        crop_name=str(active_crop.get("crop_name", "unknown")),
        soil_type=str(active_crop.get("soil_type", "unknown")),
        crop_age_days=crop_age_days,
        moisture_level=latest_sensor.get("moisture"),
        temperature=latest_sensor.get("temperature"),
        humidity=latest_sensor.get("humidity"),
        moisture_trend_24h=moisture_trend_24h,
    )

    targets = load_json(WATERING_TARGETS_FILE, {})
    if not isinstance(targets, dict):
        targets = {}

    if decision.get("watering_required"):
        targets[active_field] = {
            "target_moisture": decision.get("target_moisture"),
            "watering_required": True,
            "reasoning": decision.get("reasoning"),
            "started_at": str(datetime.now()),
            "initial_moisture": latest_sensor.get("moisture"),
            "crop_id": active_crop.get("crop_id"),
            "crop_name": active_crop.get("crop_name"),
        }
        print(f"Daily irrigation target set for {active_field}: {targets[active_field]}")
    else:
        if active_field in targets:
            targets.pop(active_field, None)
        print(f"Daily irrigation target not required for {active_field}.")

    save_json(WATERING_TARGETS_FILE, targets)


@app.on_event("startup")
def start_scheduler():
    if not APSCHEDULER_AVAILABLE:
        print("APScheduler is not installed. Daily 6 PM irrigation job is disabled.")
        return

    if scheduler and not scheduler.running:
        scheduler.add_job(
            run_daily_irrigation_control,
            CronTrigger(hour=18, minute=0),
            id="daily_ai_irrigation_control",
            replace_existing=True,
        )
        scheduler.start()
        print("Daily 6 PM AI irrigation scheduler started.")


@app.on_event("shutdown")
def stop_scheduler():
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)


# =====================================================
# AI CHAT API
# =====================================================

class AIChatRequest(BaseModel):
    question: str


@app.post("/ai/chat")
def ai_chat(req: AIChatRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    if is_future_crop_question(question):
        active_field = get_active_field_id()
        if not active_field:
            return {
                "answer": "No active field selected. Set an active field to get future crop planning.",
                "confidence": "low",
            }

        crops = load_json(CROPS_FILE, [])
        crop_history = [c for c in crops if c.get("field_id") == active_field]
        last_crop = get_active_crop(active_field, crops) or get_last_crop_for_field(active_field, crops)
        soil_type = str(last_crop.get("soil_type", "unknown")) if last_crop else "unknown"

        sensors = load_json(SENSORS_FILE, {})
        _, sensor_history = get_sensor_latest_and_history(sensors, active_field)
        sensor_summary = summarize_moisture_trend(sensor_history, hours=24)

        return get_future_crop_chat(
            question=question,
            crop_history=crop_history,
            soil_type=soil_type,
            sensor_summary=sensor_summary,
        )

    return get_general_agri_chat(question)


# =====================================================
# FIELD APIs
# =====================================================

@app.post("/fields")
def create_field(field: dict):
    fields = load_json(FIELDS_FILE, [])

    field["field_id"] = f"field_{len(fields)+1}"
    field["created_at"] = str(datetime.now())

    fields.append(field)
    save_json(FIELDS_FILE, fields)

    return {"message": "Field created", "field_id": field["field_id"]}


@app.get("/fields")
def get_fields():
    return load_json(FIELDS_FILE, [])


@app.post("/fields/set-active/{field_id}")
def set_active_field(field_id: str):

    fields = load_json(FIELDS_FILE, [])
    if not any(f["field_id"] == field_id for f in fields):
        raise HTTPException(status_code=404, detail="Field not found")

    save_json(SETTINGS_FILE, {"active_field": field_id})

    return {"message": "Active field updated", "active_field": field_id}


@app.get("/fields/active")
def get_active_field():
    return load_json(SETTINGS_FILE, {"active_field": None})


# =====================================================
# SENSOR APIs (ACTIVE BASED - ESP USES THIS)
# =====================================================

@app.post("/sensors/update/active")
def update_active_sensor(sensor: dict):
    active_field = get_active_field_id()
    if not active_field:
        raise HTTPException(status_code=400, detail="No active field selected")

    sensors = load_json(SENSORS_FILE, {})
    bucket = ensure_sensor_bucket(sensors, active_field)

    sensor_entry = {
        "moisture": sensor.get("moisture"),
        "temperature": sensor.get("temperature"),
        "humidity": sensor.get("humidity"),
        "timestamp": str(datetime.now()),
    }

    bucket["latest"] = sensor_entry
    history = bucket.get("history", [])
    history.append(sensor_entry)
    bucket["history"] = history

    save_json(SENSORS_FILE, sensors)

    # Smart motor logic with target support
    motor_status = "OFF"
    targets = load_json(WATERING_TARGETS_FILE, {})
    if not isinstance(targets, dict):
        targets = {}

    target = targets.get(active_field)
    current_moisture = sensor_entry.get("moisture")

    if target and isinstance(current_moisture, (int, float)):
        target_moisture = target.get("target_moisture")
        if isinstance(target_moisture, str):
            try:
                target_moisture = float(target_moisture)
            except ValueError:
                target_moisture = None

        if isinstance(target_moisture, (int, float)):
            if current_moisture < target_moisture:
                motor_status = "ON"
            else:
                motor_status = "OFF"
                complete_watering_cycle_log(active_field, target, sensor_entry)
                targets.pop(active_field, None)
                save_json(WATERING_TARGETS_FILE, targets)
        else:
            # Corrupt target entry; clear and continue with fallback threshold.
            targets.pop(active_field, None)
            save_json(WATERING_TARGETS_FILE, targets)
            if current_moisture < 40:
                motor_status = "ON"
    else:
        # Existing fallback behavior
        if isinstance(current_moisture, (int, float)) and current_moisture < 40:
            motor_status = "ON"

    return {
        "field_id": active_field,
        "motor": motor_status,
        "data": sensor_entry,
    }


@app.get("/sensors/live/{field_id}")
def get_live_sensor(field_id: str):
    sensors = load_json(SENSORS_FILE, {})
    latest, _ = get_sensor_latest_and_history(sensors, field_id)

    if not latest:
        return {"message": "No sensor data"}

    return latest


@app.get("/sensors/history/{field_id}")
def get_sensor_history(field_id: str):
    sensors = load_json(SENSORS_FILE, {})
    _, history = get_sensor_latest_and_history(sensors, field_id)
    return history


# =====================================================
# CROP APIs
# =====================================================

@app.post("/crops")
def create_crop(crop: dict, background_tasks: BackgroundTasks):

    required = ["field_id", "crop_name", "seed_date", "soil_type"]
    for r in required:
        if r not in crop:
            raise HTTPException(status_code=400, detail=f"{r} is required")

    crops = load_json(CROPS_FILE, [])

    # Complete previous active crop
    for c in crops:
        if c["field_id"] == crop["field_id"] and c["status"] == "active":
            c["status"] = "completed"

    crop["crop_id"] = f"crop_{len(crops)+1}"
    crop["status"] = "active"
    crop["created_at"] = str(datetime.now())

    crops.append(crop)
    save_json(CROPS_FILE, crops)

    # Historical crops
    history = [
        c for c in crops
        if c["field_id"] == crop["field_id"] and c["crop_id"] != crop["crop_id"]
    ]

    # Save a pending plan marker and generate final plan in background.
    pending_plan_data = {
        "crop_id": crop["crop_id"],
        "field_id": crop["field_id"],
        "status": "pending",
        "message": "AI plan generation in progress. Please refresh in a few seconds.",
        "plan": {
            "soil_preparation": "Generating...",
            "planting_phase": "Generating...",
            "growth_timeline": [],
            "expected_harvest": "Generating...",
            "pro_tips": "Generating...",
        },
        "last_generated": str(datetime.now()),
    }
    save_plan_document(crop["field_id"], pending_plan_data)

    background_tasks.add_task(
        run_crop_plan_generation_task,
        crop["field_id"],
        crop["crop_id"],
        crop["crop_name"],
        crop["seed_date"],
        crop["soil_type"],
        history,
    )

    return {
        "message": "Crop added. AI plan generation started.",
        "crop_id": crop["crop_id"],
        "field_id": crop["field_id"],
        "plan_status": "pending",
    }


@app.get("/crops/live/{field_id}")
def get_live_crop(field_id: str):
    crop = get_active_crop(field_id)
    if crop:
        return crop
    return {"message": "No active crop"}


@app.get("/crops/history/{field_id}")
def get_crop_history(field_id: str):
    crops = load_json(CROPS_FILE, [])
    return [c for c in crops if c["field_id"] == field_id]


# =====================================================
# PLAN APIs
# =====================================================

@app.get("/plans/{field_id}")
def get_plan(field_id: str):

    file_path = os.path.join(PLANS_FOLDER, f"{field_id}.json")

    if not os.path.exists(file_path):
        return {"message": "No plan found"}

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


# =====================================================
# ANALYTICS APIs
# =====================================================

@app.get("/analytics/field-health/{field_id}")
def get_field_health(field_id: str):
    return analyze_field_health(field_id)


# =====================================================
# DASHBOARD (AUTO ACTIVE FIELD)
# =====================================================

@app.get("/dashboard")
def dashboard():

    active_field = get_active_field_id()
    if not active_field:
        return {"message": "No active field selected"}

    sensors = load_json(SENSORS_FILE, {})
    crops = load_json(CROPS_FILE, [])

    live_crop = get_active_crop(active_field, crops)
    live_sensor, sensor_history = get_sensor_latest_and_history(sensors, active_field)

    return {
        "active_field": active_field,
        "live_sensor": live_sensor,
        "sensor_history_count": len(sensor_history),
        "live_crop": live_crop,
    }

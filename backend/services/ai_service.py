from datetime import datetime, timedelta
from pathlib import Path
import json
import os

from google import genai


def _load_local_env() -> None:
    """Load backend/.env without adding an external dependency."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _parse_datetime(value: str | None) -> datetime | None:
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


def _extract_sensor_history(sensor_store: dict, field_id: str) -> list[dict]:
    field_data = sensor_store.get(field_id, {})
    if not isinstance(field_data, dict):
        return []

    if "history" in field_data and isinstance(field_data["history"], list):
        return field_data["history"]

    if any(k in field_data for k in ("moisture", "temperature", "humidity")):
        return [field_data]

    return []


def _summarize_moisture_history(history: list[dict], hours: int = 24) -> dict:
    now = datetime.now()
    cutoff = now - timedelta(hours=hours)

    points: list[float] = []
    for row in history:
        ts = _parse_datetime(str(row.get("timestamp", "")))
        if ts and ts < cutoff:
            continue
        moisture = row.get("moisture")
        if isinstance(moisture, (int, float)):
            points.append(float(moisture))

    if not points:
        return {
            "points": 0,
            "avg_moisture": None,
            "min_moisture": None,
            "max_moisture": None,
            "trend": "unknown",
            "delta": None,
        }

    delta = round(points[-1] - points[0], 2)
    if delta > 2:
        trend = "increasing"
    elif delta < -2:
        trend = "decreasing"
    else:
        trend = "stable"

    return {
        "points": len(points),
        "avg_moisture": round(sum(points) / len(points), 2),
        "min_moisture": round(min(points), 2),
        "max_moisture": round(max(points), 2),
        "trend": trend,
        "delta": delta,
    }


def _to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "yes", "1", "on"}
    if isinstance(value, (int, float)):
        return value != 0
    return False


def _normalize_confidence(value: str | None) -> str:
    valid = {"low", "medium", "high"}
    if isinstance(value, str) and value.lower() in valid:
        return value.lower()
    return "medium"


def _model_json(prompt: str, fallback: dict) -> dict:
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        text = (response.text or "").strip()
        if not text:
            return fallback
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
        return fallback
    except Exception as exc:
        print("AI ERROR:", str(exc))
        return fallback


_load_local_env()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. Set it in backend/.env or environment variables."
    )

client = genai.Client(api_key=GEMINI_API_KEY)

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
CROPS_FILE = DATA_DIR / "crops.json"
SENSORS_FILE = DATA_DIR / "sensors.json"
WATERING_LOGS_FILE = DATA_DIR / "watering_logs.json"


def generate_crop_plan(crop_name, seed_date, soil_type, history):
    history_summary = [h.get("crop_name") for h in history] if history else []
    prompt = f"""
You are an expert agricultural scientist specializing in practical farming plans.

Generate a highly detailed, step-by-step crop cultivation plan.

IMPORTANT:
- The response MUST be valid JSON.
- Do NOT use markdown.
- Do NOT use code blocks.
- Return only JSON.
- Write practical, real-world instructions like an experienced farm consultant.

Crop Details:
Crop Name: {crop_name}
Seed Date: {seed_date}
Soil Type: {soil_type}

Previous Crop History:
{history_summary if history_summary else "No previous crops"}

The JSON must follow this exact structure:

{{
  "soil_preparation": "",
  "planting_phase": "",
  "growth_timeline": [
    {{
      "phase": "",
      "days_range": "",
      "key_actions": ""
    }}
  ],
  "expected_harvest": "",
  "pro_tips": ""
}}

other than growth_timeline give only need important things breifly
"""

    fallback = {
        "soil_preparation": "Unable to generate plan right now.",
        "planting_phase": "Retry in a few minutes.",
        "growth_timeline": [],
        "expected_harvest": "Unknown",
        "pro_tips": "Check soil test and irrigation schedule manually.",
    }
    return _model_json(prompt, fallback)


def get_general_agri_chat(question: str) -> dict:
    prompt = f"""
You are an agriculture assistant for Indian farming conditions.

User question:
{question}

Answer with practical and concise guidance.
Return JSON only in this format:
{{
  "answer": "",
  "confidence": "low|medium|high"
}}
"""

    fallback = {
        "answer": "I could not generate an answer right now. Please try again.",
        "confidence": "low",
    }
    data = _model_json(prompt, fallback)

    return {
        "answer": str(data.get("answer", fallback["answer"])).strip(),
        "confidence": _normalize_confidence(data.get("confidence")),
    }


def get_future_crop_chat(
    question: str,
    crop_history: list[dict],
    soil_type: str,
    sensor_summary: dict,
) -> dict:
    prompt = f"""
You are an agriculture planning assistant.

Use the field history and moisture trends to suggest the next best crop.
You must reason using:
1) nutrient depletion pattern
2) crop rotation logic
3) soil health
4) previous crop cycle
5) moisture trends

User question:
{question}

Field data:
- Crop history: {crop_history}
- Soil type: {soil_type}
- Sensor moisture summary (24h): {sensor_summary}

Return JSON only:
{{
  "answer": "",
  "confidence": "low|medium|high"
}}
"""
    fallback = {
        "answer": (
            "Based on recent repetitive cropping, rotate to a different family crop "
            "with lower water demand and add organic matter before planting."
        ),
        "confidence": "medium",
    }
    data = _model_json(prompt, fallback)

    return {
        "answer": str(data.get("answer", fallback["answer"])).strip(),
        "confidence": _normalize_confidence(data.get("confidence")),
    }


def generate_daily_irrigation_target(
    crop_name: str,
    soil_type: str,
    crop_age_days: int,
    moisture_level: float | int | None,
    temperature: float | int | None,
    humidity: float | int | None,
    moisture_trend_24h: dict,
) -> dict:
    prompt = f"""
You are an irrigation control assistant.

Field context:
- Crop: {crop_name}
- Soil type: {soil_type}
- Crop age in days: {crop_age_days}
- Current moisture: {moisture_level}
- Temperature: {temperature}
- Humidity: {humidity}
- Recent 24h moisture trend: {moisture_trend_24h}

Based on current crop stage and moisture level, how much watering is required today?
Return only JSON:
{{
  "target_moisture": 0,
  "watering_required": false,
  "reasoning": ""
}}
"""

    current_moisture = float(moisture_level) if isinstance(moisture_level, (int, float)) else 40.0
    fallback_target = round(min(70.0, max(35.0, current_moisture + 10.0)), 2)
    fallback = {
        "target_moisture": fallback_target,
        "watering_required": current_moisture < 40.0,
        "reasoning": "Fallback rule applied due to unavailable AI response.",
    }
    data = _model_json(prompt, fallback)

    target = data.get("target_moisture", fallback["target_moisture"])
    if isinstance(target, str):
        try:
            target = float(target)
        except ValueError:
            target = fallback["target_moisture"]
    if not isinstance(target, (int, float)):
        target = fallback["target_moisture"]
    target = round(max(0.0, min(100.0, float(target))), 2)

    return {
        "target_moisture": target,
        "watering_required": _to_bool(data.get("watering_required", fallback["watering_required"])),
        "reasoning": str(data.get("reasoning", fallback["reasoning"])).strip(),
    }


def analyze_field_health(field_id: str) -> dict:
    watering_logs = _load_json(WATERING_LOGS_FILE, [])
    crops = _load_json(CROPS_FILE, [])
    sensors = _load_json(SENSORS_FILE, {})

    field_logs = [
        row for row in watering_logs
        if isinstance(row, dict) and row.get("field_id") == field_id
    ]
    crop_history = [
        row for row in crops
        if isinstance(row, dict) and row.get("field_id") == field_id
    ]
    sensor_history = _extract_sensor_history(sensors, field_id)
    moisture_summary = _summarize_moisture_history(sensor_history, hours=24 * 30)

    prompt = f"""
You are an agricultural analytics engine.

Analyze field health using:
- crop history
- watering logs
- sensor moisture trends

Field id: {field_id}
Crop history: {crop_history}
Watering logs: {field_logs}
Sensor moisture summary (30d): {moisture_summary}

Return only JSON:
{{
  "soil_health_score": 0,
  "nutrient_status": "",
  "irrigation_efficiency": "",
  "recommendations": ""
}}
"""

    score_fallback = 65
    if moisture_summary["points"] > 0 and moisture_summary["trend"] == "stable":
        score_fallback = 72
    if len(crop_history) > 3:
        score_fallback -= 5

    fallback = {
        "soil_health_score": max(0, min(100, score_fallback)),
        "nutrient_status": "Likely moderate nutrient stress; rotate crops and add organics.",
        "irrigation_efficiency": "Moderate efficiency based on available moisture history.",
        "recommendations": (
            "Use crop rotation, add compost/FYM, run soil tests, and maintain controlled "
            "target-moisture irrigation."
        ),
    }
    data = _model_json(prompt, fallback)

    score = data.get("soil_health_score", fallback["soil_health_score"])
    if isinstance(score, str):
        try:
            score = float(score)
        except ValueError:
            score = fallback["soil_health_score"]
    if not isinstance(score, (int, float)):
        score = fallback["soil_health_score"]

    return {
        "soil_health_score": round(max(0.0, min(100.0, float(score))), 2),
        "nutrient_status": str(data.get("nutrient_status", fallback["nutrient_status"])).strip(),
        "irrigation_efficiency": str(
            data.get("irrigation_efficiency", fallback["irrigation_efficiency"])
        ).strip(),
        "recommendations": str(data.get("recommendations", fallback["recommendations"])).strip(),
    }


# NodeMCU Smart Irrigation Firmware

This firmware keeps your existing backend contract unchanged:

- `POST /sensors/update/active`
- JSON body:
  - `moisture`
  - `temperature`
  - `humidity`
- Reads backend response and toggles relay from `"motor":"ON"` / `"OFF"`.

## Before Upload

1. Update these values in `nodemcu_smart_irrigation.ino`:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
   - `SERVER_IP`

2. Ensure backend is running on your laptop:
   - `uvicorn main:app --host 0.0.0.0 --port 8000`

3. Install required Arduino libraries:
   - `ESP8266WiFi`
   - `ESP8266HTTPClient`
   - `DHT sensor library`

## What is improved

- Wi-Fi auto-reconnect loop.
- HTTP retry with timeout.
- Detailed serial diagnostics for connection/HTTP failures.
- Safe motor fallback (`OFF`) if backend or Wi-Fi is unavailable.
- Keeps the same payload/response behavior used by your backend.


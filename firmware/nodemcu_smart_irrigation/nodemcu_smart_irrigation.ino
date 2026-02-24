#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <DHT.h>

// =====================================================
// WIFI / BACKEND CONFIG
// =====================================================
const char* WIFI_SSID = "Idhaya_prasanth";
const char* WIFI_PASSWORD = "open12345";
const char* SERVER_IP = "10.120.247.123";  // Laptop IP running FastAPI
const uint16_t SERVER_PORT = 8000;
const char* SENSOR_ENDPOINT = "/sensors/update/active";

// =====================================================
// HARDWARE CONFIG
// =====================================================
#define DHTPIN D3
#define DHTTYPE DHT11
#define RELAY_ON LOW
#define RELAY_OFF HIGH

const uint8_t MOISTURE_PIN = A0;
const uint8_t RELAY_PIN = D1;

// Moisture calibration points (tune for your sensor)
const int MOISTURE_RAW_DRY = 1023;
const int MOISTURE_RAW_WET = 300;

// =====================================================
// RUNTIME SETTINGS
// =====================================================
const unsigned long POST_INTERVAL_MS = 5000;        // Send every 5 sec
const unsigned long WIFI_RETRY_INTERVAL_MS = 8000;  // Reconnect interval
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 7000; // Initial connect timeout
const unsigned long FAIL_BACKOFF_MS = 300;          // Delay between retries
const uint16_t HTTP_TIMEOUT_MS = 6000;
const uint8_t HTTP_MAX_RETRIES = 3;
const uint8_t MAX_CONSECUTIVE_HTTP_FAILS = 3;

DHT dht(DHTPIN, DHTTYPE);
unsigned long lastPostAt = 0;
unsigned long lastWiFiAttemptAt = 0;
int lastRelayState = RELAY_OFF;
uint8_t consecutiveHttpFails = 0;

bool hasValidDht = false;
float lastHumidity = 0.0f;
float lastTemperature = 0.0f;

struct SensorData {
  int moisture;
  float temperature;
  float humidity;
};

void setMotor(bool on) {
  int nextState = on ? RELAY_ON : RELAY_OFF;
  if (nextState != lastRelayState) {
    digitalWrite(RELAY_PIN, nextState);
    lastRelayState = nextState;
    Serial.println(on ? "[MOTOR] ON" : "[MOTOR] OFF");
  }
}

String buildUrl() {
  return "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + String(SENSOR_ENDPOINT);
}

void forceReconnectWiFi() {
  Serial.println("[WiFi] Forcing reconnect...");
  WiFi.disconnect();
  delay(200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  unsigned long now = millis();
  if ((now - lastWiFiAttemptAt) < WIFI_RETRY_INTERVAL_MS) {
    return;
  }
  lastWiFiAttemptAt = now;

  Serial.printf("[WiFi] Connecting to %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < WIFI_CONNECT_TIMEOUT_MS) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Connected. IP=%s RSSI=%d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.printf("[WiFi] Not connected. Status=%d\n", (int)WiFi.status());
  }
}

SensorData readSensors() {
  SensorData data;

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    if (hasValidDht) {
      humidity = lastHumidity;
      temperature = lastTemperature;
      Serial.println("[DHT] Invalid reading. Reusing last valid values.");
    } else {
      humidity = 0.0f;
      temperature = 0.0f;
      Serial.println("[DHT] Invalid reading. Using 0.0 fallback.");
    }
  } else {
    hasValidDht = true;
    lastHumidity = humidity;
    lastTemperature = temperature;
  }

  int raw = analogRead(MOISTURE_PIN);
  int moisture = map(raw, MOISTURE_RAW_DRY, MOISTURE_RAW_WET, 0, 100);
  moisture = constrain(moisture, 0, 100);

  data.humidity = humidity;
  data.temperature = temperature;
  data.moisture = moisture;
  return data;
}

String buildPayload(const SensorData& data) {
  String json = "{";
  json += "\"moisture\":" + String(data.moisture) + ",";
  json += "\"temperature\":" + String(data.temperature, 1) + ",";
  json += "\"humidity\":" + String(data.humidity, 1);
  json += "}";
  return json;
}

bool postSensorData(const String& payload, String& responseBody, int& statusCode) {
  HTTPClient http;
  WiFiClient localClient;
  String url = buildUrl();

  if (!http.begin(localClient, url)) {
    Serial.println("[HTTP] begin() failed.");
    return false;
  }

  http.setTimeout(HTTP_TIMEOUT_MS);
  http.setReuse(false);
  http.addHeader("Content-Type", "application/json");

  statusCode = http.POST(payload);
  if (statusCode > 0) {
    responseBody = http.getString();
    Serial.printf("[HTTP] Status=%d\n", statusCode);
    Serial.println("[HTTP] Response:");
    Serial.println(responseBody);
    http.end();
    return true;
  }

  Serial.printf("[HTTP] POST failed. code=%d error=%s\n",
                statusCode, http.errorToString(statusCode).c_str());
  http.end();
  return false;
}

void applyMotorFromResponse(const String& responseBody) {
  bool motorOn = responseBody.indexOf("\"motor\":\"ON\"") >= 0;
  setMotor(motorOn);
}

void setup() {
  Serial.begin(9600);
  delay(50);
  Serial.println("\n[BOOT] Smart Irrigation NodeMCU starting...");

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);
  lastRelayState = RELAY_OFF;

  dht.begin();

  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
#ifdef WIFI_NONE_SLEEP
  WiFi.setSleepMode(WIFI_NONE_SLEEP);
#endif
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void loop() {
  ensureWiFiConnected();

  unsigned long now = millis();
  if ((now - lastPostAt) < POST_INTERVAL_MS) {
    delay(50);
    return;
  }
  lastPostAt = now;

  SensorData data = readSensors();
  Serial.printf("[SENSOR] Moisture=%d%% Temp=%.1fC Humidity=%.1f%%\n",
                data.moisture, data.temperature, data.humidity);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WARN] WiFi disconnected. Skipping POST and forcing motor OFF for safety.");
    setMotor(false);
    return;
  }

  String payload = buildPayload(data);
  bool sent = false;
  int statusCode = -1;
  String responseBody;

  for (uint8_t attempt = 1; attempt <= HTTP_MAX_RETRIES; attempt++) {
    Serial.printf("[HTTP] Attempt %d/%d\n", attempt, HTTP_MAX_RETRIES);
    if (postSensorData(payload, responseBody, statusCode)) {
      sent = true;
      break;
    }
    delay(FAIL_BACKOFF_MS);
  }

  if (!sent) {
    consecutiveHttpFails++;
    if (consecutiveHttpFails >= MAX_CONSECUTIVE_HTTP_FAILS) {
      Serial.println("[WARN] Multiple HTTP failures. Resetting WiFi link.");
      forceReconnectWiFi();
      consecutiveHttpFails = 0;
    }
    Serial.println("[WARN] Failed to reach backend. Forcing motor OFF for safety.");
    setMotor(false);
    return;
  }

  consecutiveHttpFails = 0;
  applyMotorFromResponse(responseBody);
}

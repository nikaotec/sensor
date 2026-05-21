#include "AppNetworkManager.h"

AppNetworkManager *AppNetworkManager::instance = nullptr;

AppNetworkManager::AppNetworkManager()
    : client(espClient), lastMqttReconnectAttempt(0), mqttConnected(false),
      _ntpConfigured(false) {
  instance = this;

  uint64_t chipId = ESP.getEfuseMac();
  char idUnico[13];
  snprintf(idUnico, sizeof(idUnico), "%04X%08X", (uint16_t)(chipId >> 32),
           (uint32_t)chipId);
  _deviceId = String(idUnico);
}

void AppNetworkManager::begin(MqttCallback handler, String version) {
  messageHandler = handler;
  if (version != "")
    _currentVersion = version;
  else
    _currentVersion = FIRMWARE_VERSION;

  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setBufferSize(2048);
  client.setCallback(AppNetworkManager::staticCallback);

  wifiManager.begin();

  wifiManager.onConnect([this]() { _onWifiConnected(); });
}

void AppNetworkManager::_onWifiConnected() {
  mqttConnected = false;
  lastMqttReconnectAttempt = millis() - 16000;
  Serial.println("[NET] WiFi OK - IP: " + wifiManager.getLocalIP() +
                 " RSSI: " + String(wifiManager.getRSSI()) + "dBm");

  if (!_ntpConfigured) {
    configTime(-3 * 3600, 0, "pool.ntp.org");
    _ntpConfigured = true;
  }

  Serial.println("[NET] Tentando MQTT em " + String(MQTT_SERVER) +
                 ":" + String(MQTT_PORT) + "...");
  verifyMqtt();
}

void AppNetworkManager::staticCallback(char *topic, byte *payload,
                                       unsigned int length) {
  if (instance && instance->messageHandler) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload, length);
    if (error)
      return;

    String intent = doc["intent"] | doc["intencao"] | "";
    instance->messageHandler(intent, doc.as<JsonObject>());
  }
}

void AppNetworkManager::verifyMqtt() {
  if (wifiManager.isConnected() && !client.connected()) {
    if (millis() - lastMqttReconnectAttempt > 15000) {
      lastMqttReconnectAttempt = millis();
      String clientId = "ESP32_" + _deviceId;

      Serial.println("[MQTT] Conectando a " + String(MQTT_SERVER) +
                     ":" + String(MQTT_PORT) + " como " + clientId);

      String statusTopic = "devices/" + _deviceId + "/status";
      StaticJsonDocument<128> lwtDoc;
      lwtDoc["status"] = "offline";
      lwtDoc["version"] = _currentVersion;
      String lwtPayload;
      serializeJson(lwtDoc, lwtPayload);

      if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS,
                         statusTopic.c_str(), 1, true, lwtPayload.c_str())) {
        Serial.println("[MQTT] Conectado!");
        setupTopics();
        publishStatus(_currentVersion, "online");
      } else {
        Serial.println("[MQTT] Falha ao conectar. rc=" + String(client.state()));
      }
    }
  }
}

void AppNetworkManager::setupTopics() {
  String cmdTopic = "devices/" + _deviceId + "/cmd";
  client.subscribe(cmdTopic.c_str());
  client.subscribe(MSG_TOPIC_WEB);
  client.subscribe(MSG_TOPIC_STATUS);
}

void AppNetworkManager::update() {
  wifiManager.update();
  verifyMqtt();
  client.loop();
}

void AppNetworkManager::resetWifi() {
  Serial.println("[NET] Reset WiFi.");
  wifiManager.resetCredentials();
}

void AppNetworkManager::publish(const char *topic, String payload, bool retained) {
  if (client.connected()) {
    client.publish(topic, payload.c_str(), retained);
  }
}

void AppNetworkManager::publishStatus(String version, String status) {
  String topic = "devices/" + _deviceId + "/status";
  StaticJsonDocument<256> doc;
  doc["id"] = _deviceId;
  doc["status"] = status;
  doc["version"] = version;
  doc["uptime"] = millis() / 1000;
  doc["rssi"] = wifiManager.getRSSI();
  doc["ip"] = wifiManager.getLocalIP();
  String payload;
  serializeJson(doc, payload);
  publish(topic.c_str(), payload, true);
}

void AppNetworkManager::publishLog(String message) {
  String topic = "devices/" + _deviceId + "/logs";
  StaticJsonDocument<512> doc;
  doc["msg"] = message;
  doc["ts"] = millis();
  String payload;
  serializeJson(doc, payload);
  publish(topic.c_str(), payload);
}

void AppNetworkManager::publishProgress(int percent) {
  JsonDocument doc;
  doc["TIPO"] = "OTA_PROGRESS";
  doc["ID_DISPOSITIVO"] = _deviceId;
  doc["PROGRESSO"] = percent;
  String payload;
  serializeJson(doc, payload);
  publish(("devices/" + _deviceId + "/ota").c_str(), payload);
}

void AppNetworkManager::publishOtaSuccess(String version) {
  JsonDocument doc;
  doc["TIPO"] = "OTA_SUCCESS";
  doc["ID_DISPOSITIVO"] = _deviceId;
  doc["VERSAO"] = version;
  String payload;
  serializeJson(doc, payload);
  publish(("devices/" + _deviceId + "/ota").c_str(), payload);
}

void AppNetworkManager::publishOtaError(String error) {
  JsonDocument doc;
  doc["TIPO"] = "OTA_ERROR";
  doc["ID_DISPOSITIVO"] = _deviceId;
  doc["ERRO"] = error;
  String payload;
  serializeJson(doc, payload);
  publish(("devices/" + _deviceId + "/ota").c_str(), payload);
}

bool AppNetworkManager::isConnected() { return client.connected(); }
bool AppNetworkManager::isWifiConnected() { return wifiManager.isConnected(); }
int AppNetworkManager::getRSSI() { return wifiManager.getRSSI(); }

String AppNetworkManager::getCurrentTime() {
  struct tm ti;
  if (!getLocalTime(&ti))
    return "00:00:00";
  char buf[20];
  strftime(buf, sizeof(buf), "%H:%M:%S", &ti);
  return String(buf);
}

String AppNetworkManager::getDeviceId() { return _deviceId; }

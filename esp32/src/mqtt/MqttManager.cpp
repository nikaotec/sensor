#include "MqttManager.h"

MqttManager *MqttManager::_instance = nullptr;

MqttManager::MqttManager() : _client(_espClient), _lastReconnectAttempt(0) {
  _instance = this;

  // Gera Device ID
  uint64_t chipId = ESP.getEfuseMac();
  char idUnico[13];
  snprintf(idUnico, sizeof(idUnico), "%04X%08X", (uint16_t)(chipId >> 32),
           (uint32_t)chipId);
  _deviceId = String(idUnico);
}

void MqttManager::begin(CommandCallback handler) {
  _commandHandler = handler;

  WiFiManager wm;
  wm.setConnectTimeout(60);
  wm.setConfigPortalTimeout(180);

  String apName = "Sensor-" + _deviceId;
  if (!wm.autoConnect(apName.c_str())) {
    Serial.println("[NET] Falha ao conectar. Reiniciando...");
    delay(3000);
    ESP.restart();
  }

  Serial.println("[NET] WiFi Conectado: " + WiFi.localIP().toString());

  _client.setServer(MQTT_SERVER, MQTT_PORT);
  _client.setBufferSize(2048);
  _client.setCallback(MqttManager::staticCallback);

  connect();
}

void MqttManager::staticCallback(char *topic, byte *payload,
                                 unsigned int length) {
  if (_instance && _instance->_commandHandler) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload, length);

    if (error) {
      Serial.println("[MQTT] Erro ao processar JSON");
      return;
    }

    String intent = doc["intent"] | doc["intencao"] | "";
    _instance->_commandHandler(intent, doc.as<JsonObject>());
  }
}

void MqttManager::connect() {
  if (!_client.connected()) {
    String clientId = "ESP32_" + _deviceId;
    Serial.println("[MQTT] Conectando como " + clientId + "...");

    // LWT (Last Will and Testament) para marcar como offline
    String statusTopic = "devices/" + _deviceId + "/status";
    StaticJsonDocument<128> lwtDoc;
    lwtDoc["status"] = "offline";
    lwtDoc["version"] = FIRMWARE_VERSION;
    String lwtPayload;
    serializeJson(lwtDoc, lwtPayload);

    if (_client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS,
                        statusTopic.c_str(), 1, true, lwtPayload.c_str())) {
      Serial.println("[MQTT] Conectado!");
      setupTopics();
      publishStatus(FIRMWARE_VERSION, "online");
    }
  }
}

void MqttManager::setupTopics() {
  String cmdTopic = "devices/" + _deviceId + "/cmd";
  _client.subscribe(cmdTopic.c_str());
  _client.subscribe(
      MSG_TOPIC_WEB); // Mantendo compatibilidade com sistema atual
  Serial.println("[MQTT] Inscrito nos topicos de comando.");
}

void MqttManager::update() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!_client.connected()) {
      unsigned long now = millis();
      if (now - _lastReconnectAttempt > 10000) {
        _lastReconnectAttempt = now;
        connect();
      }
    }
    _client.loop();
  }
}

void MqttManager::publishStatus(String version, String status) {
  String topic = "devices/" + _deviceId + "/status";
  StaticJsonDocument<256> doc;
  doc["id"] = _deviceId;
  doc["status"] = status;
  doc["version"] = version;
  doc["uptime"] = millis() / 1000;
  doc["rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.localIP().toString();

  String payload;
  serializeJson(doc, payload);
  _client.publish(topic.c_str(), payload.c_str(), true);
}

void MqttManager::publishLog(String message) {
  String topic = "devices/" + _deviceId + "/logs";
  StaticJsonDocument<512> doc;
  doc["msg"] = message;
  doc["ts"] = millis();

  String payload;
  serializeJson(doc, payload);
  _client.publish(topic.c_str(), payload.c_str());
  Serial.println("[LOG REMOTE] " + message);
}

void MqttManager::publishProgress(int percent) {
  JsonDocument doc;
  doc["TIPO"] = "OTA_PROGRESS";
  doc["ID_DISPOSITIVO"] = _deviceId;
  doc["PROGRESSO"] = percent;

  String payload;
  serializeJson(doc, payload);
  publish("devices/" + _deviceId + "/ota", payload);
}

void MqttManager::publishOtaSuccess(String version) {
  JsonDocument doc;
  doc["TIPO"] = "OTA_SUCCESS";
  doc["ID_DISPOSITIVO"] = _deviceId;
  doc["VERSAO"] = version;
  doc["MSG"] = "Update complete. Rebooting...";

  String payload;
  serializeJson(doc, payload);
  publish("devices/" + _deviceId + "/ota", payload);
}

void MqttManager::publishOtaError(String error) {
  JsonDocument doc;
  doc["TIPO"] = "OTA_ERROR";
  doc["ID_DISPOSITIVO"] = _deviceId;
  doc["ERRO"] = error;

  String payload;
  serializeJson(doc, payload);
  publish("devices/" + _deviceId + "/ota", payload);
}

void MqttManager::publish(String topic, String payload, bool retained) {
  _client.publish(topic.c_str(), payload.c_str(), retained);
}

String MqttManager::getCurrentTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "00:00:00";
  }
  char timeStringBuff[20];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%H:%M:%S", &timeinfo);
  return String(timeStringBuff);
}

void MqttManager::resetWifi() {
  WiFiManager wm;
  wm.resetSettings();
  ESP.restart();
}

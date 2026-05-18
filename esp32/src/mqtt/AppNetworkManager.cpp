#include "AppNetworkManager.h"

AppNetworkManager *AppNetworkManager::instance = nullptr;

AppNetworkManager::AppNetworkManager() : client(espClient) {
  instance = this;
  lastMqttReconnectAttempt = 0;
  wifiConnected = false;
}

void AppNetworkManager::begin(MqttCallback handler) {
  messageHandler = handler;

  WiFiManager wm;

  // Configurações do portal
  wm.setConnectTimeout(60);       // Timeout para tentar conectar ao WiFi salvo
  wm.setConfigPortalTimeout(180); // Timeout para o AP de configuração (3 min)

  String apName = "Sensor-" + getIdDispositivo();
  Serial.println("[NET] Iniciando WiFiManager. AP: " + apName);

  // autoConnect tenta conectar ao WiFi salvo.
  // Se falhar, abre o AP chamando apName.
  if (!wm.autoConnect(apName.c_str())) {
    Serial.println(
        "[NET] Falha ao conectar e timeout do portal. Reiniciando...");
    delay(3000);
    ESP.restart();
  }

  Serial.println("\n[NET] WiFi CONECTADO - IP: " + WiFi.localIP().toString());

  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setBufferSize(1024);
  client.setCallback(AppNetworkManager::staticCallback);
  configTime(-3 * 3600, 0, "pool.ntp.org");
}

void AppNetworkManager::staticCallback(char *topic, byte *payload,
                                       unsigned int length) {
  if (instance && instance->messageHandler) {
    String msg;
    for (unsigned int i = 0; i < length; i++) {
      msg += (char)payload[i];
    }
    instance->messageHandler(String(topic), msg);
  }
}

void AppNetworkManager::verifyWifi() {
  bool wasConnected = wifiConnected;
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    if (!wasConnected) {
      Serial.println("[NET] WiFi CONECTADO - IP: " + WiFi.localIP().toString() +
                     " RSSI: " + String(WiFi.RSSI()) + "dBm");
    }
  } else {
    wifiConnected = false;
    if (wasConnected) {
      Serial.println("[NET] WiFi DESCONECTADO");
    }
  }
}

void AppNetworkManager::verifyMqtt() {
  if (WiFi.status() == WL_CONNECTED && !client.connected()) {
    if (millis() - lastMqttReconnectAttempt > 15000) {
      lastMqttReconnectAttempt = millis();
      String clientId = "ESP32_" + getIdDispositivo();
      Serial.println("[MQTT] Tentando conectar ao broker " +
                     String(MQTT_SERVER) + ":" + String(MQTT_PORT) +
                     " com ID: " + clientId + "...");
      if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
        client.subscribe(MSG_TOPIC_STATUS);
        client.subscribe(MSG_TOPIC_WEB);
        Serial.println(
            "[MQTT] CONECTADO! Subscrito em: " + String(MSG_TOPIC_STATUS) +
            " e " + String(MSG_TOPIC_WEB));
      } else {
        Serial.println("[MQTT] FALHA - codigo: " + String(client.state()));
      }
    }
  }
}

void AppNetworkManager::update() {
  verifyWifi();
  verifyMqtt();
  client.loop();
}

void AppNetworkManager::resetWifi() {
  Serial.println("[NET] Resetando configuracoes de WiFi...");
  WiFiManager wm;
  wm.resetSettings();
  delay(500);
  ESP.restart();
}

void AppNetworkManager::publish(const char *topic, String payload) {
  if (client.connected()) {
    bool ok = client.publish(topic, payload.c_str());
    Serial.println("[MQTT TX] " + String(topic) + " (" +
                   String(payload.length()) + " bytes) " +
                   (ok ? "OK" : "FALHOU"));
  } else {
    Serial.println("[MQTT TX] ERRO: Nao conectado ao broker!");
  }
}

bool AppNetworkManager::isConnected() { return client.connected(); }

bool AppNetworkManager::isWifiConnected() { return wifiConnected; }

int AppNetworkManager::getRSSI() { return WiFi.RSSI(); }

String AppNetworkManager::getCurrentTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "00:00:00";
  }
  char timeStringBuff[20];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%H:%M:%S", &timeinfo);
  return String(timeStringBuff);
}

String AppNetworkManager::getIdDispositivo() {
  uint64_t chipId = ESP.getEfuseMac();
  char idUnico[13];
  snprintf(idUnico, sizeof(idUnico), "%04X%08X", (uint16_t)(chipId >> 32),
           (uint32_t)chipId);
  return String(idUnico);
}

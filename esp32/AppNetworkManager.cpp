#include "AppNetworkManager.h"

AppNetworkManager *AppNetworkManager::instance = nullptr;

AppNetworkManager::AppNetworkManager() : client(espClient) {
  instance = this;
  lastMqttReconnectAttempt = 0;
  wifiConnected = false;
}

void AppNetworkManager::begin(MqttCallback handler) {
  messageHandler = handler;

  Serial.println("[NET] Conectando ao WiFi: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 30000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[NET] WiFi CONECTADO - IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[NET] FALHA no WiFi. Reiniciando...");
    delay(3000);
    ESP.restart();
  }

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
      Serial.println("[MQTT] Conectando ao EMQX " + String(MQTT_SERVER) + ":" +
                     String(MQTT_PORT) + " ID: " + clientId +
                     " USER: " + String(MQTT_USER));
      if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
        client.subscribe(MSG_TOPIC_STATUS);
        client.subscribe(MSG_TOPIC_WEB);
        Serial.println(
            "[MQTT] ✅ CONECTADO! Subscrito em: " + String(MSG_TOPIC_STATUS) +
            " e " + String(MSG_TOPIC_WEB));
      } else {
        Serial.println("[MQTT] ❌ FALHA - rc=" + String(client.state()) +
                       " (5=bad credentials, 2=server unavailable)");
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
  WiFi.disconnect(true); // Apaga credenciais salvas da NVM
  delay(500);
  ESP.restart();
}

void AppNetworkManager::publish(const char *topic, String payload,
                                uint8_t qos) {
  if (client.connected()) {
    bool ok = client.publish(topic, payload.c_str(), false, qos);
    Serial.println("[MQTT TX] " + String(topic) + " QoS=" + String(qos) + " (" +
                   String(payload.length()) + "b) " + (ok ? "OK" : "FALHOU"));
  } else {
    Serial.println("[MQTT TX] ERRO: Nao conectado ao EMQX!");
  }
}

/**
 * Publica no topico padrao EMQX: telemetria/{device_id}
 * Usa QoS 1 para garantir entrega exactly-once-or-more.
 */
void AppNetworkManager::publishTelemetria(String payload) {
  String topic = String(MSG_TOPIC_TELEMETRIA) + "/" + getIdDispositivo();
  publish(topic.c_str(), payload, 1);
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

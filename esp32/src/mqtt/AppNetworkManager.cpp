#include "AppNetworkManager.h"

AppNetworkManager *AppNetworkManager::instance = nullptr;

AppNetworkManager::AppNetworkManager() : client(espClient) {
  instance = this;
  lastMqttReconnectAttempt = 0;
  lastWifiReconnectAttempt = 0;
  wifiConnected = false;
  _ntpConfigured = false;
  _portalActive = false;
}

void AppNetworkManager::begin(MqttCallback handler) {
  messageHandler = handler;

  // Configura cliente MQTT imediatamente (não depende de WiFi)
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setBufferSize(1024);
  client.setCallback(AppNetworkManager::staticCallback);

  // Inicia WiFi em modo estação
  WiFi.mode(WIFI_STA);

  // Verifica se há credenciais salvas pelo WiFiManager (NVS)
  // Se houver, tenta conectar imediatamente de forma não bloqueante
  String savedSSID = WiFi.SSID();
  if (savedSSID.length() > 0) {
    Serial.println("[NET] Credenciais encontradas. Conectando a: " + savedSSID);
    WiFi.begin(); // Usa credenciais salvas sem bloquear
  } else {
    // Sem credenciais: abre portal de configuração não bloqueante
    _startConfigPortal();
  }

  Serial.println("[NET] WiFi iniciado em background. Dispositivo operacional.");
}

void AppNetworkManager::_startConfigPortal() {
  if (_portalActive)
    return;

  String apName = "Sensor-" + getIdDispositivo();
  Serial.println("[NET] Sem credenciais salvas. Abrindo portal: " + apName);

  WiFiManager wm;
  wm.setConfigPortalBlocking(false); // Portal não bloqueante
  wm.setConfigPortalTimeout(180);    // Fecha após 3 min sem configuração

  if (wm.autoConnect(apName.c_str())) {
    // Conectou durante o autoConnect (credenciais já existiam)
    _onWifiConnected();
  } else {
    // Portal aberto em background. O usuario pode conectar via AP pelo app.
    _portalActive = true;
  }
}

void AppNetworkManager::_onWifiConnected() {
  wifiConnected = true;
  _portalActive = false;
  Serial.println("[NET] WiFi CONECTADO - IP: " + WiFi.localIP().toString() +
                 " RSSI: " + String(WiFi.RSSI()) + "dBm");

  if (!_ntpConfigured) {
    configTime(-3 * 3600, 0, "pool.ntp.org");
    _ntpConfigured = true;
    Serial.println("[NET] NTP configurado.");
  }
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
    if (!wasConnected) {
      _onWifiConnected();
    }
    wifiConnected = true;
  } else {
    if (wasConnected) {
      wifiConnected = false;
      Serial.println("[NET] WiFi DESCONECTADO. Tentará reconectar...");
    }

    // Tenta reconectar a cada 30 segundos sem bloquear o loop
    if (millis() - lastWifiReconnectAttempt > 30000) {
      lastWifiReconnectAttempt = millis();
      String savedSSID = WiFi.SSID();
      if (savedSSID.length() > 0) {
        Serial.println("[NET] Tentando reconectar a: " + savedSSID);
        WiFi.reconnect();
      } else {
        // Sem credenciais: reabre portal se não estiver ativo
        if (!_portalActive) {
          _startConfigPortal();
        }
      }
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
  ESP.restart(); // Único restart intencional: reset pelo usuário via menu
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

#include "OtaManager.h"
#include <HTTPUpdate.h>
#include <WiFiClientSecure.h>

OtaManager *OtaManager::_instance = nullptr;

OtaManager::OtaManager()
    : _isUpdating(false), _otaError(""), _progress(0),
      _progressCallback(nullptr) {
  _instance = this;
}

void OtaManager::begin(OtaProgressCallback progressCallback) {
  _progressCallback = progressCallback;
  Serial.println("[OTA] Gerenciador OTA Inicializado.");
}

void OtaManager::handleProgress(int cur, int total) {
  if (_instance) {
    int p = (cur * 100) / total;
    if (p != _instance->_progress) {
      _instance->_progress = p;
      if (p % 5 == 0) { // Report every 5%
        Serial.printf("[OTA] Progresso: %d%%\n", p);
        if (_instance->_progressCallback) {
          _instance->_progressCallback(p);
        }
      }
    }
  }
}

bool OtaManager::startOTA(String url, String expectedVersion,
                          String expectedChecksum) {
  if (_isUpdating)
    return false;

  _isUpdating = true;
  _progress = 0;
  _otaError = "";

  Serial.println("[OTA] Iniciando atualizacao via HTTPUpdate...");
  Serial.println("[OTA] URL: " + url);

  WiFiClientSecure client;
  client.setInsecure(); // Necessário para firmware.nikaotech.com

  // Configura callback de progresso
  httpUpdate.onProgress(handleProgress);

  // Opcional: Reboot automático na biblioteca pode ser desativado para
  // enviarmos o MQTT antes
  httpUpdate.rebootOnUpdate(false);

  t_httpUpdate_return ret = httpUpdate.update(client, url);

  _isUpdating = false;

  switch (ret) {
  case HTTP_UPDATE_FAILED:
    _otaError = "HTTP_UPDATE_FAILED Error (" +
                String(httpUpdate.getLastError()) +
                "): " + httpUpdate.getLastErrorString();
    Serial.println("[OTA] " + _otaError);
    return false;

  case HTTP_UPDATE_NO_UPDATES:
    _otaError = "HTTP_UPDATE_NO_UPDATES";
    Serial.println("[OTA] " + _otaError);
    return false;

  case HTTP_UPDATE_OK:
    Serial.println("[OTA] HTTP_UPDATE_OK");
    return true;
  }

  return false;
}

void OtaManager::rebootDevice() {
  Serial.println("[OTA] Reiniciando dispositivo...");
  delay(1000);
  ESP.restart();
}

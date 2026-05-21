#include "OtaManager.h"
#include <esp_ota_ops.h>
#include <WiFi.h>

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
      if (p % 5 == 0) {
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

  Serial.println("[OTA] Iniciando atualizacao...");
  Serial.println("[OTA] URL: " + url);

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(15000);

  HTTPClient http;
  http.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);
  http.begin(client, url);

  int httpCode = http.sendRequest("GET");
  if (httpCode != HTTP_CODE_OK) {
    _otaError = "HTTP Error: " + String(httpCode);
    Serial.println("[OTA] " + _otaError);
    _isUpdating = false;
    http.end();
    return false;
  }

  int contentLength = http.getSize();
  if (contentLength <= 0) {
    _otaError = "Content-Length unknown";
    Serial.println("[OTA] " + _otaError);
    _isUpdating = false;
    http.end();
    return false;
  }

  Serial.printf("[OTA] Tamanho do firmware: %d bytes (%.1f KB)\n",
                contentLength, contentLength / 1024.0);

  // Check if OTA partition exists
  const esp_partition_t *partition = esp_ota_get_next_update_partition(NULL);

  bool canUseOta = (partition != NULL);

  if (canUseOta) {
    Serial.println("[OTA] Usando particao OTA (seguro).");
  } else {
    Serial.println("[OTA] Sem particao OTA. Usando particao atual (risco de brick se faltar energia).");
  }

  // Start Update
  int updateCommand = canUseOta ? U_FLASH : U_FLASH;
  if (!Update.begin(contentLength, updateCommand)) {
    _otaError = "Update.begin failed";
    Serial.println("[OTA] " + _otaError);
    _isUpdating = false;
    http.end();
    return false;
  }

  if (expectedChecksum.length() > 0) {
    Update.setMD5(expectedChecksum.c_str());
  }

  // Stream firmware
  WiFiClient *stream = http.getStreamPtr();
  int totalRead = 0;
  int lastReport = 0;
  uint8_t buffer[2048];

  while (http.connected() && totalRead < contentLength) {
    int len = stream->available();
    if (len > 0) {
      int toRead = (len > (int)sizeof(buffer)) ? sizeof(buffer) : len;
      int read = stream->readBytes(buffer, toRead);
      int written = Update.write(buffer, read);
      if (written != read) {
        _otaError = "Write mismatch: wrote " + String(written) + " of " + String(read);
        Serial.println("[OTA] " + _otaError);
        break;
      }
      totalRead += written;

      int p = (totalRead * 100) / contentLength;
      if (p - lastReport >= 5) {
        lastReport = p;
        Serial.printf("[OTA] Progresso: %d%%\n", p);
        if (_progressCallback) {
          _progressCallback(p);
        }
      }
    } else {
      delay(1);
    }
  }

  http.end();

  if (totalRead < contentLength) {
    _otaError = "Download incomplete: " + String(totalRead) + "/" + String(contentLength);
    Serial.println("[OTA] " + _otaError);
    Update.abort();
    _isUpdating = false;
    return false;
  }

  if (!Update.end(true)) {
    _otaError = "Update.end failed (error " + String(Update.getError()) + ")";
    Serial.println("[OTA] " + _otaError);
    _isUpdating = false;
    return false;
  }

  Serial.println("[OTA] Firmware gravado com sucesso!");
  _isUpdating = false;
  return true;
}

void OtaManager::rebootDevice() {
  Serial.println("[OTA] Reiniciando dispositivo...");
  delay(1000);
  ESP.restart();
}

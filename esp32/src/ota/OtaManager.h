#ifndef OTA_MANAGER_H
#define OTA_MANAGER_H

#include "../config/Config.h"
#include <Arduino.h>
#include <HTTPUpdate.h>
#include <WiFiClientSecure.h>

// Define callback type para progresso
typedef std::function<void(int)> OtaProgressCallback;

class OtaManager {
private:
  bool _isUpdating;
  String _otaError;
  int _progress;
  OtaProgressCallback _progressCallback;

  static OtaManager *_instance;
  static void handleProgress(int cur, int total);

  void setUpdating(bool state) { _isUpdating = state; }

public:
  OtaManager();
  void begin(OtaProgressCallback progressCallback = nullptr);

  bool startOTA(String url, String expectedVersion, String expectedChecksum);

  bool isUpdating() { return _isUpdating; }
  String getLastError() { return _otaError; }
  int getProgress() { return _progress; }

  void rebootDevice();
};

#endif

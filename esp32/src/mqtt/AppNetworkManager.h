#ifndef APP_NETWORK_MANAGER_H
#define APP_NETWORK_MANAGER_H

#include "../config/Config.h"
#include "../network/WifiManager.h"
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <functional>

typedef std::function<void(String, JsonObject)> MqttCallback;

class AppNetworkManager {
private:
  WifiManager wifiManager;
  WiFiClient espClient;
  PubSubClient client;
  unsigned long lastMqttReconnectAttempt;
  bool mqttConnected;
  bool _ntpConfigured;
  String _deviceId;
  String _currentVersion;
  MqttCallback messageHandler;

  static AppNetworkManager *instance;
  static void staticCallback(char *topic, byte *payload, unsigned int length);

  void verifyMqtt();
  void _onWifiConnected();
  void setupTopics();

public:
  AppNetworkManager();
  void begin(MqttCallback handler, String version = "");
  void update();
  void resetWifi();

  void publishStatus(String version, String status = "online");
  void publishLog(String message);
  void publishProgress(int percent);
  void publishOtaSuccess(String version);
  void publishOtaError(String error);
  void publish(const char *topic, String payload, bool retained = false);

  bool isConnected();
  bool isWifiConnected();
  int getRSSI();
  String getCurrentTime();
  String getDeviceId();

  WifiManager &getWifiManager() { return wifiManager; }
};

#endif

#ifndef APP_NETWORK_MANAGER_H
#define APP_NETWORK_MANAGER_H

#include "../config/Config.h"
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <functional>

// Define callback type
typedef std::function<void(String, String)> MqttCallback;

class AppNetworkManager {
private:
  WiFiClient espClient;
  PubSubClient client;
  unsigned long lastMqttReconnectAttempt;
  unsigned long lastWifiReconnectAttempt;
  bool wifiConnected;
  bool _ntpConfigured;
  bool _portalActive;
  MqttCallback messageHandler;

  static AppNetworkManager *instance;
  static void staticCallback(char *topic, byte *payload, unsigned int length);

  void verifyWifi();
  void verifyMqtt();
  void _startConfigPortal();
  void _onWifiConnected();
  String getIdDispositivo();

public:
  AppNetworkManager();
  void begin(MqttCallback handler);
  void update();
  void resetWifi();
  void publish(const char *topic, String payload);
  bool isConnected();
  bool isWifiConnected();
  int getRSSI();
  String getCurrentTime();
};

#endif

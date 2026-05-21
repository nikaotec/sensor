#ifndef MQTT_MANAGER_H
#define MQTT_MANAGER_H

#include "../config/Config.h"
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <functional>

// Define callback type para comandos gerais
typedef std::function<void(String, JsonObject)> CommandCallback;

class MqttManager {
private:
  WiFiClient _espClient;
  PubSubClient _client;
  unsigned long _lastReconnectAttempt;
  CommandCallback _commandHandler;
  String _deviceId;
  String _currentVersion; // Armazena a versão dinâmica atual

  static MqttManager *_instance;
  static void staticCallback(char *topic, byte *payload, unsigned int length);

  void connect(String version = "");
  void setupTopics();

public:
  MqttManager();
  void begin(CommandCallback handler, String version = "");
  void update();

  void publishStatus(String version, String status = "online");
  void publishLog(String message);
  void publishProgress(int percent);
  void publishOtaSuccess(String version);
  void publishOtaError(String error);
  void publish(String topic, String payload, bool retained = false);

  void resetWifi();
  bool isWifiConnected() { return WiFi.status() == WL_CONNECTED; }
  int getRSSI() { return WiFi.RSSI(); }
  bool isConnected() { return _client.connected(); }
  String getCurrentTime();
};

#endif

#ifndef APP_NETWORK_MANAGER_H
#define APP_NETWORK_MANAGER_H

#include "Config.h"
#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <functional>

// Define callback type
typedef std::function<void(String, String)> MqttCallback;

class AppNetworkManager {
private:
  WiFiClient espClient;
  PubSubClient client;
  unsigned long lastMqttReconnectAttempt;
  bool wifiConnected;
  MqttCallback messageHandler;

  static AppNetworkManager *instance;
  static void staticCallback(char *topic, byte *payload, unsigned int length);

  void verifyWifi();
  void verifyMqtt();
  void initOTA();
  String getIdDispositivo();

public:
  AppNetworkManager();
  void begin(MqttCallback handler);
  void update();
  void resetWifi(); // Reseta as configurações do WiFiManager
  /** Publica mensagem com QoS configur�vel (default QoS 1 para EMQX) */
  void publish(const char *topic, String payload, uint8_t qos = 1);
  /** Publica no tópico telemetria/{device_id} com QoS 1 */
  void publishTelemetria(String payload);
  bool isConnected();
  bool isWifiConnected();
  int getRSSI();
  String getCurrentTime();
};

#endif

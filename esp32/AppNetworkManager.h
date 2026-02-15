#ifndef APP_NETWORK_MANAGER_H
#define APP_NETWORK_MANAGER_H

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <functional>
#include "Config.h"

// Define callback type
typedef std::function<void(String, String)> MqttCallback;

class AppNetworkManager {
private:
    WiFiClient espClient;
    PubSubClient client;
    unsigned long lastMqttReconnectAttempt;
    bool wifiConnected;
    MqttCallback messageHandler;

    static AppNetworkManager* instance; 
    static void staticCallback(char* topic, byte* payload, unsigned int length);

    void verifyWifi();
    void verifyMqtt();

public:
    AppNetworkManager();
    void begin(MqttCallback handler);
    void update();
    void publish(const char* topic, String payload);
    bool isConnected();
    bool isWifiConnected();
};

#endif

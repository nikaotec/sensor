#include "AppNetworkManager.h"

AppNetworkManager* AppNetworkManager::instance = nullptr;

AppNetworkManager::AppNetworkManager() : client(espClient) {
    instance = this;
    lastMqttReconnectAttempt = 0;
    wifiConnected = false;
}

void AppNetworkManager::begin(MqttCallback handler) {
    messageHandler = handler;
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    client.setServer(MQTT_SERVER, MQTT_PORT);
    client.setCallback(AppNetworkManager::staticCallback);
    configTime(-3 * 3600, 0, "pool.ntp.org");
}

void AppNetworkManager::staticCallback(char* topic, byte* payload, unsigned int length) {
    if (instance && instance->messageHandler) {
        String msg;
        for (unsigned int i = 0; i < length; i++) {
            msg += (char)payload[i];
        }
        instance->messageHandler(String(topic), msg);
    }
}

void AppNetworkManager::verifyWifi() {
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
    } else {
        wifiConnected = false;
    }
}

void AppNetworkManager::verifyMqtt() {
    if (WiFi.status() == WL_CONNECTED && !client.connected()) {
        if (millis() - lastMqttReconnectAttempt > 15000) {
            lastMqttReconnectAttempt = millis();
            if (client.connect("ESP32_Monitor", MQTT_USER, MQTT_PASS)) {
                client.subscribe(MSG_TOPIC_STATUS); 
            }
        }
    }
}

void AppNetworkManager::update() {
    verifyWifi();
    verifyMqtt();
    client.loop();
}

void AppNetworkManager::publish(const char* topic, String payload) {
    if (client.connected()) {
        client.publish(topic, payload.c_str());
    }
}

bool AppNetworkManager::isConnected() {
    return client.connected();
}

bool AppNetworkManager::isWifiConnected() {
    return wifiConnected;
}

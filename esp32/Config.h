#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ---------- REDE ----------
#define WIFI_SSID "VENANCIO"
#define WIFI_PASS "liza1980"
#define MQTT_SERVER "173.249.10.19"
#define MQTT_PORT 1883
#define MQTT_USER "n8nuser"
#define MQTT_PASS "123456"

// ---------- TÓPICOS MQTT ----------
#define MSG_TOPIC_DATA "esp32c3/data"
#define MSG_TOPIC_STATUS "esp32c3/status/action"

// ---------- PINOS ----------
#define DS18B20_PIN 5
#define RELAY_PIN 32
#define PIN_ZMPT 35
#define PIN_BATTERY 34

#define SDA_PIN 21
#define SCL_PIN 22

// ---------- ENDEREÇOS EEPROM ----------
#define EEPROM_SIZE 32
#define ADDR_MAX_REC 0
#define ADDR_MIN_REC 4
#define ADDR_ALM_MAX 8
#define ADDR_ALM_MIN 12
#define ADDR_VOLT_MAX 16
// #define ADDR_VOLT_MAX 16 // Duplicado no original, removido
#define ADDR_VOLT_MIN 20
#define ADDR_VOLT_CAL 24
#define ADDR_BAT_CAL 28

// ---------- CONSTANTES ----------
#define VOLTAGE_CALIBRATION_DEFAULT 235.0
#define BATTERY_CALIBRATION_DEFAULT 1.0

#define TEMP_LIGA 4.0
#define TEMP_DESLIGA 3.0
#define TEMPO_ALARME_MS (30 * 60 * 1000)

// ---------- ESTRUTURA DE DADOS ----------
struct SystemSettings {
  float tempMaxRec;
  float tempMinRec;
  float alarmMax;
  float alarmMin;
  float voltMax;
  float voltMin;
  float voltCalFactor;
  float batCalFactor;
};

#endif

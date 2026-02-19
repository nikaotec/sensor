
#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ---------- DEVICE ----------
#define DEVICE_NAME "02 CENTRO" // Added Device Name

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
#define PIN_ZMPT 34
#define PIN_BATTERY 35
#define PIN_DOOR 19
#define PIN_DHT11 17

#define SDA_PIN 21
#define SCL_PIN 22

// ---------- ENDEREÇOS EEPROM ----------
#define EEPROM_SIZE 56
#define ADDR_MAX_REC 0
#define ADDR_MIN_REC 4
#define ADDR_ALM_MAX 8
#define ADDR_ALM_MIN 12
#define ADDR_VOLT_MAX 16
#define ADDR_VOLT_MIN 20
#define ADDR_VOLT_CAL 24
#define ADDR_BAT_CAL 28
#define ADDR_BAT_MIN 32
#define ADDR_DOOR_TIME 36
#define ADDR_MON_VOLTAGE 40
#define ADDR_MON_BATTERY 44
#define ADDR_MON_DOOR 48
#define ADDR_MON_AMBIENT 52

// ---------- CONSTANTES ----------
#define VOLTAGE_CALIBRATION_DEFAULT 570.0
#define BATTERY_CALIBRATION_DEFAULT 5.28

#define TEMP_LIGA 4.0
#define TEMP_DESLIGA 3.0
#define TEMPO_ALARME_MS (30 * 60 * 1000)
#define BAT_MIN_DEFAULT 11.5
#define DOOR_TIME_DEFAULT 30
#define VOLT_OUTAGE_THR 20.0
#define ALERT_DEBOUNCE 5000
#define ALERT_REPEAT 600000

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
  float batMinLimit;
  int doorMaxTime;
  // Monitoring toggles (0=OFF, 1=ON)
  int monVoltage;
  int monBattery;
  int monDoor;
  int monAmbient;
};

#endif

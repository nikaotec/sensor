#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <stdbool.h>
#include <stdint.h>

// ---------- DEFAULTS ----------
#define DEFAULT_DEVICE_NAME "ESP32 Sensor"
#define DEFAULT_COMPANY_NAME "Nikaotec"
#define DEFAULT_DEVICE_LOCATION "Nao Definida"

// ---------- REDE ----------
#define WIFI_SSID "VENANCIO"
#define WIFI_PASS "liza1980"
// #define MQTT_SERVER "173.249.10.19"
#define MQTT_SERVER "mqtt.nikaotech.com" //"n8n.nikaotech.com"
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASS ""

// ---------- TÓPICOS MQTT ----------
#define MSG_TOPIC_DATA "esp32c3/data"
#define MSG_TOPIC_STATUS "esp32c3/status/action"
#define MSG_TOPIC_WEB "esp32c3/web/action"
#define MSG_TOPIC_WEB_STATUS "esp32c3/web_status/action"
#define MSG_TOPIC_DASHBOARD "esp32c3/dashboard"

// ---------- PINOS ----------
#define DS18B20_PIN 13 // ou pin 04
#define RELAY_PIN 5
#define PIN_ZMPT 35
#define PIN_BATTERY 34
#define PIN_DOOR 32
#define PIN_DHT11 0
#define PIN_BUZZER 14

#define SDA_PIN 21
#define SCL_PIN 22

// ---------- I2C ADDRESSES ----------
#define PCF8574_ADDR 0x20
#define AHT10_ADDR 0x38

// ---------- BOTÕES PCF8574 ----------
#define BTN_MENU 4
#define BTN_UP 5
#define BTN_DOWN 6
#define BTN_ENTER 7

// ---------- ENDEREÇOS EEPROM ----------
#define EEPROM_SIZE 256
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
#define ADDR_CHK_VOLT 40
#define ADDR_CHK_BAT 41
#define ADDR_CHK_TEMP 42
#define ADDR_CHK_DOOR 43
#define ADDR_TEMP_CAL 44
#define ADDR_DEVICE_NAME 48
#define ADDR_COMPANY_NAME 80
#define ADDR_DEVICE_LOCATION 112

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
#define ALERT_REPEAT 60000 // 1 minuto em milissegundos

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
  float tempCalOffset;
  float batMinLimit;
  int doorMaxTime;
  bool chkVolt;
  bool chkBat;
  bool chkTemp;
  bool chkDoor;
  char deviceName[32];     // Armazenamento fixo para strings na EEPROM
  char companyName[32];    // Armazenamento fixo para strings na EEPROM
  char deviceLocation[32]; // Armazenamento fixo para strings na EEPROM
};

#endif

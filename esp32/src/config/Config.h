#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <stdbool.h>
#include <stdint.h>

// ---------- VERSÃO ----------
#define FIRMWARE_VERSION "1.1.15"

// ---------- DEFAULTS ----------
#define DEFAULT_DEVICE_NAME "ESP32 Sensor"
#define DEFAULT_COMPANY_NAME "Nikaotec"
#define DEFAULT_DEVICE_LOCATION "Nao Definida"

// ---------- REDE (OBSOLETO: Usando WiFiManager) ----------
// As credenciais abaixo são usadas apenas como fallback em caso de falha TOTAL
#define WIFI_SSID "VENANCIO"
#define WIFI_PASS "liza1980"
// #define MQTT_SERVER "173.249.10.19"
#define MQTT_SERVER "109.123.240.215"
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
#define DS18B20_PIN_1 13
#define DS18B20_PIN_2 17
#define DS18B20_PIN DS18B20_PIN_1 // Default para compatibilidade
#define RELAY_PIN_0 23
#define RELAY_PIN_1 19
#define RELAY_PIN_2 18
#define RELAY_PIN_3 5
#define PIN_ZMPT 35
#define PIN_BATTERY 34
#define PIN_DOOR 32
#define PIN_DHT11 0
#define PIN_BUZZER 14
#define PIN_PT100 36
#define LUZ_PIN 2

#define SDA_PIN 21
#define SCL_PIN 22

// ---------- I2C ADDRESSES ----------
#define PCF8574_ADDR 0x20
#define AHT10_ADDR 0x38

// ---------- TIPO SENSOR ----------
enum SensorType { SENSOR_DS18B20 = 0, SENSOR_PT100 = 1 };

// ---------- BOTÕES PCF8574 ----------
#define BTN_ENTER 0
#define BTN_UP 1
#define BTN_DOWN 2
#define BTN_BACK 3
#define BTN_MENU BTN_BACK

// ---------- ENDEREÇOS EEPROM ----------
#define EEPROM_SIZE 320 // Aumentado para acomodar novos campos
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
// Endereços dos relés (cada relé usa 32 bytes: 17 nome + 1 func + 4 tempOn + 4
// tempOff + 1 manualState + 5 padding) IMPORTANTE: Struct RelayConfig tem 27
// bytes, alinhamos para 32 bytes por segurança
#define ADDR_RELAY_0 144
#define ADDR_RELAY_1 176 // 144 + 32 (era 168 - causing overlap!)
#define ADDR_RELAY_2 208 // 176 + 32 (era 192 - causing overlap!)
#define ADDR_RELAY_3 240 // 208 + 32 (era 216 - causing overlap!)
// Novos campos
#define ADDR_PT100_OFFSET 272
#define ADDR_SENSOR_TYPE 276
#define ADDR_LIGHT_ENABLED 280
#define ADDR_SENSOR_PIN_IDX 281
#define ADDR_VERSION 282 // Novo: Campo de versão dinâmica (16 bytes)

// ---------- CONSTANTES ----------
#define VOLTAGE_CALIBRATION_DEFAULT 570.0
#define BATTERY_CALIBRATION_DEFAULT 5.28

#define BAT_MIN_DEFAULT 11.5
#define DOOR_TIME_DEFAULT 30
#define VOLT_OUTAGE_THR 20.0
#define ALERT_DEBOUNCE 5000
#define ALERT_REPEAT                                                           \
  120000 // 2 minutos para repetição contínua via MQTT (WhatsApp)

// ---------- RELÉS ----------
const int RELAY_COUNT = 4;
const int RELAY_PINS[RELAY_COUNT] = {RELAY_PIN_0, RELAY_PIN_1, RELAY_PIN_2,
                                     RELAY_PIN_3};

// Funções do relé
enum RelayFunc {
  RELAY_FUNC_OFF = 0,   // Desativado
  RELAY_FUNC_AUTO = 1,  // Automático (temperatura)
  RELAY_FUNC_MANUAL = 2 // ManualLigado/Desligado
};

// ---------- ESTRUTURA DE DADOS ----------
struct RelayConfig {
  char name[17];    // Nome do relé (16 chars + null)
  uint8_t func;     // Função: OFF, AUTO, MANUAL
  float tempOn;     // Temperatura para ligar (AUTO)
  float tempOff;    // Temperatura para desligar (AUTO)
  bool manualState; // Estado manual (ligado/desligado)
};

struct SystemSettings {
  float tempMaxRec;
  float tempMinRec;
  float alarmMax;
  float alarmMin;
  float voltMax;
  float voltMin;
  float voltCalFactor;
  float batCalFactor;
  float tempCalOffset; // OFFSET DS18B20
  float batMinLimit;
  int doorMaxTime;
  bool chkVolt;
  bool chkBat;
  bool chkTemp;
  bool chkDoor;
  char deviceName[32];     // Armazenamento fixo para strings na EEPROM
  char companyName[32];    // Armazenamento fixo para strings na EEPROM
  char deviceLocation[32]; // Armazenamento fixo para strings na EEPROM
  // Configuração dos 4 relés
  RelayConfig relays[RELAY_COUNT];
  // Novos campos
  float pt100Offset;
  uint8_t sensorType;
  bool lightEnabled;
  uint8_t sensorPinIdx; // 0=IN-1 (13), 1=IN-2 (17)
  char version[16];     // Armazenamento da versão atualizada via OTA
};

#endif

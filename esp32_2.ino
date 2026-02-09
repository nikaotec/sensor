#include <WiFi.h>
#include <time.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <EEPROM.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ---------- CONFIGURAÇÕES ----------
const char* ssid     = "VENANCIO";
const char* password = "liza1980";
const char* mqtt_server = "173.249.10.19";
const int mqtt_port = 1883;
const char* mqtt_user = "n8nuser";
const char* mqtt_password = "123456";

// ---------- PINOS ----------
#define DS18B20_PIN 33
#define RELAY_PIN   2
#define SDA_PIN 4
#define SCL_PIN 16

// ---------- LÓGICA DE TEMPERATURA (CONFORME ÁUDIO) ----------
#define TEMP_LIGA     4.0  // Liga motor em 4.0°C
#define TEMP_DESLIGA  3.0  // Desliga motor em 3.0°C (Histerese de 1 grau)
#define ALARME_MIN    2.5  
#define ALARME_MAX    8.0
#define TEMPO_ALARME_MS (30 * 60 * 1000) // 30 minutos ininterruptos

// ---------- VARIÁVEIS DE ESTADO ----------
float temperaturaAtual = 0.0;
bool releLigado = false;
bool modoManual = false;
unsigned long manualTimeout = 0;

// Variáveis para a lógica de retardo do alarme
unsigned long inicioForaDaFaixa = 0; 
bool alarmeAtivo = false;
bool enviouNotificacaoAlarme = false;
String statusSeguranca = "ESTAVEL";

// Controle de tempo de hardware
unsigned long lastTempCheck = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastMqttReconnectAttempt = 0;
int lastReportDay = -1;
int lastReportHour = -1;

// Objetos
OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);
U8G2_SH1106_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE);
WiFiClient espClient;
PubSubClient client(espClient);

// Tópicos
const char* STATUS_TOPIC = "esp32c3/status/action";
const char* DATA_TOPIC = "esp32c3/data";

// ---------- AUXILIARES ----------

void enviarDadosMqtt(String evento) {
  if (!client.connected()) return;
  StaticJsonDocument<512> doc;
  doc["DISPOSITIVO"] = "esp32c3";
  doc["TIPO"] = evento;
  doc["TEMP"] = temperaturaAtual;
  doc["RELE"] = releLigado ? "LIGADO" : "DESLIGADO";
  doc["ALARME"] = alarmeAtivo ? "ATIVO" : "OFF";
  
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char dataStr[20], horaStr[10];
    strftime(dataStr, sizeof(dataStr), "%d/%m/%Y", &timeinfo);
    strftime(horaStr, sizeof(horaStr), "%H:%M:%S", &timeinfo);
    doc["DATA"] = dataStr;
    doc["HORA"] = horaStr;
  }
  
  String payload;
  serializeJson(doc, payload);
  client.publish(DATA_TOPIC, payload.c_str());
}

void verificarMQTT() {
  if (WiFi.status() == WL_CONNECTED && !client.connected()) {
    unsigned long now = millis();
    if (now - lastMqttReconnectAttempt > 15000) {
      lastMqttReconnectAttempt = now;
      if (client.connect("ESP32_Monitor", mqtt_user, mqtt_password)) {
        client.subscribe(STATUS_TOPIC);
      }
    }
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Lógica de callback simplificada para focar no controle
  StaticJsonDocument<512> doc;
  deserializeJson(doc, payload, length);
  String intencao = doc["intencao"] | "";

  if (intencao == "ligar_rele") { modoManual = true; releLigado = true; manualTimeout = millis(); }
  else if (intencao == "desligar_rele") { modoManual = true; releLigado = false; manualTimeout = millis(); }
  else if (intencao == "ativar_automatico") { modoManual = false; }
  
  digitalWrite(RELAY_PIN, releLigado ? HIGH : LOW);
  enviarDadosMqtt("feedback_comando");
}

// ---------- SETUP ----------

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  
  Wire.begin(SDA_PIN, SCL_PIN);
  display.begin();
  sensors.begin();
  sensors.setWaitForConversion(false);

  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  configTime(-3 * 3600, 0, "pool.ntp.org");
}

// ---------- LOOP PRINCIPAL ----------

void loop() {
  unsigned long now = millis();
  verificarMQTT();
  client.loop();

  // 1. PROCESSAMENTO DE TEMPERATURA E LÓGICA (2s)
  if (now - lastTempCheck > 2000) {
    lastTempCheck = now;
    temperaturaAtual = sensors.getTempCByIndex(0);
    sensors.requestTemperatures();

    if (temperaturaAtual > -50 && temperaturaAtual < 100) {
      
      // --- LÓGICA DO MOTOR (HISTERESE 1°C) ---
      if (!modoManual) {
        if (temperaturaAtual >= TEMP_LIGA && !releLigado) {
          releLigado = true;
          digitalWrite(RELAY_PIN, HIGH);
        } else if (temperaturaAtual <= TEMP_DESLIGA && releLigado) {
          releLigado = false;
          digitalWrite(RELAY_PIN, LOW);
        }
      } else if (now - manualTimeout > 1800000) { // Timeout manual 30min
        modoManual = false;
      }

      // --- LÓGICA DE ALARME COM RETARDO (30 MIN) ---
      if (temperaturaAtual >= ALARME_MAX || temperaturaAtual <= ALARME_MIN) {
        if (inicioForaDaFaixa == 0) inicioForaDaFaixa = now;
        
        statusSeguranca = (temperaturaAtual >= ALARME_MAX) ? "MUITO QUENTE" : "MUITO FRIO";

        if (now - inicioForaDaFaixa >= TEMPO_ALARME_MS) {
          alarmeAtivo = true;
          if (!enviouNotificacaoAlarme) {
            enviarDadosMqtt("ALERTA_CRITICO");
            enviouNotificacaoAlarme = true;
          }
        }
      } else {
        // Reset se voltar para a faixa normal
        inicioForaDaFaixa = 0;
        alarmeAtivo = false;
        enviouNotificacaoAlarme = false;
        statusSeguranca = "ESTAVEL";
      }
    }
  }

  // 2. ENVIO AGENDADO (08h e 16h)
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    if ((timeinfo.tm_hour == 8 || timeinfo.tm_hour == 16) && timeinfo.tm_mday != lastReportDay) {
      lastReportDay = timeinfo.tm_mday;
      enviarDadosMqtt("relatorio_diario");
    }
  }

  // 3. DISPLAY DINÂMICO (200ms)
  if (now - lastDisplayUpdate > 200) {
    lastDisplayUpdate = now;
    display.clearBuffer();

    // Cabeçalho: Hora e Segurança
    display.setFont(u8g2_font_6x12_tf);
    char horaStr[10];
    if (getLocalTime(&timeinfo)) {
      strftime(horaStr, sizeof(horaStr), "%H:%M:%S", &timeinfo);
      display.drawStr(0, 10, horaStr);
    }
    display.drawStr(70, 10, statusSeguranca.c_str());

    // Temperatura Principal
    char buf[10];
    dtostrf(temperaturaAtual, 4, 1, buf);
    display.setFont(u8g2_font_logisoso24_tf);
    display.drawStr(0, 44, buf);
    display.setFont(u8g2_font_6x12_tf);
    display.drawStr(55, 44, "°C");

    // Painel de Configurações (Lógica Fixa no Display)
    display.setFont(u8g2_font_5x8_tf);
    display.drawStr(80, 28, "SET: 3-4C"); // Faixa de operação
    display.drawStr(80, 38, "ALM: 2.5-8"); // Faixa de alarme
    
    // Barra de progresso do alarme (visual se estiver fora da faixa)
    if (inicioForaDaFaixa > 0 && !alarmeAtivo) {
       int progresso = map(now - inicioForaDaFaixa, 0, TEMPO_ALARME_MS, 0, 45);
       display.drawFrame(80, 42, 47, 5);
       display.drawBox(80, 42, progresso, 5);
    }

    display.drawLine(0, 48, 127, 48);

    // Rodapé
    display.setFont(u8g2_font_6x12_tf);
    display.drawStr(0, 62, modoManual ? "MANU:" : "AUTO:");
    display.drawStr(40, 62, releLigado ? "RESFRIANDO" : "MOTOR OFF");
    
    // Ícone de Alarme no Display
    if (alarmeAtivo) {
      display.drawStr(100, 62, "!!!");
    }

    display.sendBuffer();
  }
}
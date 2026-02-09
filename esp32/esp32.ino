#include <WiFi.h>
#include <time.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <EEPROM.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ---------- CONFIGURAÇÕES GERAIS ----------
const char* ssid     = "VENANCIO";
const char* password = "liza1980";
const char* mqtt_server = "173.249.10.19";
const int mqtt_port = 1883;
const char* mqtt_user = "n8nuser";
const char* mqtt_password = "123456";

#define DS18B20_PIN 33
#define RELAY_PIN   2
#define SDA_PIN 4
#define SCL_PIN 16

// ---------- ENDEREÇOS EEPROM ----------
#define EEPROM_SIZE 32
#define ADDR_MAX_REC 0   
#define ADDR_MIN_REC 4   
#define ADDR_ALM_MAX 8   
#define ADDR_ALM_MIN 12  

// ---------- VARIÁVEIS DE CONTROLE ----------
float alarmeMaxConfig;
float alarmeMinConfig;
float temperaturaAtual = 0.0;
float tempMaxRegistrada;
float tempMinRegistrada;

#define TEMP_LIGA     4.0  //
#define TEMP_DESLIGA  3.0  //
#define TEMPO_ALARME_MS (30 * 60 * 1000) //

bool releLigado = false;
bool modoManual = false;
unsigned long manualTimeout = 0;
unsigned long inicioForaDaFaixa = 0; 
unsigned long lastMqttAlert = 0; 
bool alarmeAtivo = false;
String statusSeguranca = "OK";

unsigned long lastTempCheck = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastMqttReconnectAttempt = 0;
int lastReportDay = -1;

OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);
U8G2_SH1106_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE);
WiFiClient espClient;
PubSubClient client(espClient);

const char* DATA_TOPIC = "esp32c3/data";
const char* STATUS_TOPIC = "esp32c3/status/action";

// ---------- FUNÇÕES AUXILIARES ----------

void salvarConfiguracoesAlarme() {
  EEPROM.put(ADDR_ALM_MAX, alarmeMaxConfig);
  EEPROM.put(ADDR_ALM_MIN, alarmeMinConfig);
  EEPROM.commit();
}

void carregarTudo() {
  EEPROM.get(ADDR_MAX_REC, tempMaxRegistrada);
  EEPROM.get(ADDR_MIN_REC, tempMinRegistrada);
  EEPROM.get(ADDR_ALM_MAX, alarmeMaxConfig);
  EEPROM.get(ADDR_ALM_MIN, alarmeMinConfig);

  if (isnan(alarmeMaxConfig)) alarmeMaxConfig = 8.0;
  if (isnan(alarmeMinConfig)) alarmeMinConfig = 2.5;
  if (isnan(tempMaxRegistrada) || tempMaxRegistrada > 80.0) tempMaxRegistrada = -50.0;
  if (isnan(tempMinRegistrada) || tempMinRegistrada < -40.0) tempMinRegistrada = 100.0;
}

void resetarMaxMin() {
  sensors.requestTemperatures();
  float t = sensors.getTempCByIndex(0);
  if (t > -50 && t < 80) { tempMaxRegistrada = t; tempMinRegistrada = t; }
  EEPROM.put(ADDR_MAX_REC, tempMaxRegistrada);
  EEPROM.put(ADDR_MIN_REC, tempMinRegistrada);
  EEPROM.commit();
}

// FORMATO JSON SOLICITADO PARA O N8N
void enviarDadosMqtt(String evento) {
  if (!client.connected()) return;
  
  StaticJsonDocument<512> doc;
  doc["DISPOSITIVO"] = "esp32c3";
  doc["TIPO"] = evento;
  doc["TEMP_ATUAL"] = temperaturaAtual;
  doc["MAX"] = tempMaxRegistrada;
  doc["MIN"] = tempMinRegistrada;
  doc["RELE"] = releLigado ? "LIGADO" : "DESLIGADO";
  
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char dStr[20], hStr[10];
    strftime(dStr, sizeof(dStr), "%d/%m/%Y", &timeinfo);
    strftime(hStr, sizeof(hStr), "%H:%M:%S", &timeinfo);
    doc["DATA"] = dStr;
    doc["HORA"] = hStr;
  }
  
  String payload;
  serializeJson(doc, payload);
  client.publish(DATA_TOPIC, payload.c_str());
  lastMqttAlert = millis();
}

void callback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.print("Erro no JSON: ");
    Serial.println(error.c_str());
    return;
  }
  
  String intencao = doc["intencao"] | "";

  if (intencao == "configurar_limites") {
    // Verifica se os campos existem no JSON e atualiza
    if (!doc["valor_max"].isNull()) {
      alarmeMaxConfig = doc["valor_max"];
    }
    if (!doc["valor_min"].isNull()) {
      alarmeMinConfig = doc["valor_min"];
    }
    
    salvarConfiguracoesAlarme();
    enviarDadosMqtt("feedback_limites_atualizados");
  } 
  else if (intencao  == "obter_status_atual") {
    enviarDadosMqtt("obter_status_atual");	
  }
  else if (intencao == "ligar_rele") { 
    modoManual = true; releLigado = true; manualTimeout = millis(); 
    digitalWrite(RELAY_PIN, HIGH);
  }
  else if (intencao == "desligar_rele") { 
    modoManual = true; releLigado = false; manualTimeout = millis(); 
    digitalWrite(RELAY_PIN, LOW);
  }
  else if (intencao == "ativar_automatico") { 
    modoManual = false; 
  }
  else if (intencao == "reset_manual") { 
    resetarMaxMin(); 
  }

  enviarDadosMqtt("feedback_comando");
}

void verificarMQTT() {
  if (WiFi.status() == WL_CONNECTED && !client.connected()) {
    if (millis() - lastMqttReconnectAttempt > 15000) {
      lastMqttReconnectAttempt = millis();
      if (client.connect("ESP32_Monitor", mqtt_user, mqtt_password)) {
        client.subscribe(STATUS_TOPIC);
      }
    }
  }
}

// ---------- SETUP ----------

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  Wire.begin(SDA_PIN, SCL_PIN);
  display.begin();
  sensors.begin();
  sensors.setWaitForConversion(false);
  EEPROM.begin(EEPROM_SIZE);
  carregarTudo();
  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  configTime(-3 * 3600, 0, "pool.ntp.org");
}

// ---------- LOOP ----------

void loop() {
  unsigned long now = millis();
  verificarMQTT();
  client.loop();

  if (now - lastTempCheck > 2000) {
    lastTempCheck = now;
    sensors.requestTemperatures();
    temperaturaAtual = sensors.getTempCByIndex(0);

    if (temperaturaAtual > -50 && temperaturaAtual < 80) {
      // Recordes Diários
      if (temperaturaAtual > tempMaxRegistrada) { tempMaxRegistrada = temperaturaAtual; EEPROM.put(ADDR_MAX_REC, tempMaxRegistrada); EEPROM.commit(); }
      if (temperaturaAtual < tempMinRegistrada) { tempMinRegistrada = temperaturaAtual; EEPROM.put(ADDR_MIN_REC, tempMinRegistrada); EEPROM.commit(); }

      // Histerese
      if (!modoManual) {
        if (temperaturaAtual >= TEMP_LIGA && !releLigado) { releLigado = true; digitalWrite(RELAY_PIN, HIGH); }
        else if (temperaturaAtual <= TEMP_DESLIGA && releLigado) { releLigado = false; digitalWrite(RELAY_PIN, LOW); }
      }

      // Alertas Escalonados
      if (temperaturaAtual >= alarmeMaxConfig || temperaturaAtual <= alarmeMinConfig) {
        if (inicioForaDaFaixa == 0) { inicioForaDaFaixa = now; enviarDadosMqtt("SAIU_DA_FAIXA"); }
        statusSeguranca = (temperaturaAtual >= alarmeMaxConfig) ? "QUENTE!" : "FRIO!";
        
        unsigned long intervalo = (temperaturaAtual > alarmeMaxConfig && (now - inicioForaDaFaixa <= TEMPO_ALARME_MS)) ? 120000 : 600000;
        if (now - lastMqttAlert >= intervalo) enviarDadosMqtt("ALERTA_REPETITIVO");
        if (now - inicioForaDaFaixa >= TEMPO_ALARME_MS) alarmeAtivo = true;
      } else {
        if (inicioForaDaFaixa != 0) enviarDadosMqtt("VOLTOU_PARA_FAIXA");
        inicioForaDaFaixa = 0; alarmeAtivo = false; statusSeguranca = "OK";
      }
    }
  }

  // Reset Diário 08:00
  struct tm t;
  if (getLocalTime(&t)) {
    if (t.tm_hour == 8 && t.tm_mday != lastReportDay) {
      lastReportDay = t.tm_mday;
      enviarDadosMqtt("relatorio_diario_reset");
      resetarMaxMin();
    }
  }

  // Display
  if (now - lastDisplayUpdate > 250) {
    lastDisplayUpdate = now;
    display.clearBuffer();
    display.setFont(u8g2_font_6x12_tf);
    if (getLocalTime(&t)) {
      char hS[10]; strftime(hS, sizeof(hS), "%H:%M:%S", &t);
      display.drawStr(0, 10, hS);
    }
    display.drawStr(70, 10, statusSeguranca.c_str());

    char tB[10]; dtostrf(temperaturaAtual, 4, 1, tB);
    display.setFont(u8g2_font_logisoso24_tf);
    display.drawStr(0, 44, tB);
    display.setFont(u8g2_font_6x12_tf);
    display.drawStr(55, 44, "C");

    char mB[10];
    dtostrf(tempMaxRegistrada, 4, 1, mB);
    display.drawStr(80, 30, "Max"); display.drawStr(105, 30, mB);
    dtostrf(tempMinRegistrada, 4, 1, mB);
    display.drawStr(80, 42, "Min"); display.drawStr(105, 42, mB);

    display.drawLine(0, 48, 127, 48);
    display.drawStr(0, 62, modoManual ? "MANU" : "AUTO");
    display.drawStr(40, 62, releLigado ? "GELANDO" : "MOTOR OFF");
    if (alarmeAtivo) display.drawStr(105, 62, "!!!");
    display.sendBuffer();
  }
}

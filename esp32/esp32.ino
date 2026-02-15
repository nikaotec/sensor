#include <WiFi.h>
#include <time.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <EEPROM.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include "VoltageSensor.h" // Inclui biblioteca de tensão não-bloqueante

// ---------- CONFIGURAÇÕES GERAIS ----------
const char* ssid     = "VENANCIO";
const char* password = "liza1980";
const char* mqtt_server = "173.249.10.19";
const int mqtt_port = 1883;
const char* mqtt_user = "n8nuser";
const char* mqtt_password = "123456";

#define DS18B20_PIN 5
#define RELAY_PIN   32
#define PIN_ZMPT    35 // Pino do sensor de tensão
#define SDA_PIN 21
#define SCL_PIN 22

// ---------- ENDEREÇOS EEPROM ----------
#define EEPROM_SIZE 32
#define ADDR_MAX_REC 0   
#define ADDR_MIN_REC 4   
#define ADDR_ALM_MAX 8   
#define ADDR_ALM_MIN 12
#define ADDR_VOLT_MAX 16
#define ADDR_VOLT_MAX 16
#define ADDR_VOLT_MIN 20
#define ADDR_VOLT_CAL 24 // Novo endereço para fator de calibração

// ---------- VARIÁVEIS DE CONTROLE ----------
float alarmeMaxConfig;
float alarmeMinConfig;
float voltageMaxConfig;
float voltageMinConfig;
float voltageCalibrationFactor; // Fator Dinâmico
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
unsigned long inicioAlarmeTensao = 0; // Controle alarmes tensão
unsigned long lastMqttAlert = 0; 
bool alarmeAtivo = false;
bool alarmeTensaoAtivo = false;
bool WIFIconectado = false;
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
VoltageSensor voltSensor(PIN_ZMPT, 235.0); // Valor Inicial Ajustado (Fator 235.0)

const char* DATA_TOPIC = "esp32c3/data";
const char* STATUS_TOPIC = "esp32c3/status/action";

// ---------- FUNÇÕES AUXILIARES ----------

void salvarConfiguracoesAlarme() {
  EEPROM.put(ADDR_ALM_MAX, alarmeMaxConfig);
  EEPROM.put(ADDR_ALM_MIN, alarmeMinConfig);
  EEPROM.put(ADDR_VOLT_MAX, voltageMaxConfig);
  EEPROM.put(ADDR_VOLT_MAX, voltageMaxConfig);
  EEPROM.put(ADDR_VOLT_MIN, voltageMinConfig);
  EEPROM.put(ADDR_VOLT_CAL, voltageCalibrationFactor);
  EEPROM.commit();
}

void carregarTudo() {
  EEPROM.get(ADDR_MAX_REC, tempMaxRegistrada);
  EEPROM.get(ADDR_MIN_REC, tempMinRegistrada);
  EEPROM.get(ADDR_ALM_MAX, alarmeMaxConfig);
  EEPROM.get(ADDR_ALM_MIN, alarmeMinConfig);
  EEPROM.get(ADDR_VOLT_MAX, voltageMaxConfig);
  EEPROM.get(ADDR_VOLT_MAX, voltageMaxConfig);
  EEPROM.get(ADDR_VOLT_MIN, voltageMinConfig);
  EEPROM.get(ADDR_VOLT_CAL, voltageCalibrationFactor);

  // Inicializa com valores seguros se EEPROM estiver vazia/nan
  if (isnan(voltageCalibrationFactor) || voltageCalibrationFactor < 10.0 || voltageCalibrationFactor > 1000.0) {
      voltageCalibrationFactor = 235.0; // Valor Corrigido Padrão
  }
  voltSensor.setCalibration(voltageCalibrationFactor); // Aplica ao sensor

  if (isnan(alarmeMaxConfig)) alarmeMaxConfig = 8.0;
  if (isnan(alarmeMinConfig)) alarmeMinConfig = 2.5;
  if (isnan(voltageMaxConfig)) voltageMaxConfig = 245.0; // Padrão 220V + margem
  if (isnan(voltageMinConfig)) voltageMinConfig = 190.0; // Padrão 220V - margem
  
  if (isnan(tempMaxRegistrada) || tempMaxRegistrada > 80.0) tempMaxRegistrada = -50.0;
  if (isnan(tempMinRegistrada) || tempMinRegistrada < -40.0) tempMinRegistrada = 100.0;
}

// Ícones WiFi (Barras)
// Bitmap padrão XBM ou desenhar linhas manuais no U8g2
void drawWifiSignal() {
  int rssi = WiFi.RSSI();
  // Converte RSSI para 0-4 barras
  int bars = 0;
  if (rssi > -55) bars = 4;
  else if (rssi > -65) bars = 3;
  else if (rssi > -75) bars = 2;
  else if (rssi > -85) bars = 1;
  else bars = 0;

  // Desenha as barras
  for (int i=0; i < 4; i++) {
    if (i < bars) {
       display.drawBox(112 + (i*4), 10 - (i*2), 3, (i*2)+2);
    } else {
       display.drawFrame(112 + (i*4), 10 - (i*2), 3, (i*2)+2);
    }
  }
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
  doc["DISPOSITIVO"] = "02 CENTRO";
  doc["TIPO"] = evento;
  doc["TEMP_ATUAL"] = serialized(String(temperaturaAtual, 1));
  doc["MAX"] = serialized(String(tempMaxRegistrada, 1));
  doc["MIN"] = serialized(String(tempMinRegistrada, 1));
  doc["VOLTAGEM"] = serialized(String(voltSensor.getVoltage(), 1)); // Adiciona tensão ao JSON
  //doc["RELE"] = releLigado ? "LIGADO" : "DESLIGADO";
  
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
    if (!doc["volt_max"].isNull()) {
        voltageMaxConfig = doc["volt_max"];
    }
    if (!doc["volt_min"].isNull()) {
        voltageMinConfig = doc["volt_min"];
    }
    
    salvarConfiguracoesAlarme();
    enviarDadosMqtt("feedback_limites_atualizados");
  } 

  else if (intencao == "calibrar_tensao") {
    if (!doc["novo_fator"].isNull()) {
      float novoFator = doc["novo_fator"];
      if (novoFator > 10 && novoFator < 1000) {
        voltageCalibrationFactor = novoFator;
        voltSensor.setCalibration(voltageCalibrationFactor);
        salvarConfiguracoesAlarme();
        enviarDadosMqtt("feedback_calibracao_sucesso");
      }
    }
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



// ---------- SETUP ----------

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  Wire.begin(SDA_PIN, SCL_PIN);
  display.begin();
  sensors.begin();
  voltSensor.begin(); // Inicializa sensor de tensão (Task em background)
  display.clearBuffer();
  sensors.setWaitForConversion(false);
  EEPROM.begin(EEPROM_SIZE);
  carregarTudo();
  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  configTime(-3 * 3600, 0, "pool.ntp.org");
  WIFIconectado = false;
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

void verificarWIFI(){
 if (WiFi.status() == WL_CONNECTED){
   WIFIconectado =  true;
 }else{WIFIconectado = false;}
}

// ---------- LOOP ----------

void loop() {
  unsigned long now = millis();
  verificarMQTT();
  client.loop();
  verificarWIFI();

  if (now - lastTempCheck > 2000) {
    lastTempCheck = now;
    sensors.requestTemperatures();
    temperaturaAtual = sensors.getTempCByIndex(0);

    // --- Lógica de Tensão ---
    float tVoltagem = voltSensor.getVoltage();
    
    // SÓ ENVIA ALERTA SE O SISTEMA ESTIVER ESTABILIZADO (> 2 MINUTOS)
    if (millis() > 120000) {
        if (tVoltagem > 50.0) { // Só monitora se houver tensão mínima (evitar falsos alarmes desligado)
            if (tVoltagem >= voltageMaxConfig || tVoltagem <= voltageMinConfig) {
                if (inicioAlarmeTensao == 0) { 
                    inicioAlarmeTensao = now; 
                    // NÃO ENVIA NADA AQUI (OPÇÃO C - SILÊNCIO DURANTE FALHA)
                    // enviarDadosMqtt("TENSAO_FORA_DA_FAIXA"); 
                }
                alarmeTensaoAtivo = true;
                
                // NÃO ENVIA ALERTA REPETITIVO (OPÇÃO C - SILÊNCIO DURANTE FALHA)
            } else {
                if (inicioAlarmeTensao != 0) {
                    // SÓ AVISA QUANDO VOLTAR AO NORMAL
                    enviarDadosMqtt("TENSAO_NORMALIZADA");
                }
                inicioAlarmeTensao = 0;
                alarmeTensaoAtivo = false;
            }
        } else {
            // Tensão < 50V (provavelmente sem energia ou desligado), reseta status
            inicioAlarmeTensao = 0;
            alarmeTensaoAtivo = false;
        }
    }

    if (temperaturaAtual > -50 && temperaturaAtual < 80) {
      // Recordes Diários
      if (temperaturaAtual > tempMaxRegistrada) { tempMaxRegistrada = temperaturaAtual; EEPROM.put(ADDR_MAX_REC, tempMaxRegistrada); EEPROM.commit(); }
      if (temperaturaAtual < tempMinRegistrada) { tempMinRegistrada = temperaturaAtual; EEPROM.put(ADDR_MIN_REC, tempMinRegistrada); EEPROM.commit(); }

      // Histerese
      if (!modoManual) {
        if (temperaturaAtual >= TEMP_LIGA && !releLigado) { releLigado = true; digitalWrite(RELAY_PIN, HIGH); }
        else if (temperaturaAtual <= TEMP_DESLIGA && releLigado) { releLigado = false; digitalWrite(RELAY_PIN, LOW); }
      }

      // Alertas Escalonados Temperatura
      // SÓ ENVIA ALERTA SE O SISTEMA ESTIVER ESTABILIZADO (> 2 MINUTOS)
      if (millis() > 120000) {
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
    if (getLocalTime(&t)) {
    if (t.tm_hour == 16 && t.tm_mday != lastReportDay) {
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
    
    // TENSÃO NO DISPLAY (Entre Hora e WiFi, próximo ao WiFi)
    char vStr[10];
    float vDisp = voltSensor.getVoltage();
    sprintf(vStr, "%.0fV", vDisp); 
    display.drawStr(82, 10, vStr);

    // SINAL WIFI + ÍCONE (Canto Direito)
    if(WIFIconectado == false){
      display.drawStr(90, 10, "OFF");
    } else {
      drawWifiSignal();
    }

    char tB[10]; dtostrf(temperaturaAtual, 4, 1, tB);
    display.setFont(u8g2_font_logisoso24_tf);
    display.drawStr(0, 44, tB);
    display.setFont(u8g2_font_8x13_tf);
    display.drawStr(55, 44, "C");

    char mB[10];
    display.setFont(u8g2_font_6x12_tf);
    dtostrf(tempMaxRegistrada, 4, 1, mB);
    display.drawStr(80, 26, "Max"); display.drawStr(105, 26, mB);
    dtostrf(tempMinRegistrada, 4, 1, mB);
    display.drawStr(80, 42, "Min"); display.drawStr(105, 42, mB);

    display.drawLine(0, 50, 127, 50);
    display.drawStr(0, 62, modoManual ? "MANU" : "AUTO");
    display.drawStr(40, 62, releLigado ? "GELANDO" : "MOTOR OFF");
    if (alarmeAtivo) display.drawStr(105, 62, "!!!");
    display.sendBuffer();
  }
}

#include <WiFi.h>
#include <time.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <EEPROM.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ---------- WIFI ----------
const char* ssid     = "VENANCIO";
const char* password = "liza1980";

// -------- mqtt  ------------
const char* mqtt_server = "173.249.10.19";
const int mqtt_port = 1883;
const char* mqtt_user = "n8nuser";
const char* mqtt_password = "123456";

// ---------- NTP ----------
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = -3 * 3600;  // Brasil
const int   daylightOffset_sec = 0;

// ---------- PINOS ----------
#define DS18B20_PIN 33
#define RELAY_PIN   2
#define SDA_PIN 4
#define SCL_PIN 16

// ---------- EEPROM ----------
#define EEPROM_SIZE 64
#define ADDR_TEMP_MAX 0
#define ADDR_TEMP_MIN 4

// ---------- TEMPERATURAS ----------
#define TEMP_LIGA     32.0
#define TEMP_DESLIGA  30.0

// ---------- DS18B20 ----------
OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);

// ---------- OLED ----------
U8G2_SH1106_128X64_NONAME_F_HW_I2C display(
  U8G2_R0, U8X8_PIN_NONE
);

// Buffer para o Log (5 linhas de texto)
String logBuffer[5] = {"", "", "", "", ""};

//-------mott config --------
WiFiClient espClient;
PubSubClient client(espClient);

bool releLigado = false;
float tempMax, tempMin;
float temperaturaAtual = 0.0;

unsigned long lastToggleTime = 0;
bool showRelayStatus = true;
unsigned long lastMqttCheck = 0;
unsigned long lastTempCheck = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastWifiCheck = 0;
unsigned long lastMqttSend = 0; // Controle de tempo para envio ao n8n
unsigned long lastMqttReconnectAttempt = 0; // NOVO: Controle de reconexão MQTT

int currentWifiBars = 0;

// Tópicos MQTT
const char* STATUS_TOPIC = "esp32c3/status/action";
const char* DATA_TOPIC = "esp32c3/data"; // Tópico para o n8n

// Intervalo de envio de mensagens para o  mqtt;
const unsigned long INTERVALO_ENVIO =   2 * 60 * 60 * 1000; 
const unsigned long INTERVALO_VERIFICACAO_MQTT = 15000; // NOVO: Verifica MQTT a cada 15 segundos

String mensagemOLED = "";          // Armazena o texto da notificação
unsigned long oledMsgTimeout = 0;  // Controla quanto tempo a mensagem fica na tela
bool exibindoNotificacao = false;  // Flag para o estado do display

bool modoManual = false; // Define se o MQTT assumiu o controle
unsigned long manualTimeout = 0; // Para evitar que o sistema fique travado no manual para sempre

// ---------- EEPROM ----------
void salvarEEPROM() {
  EEPROM.put(ADDR_TEMP_MAX, tempMax);
  EEPROM.put(ADDR_TEMP_MIN, tempMin);
  EEPROM.commit();
}

// ---------- LOG DISPLAY ----------
void logDisplay(String msg) {
  Serial.println(msg); 
  for (int i = 0; i < 4; i++) {
    logBuffer[i] = logBuffer[i + 1];
  }
  logBuffer[4] = msg;

  display.clearBuffer();
  display.setFont(u8g2_font_6x10_tf); 
  for (int i = 0; i < 5; i++) {
    display.drawStr(0, (i + 1) * 12, logBuffer[i].c_str());
  }
  display.sendBuffer();
}

// ---------- WIFI ----------
void conectarWiFi() {
  int retry = 0;
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    retry++;
    logDisplay("WiFi Tentativa: " + String(retry));
  }

  if (WiFi.status() == WL_CONNECTED) {
    logDisplay("WiFi: OK");
    delay(1000);
    logDisplay("IP: " + WiFi.localIP().toString());
    delay(1000);
  } else {
    logDisplay("WiFi: FALHA!");
    delay(2000); 
    ESP.restart();
  }
}

// ---------- MQTT ----------
void conectarMQTT() {
  int retry = 0;
  while (!client.connected() && retry < 5) {
    logDisplay("MQTT Tentativa: " + String(retry + 1));
    if (client.connect("ESP32_Monitor", mqtt_user, mqtt_password)) {
      logDisplay("MQTT: OK");
      // Removido o publish de ONLINE
      client.subscribe(STATUS_TOPIC);
      delay(1000);
    } else {
      logDisplay("Erro MQTT: " + String(client.state()));
      retry++;
      delay(2000);
    }
  }
  
  if (!client.connected()) {
    logDisplay("MQTT: FALHA!");
    delay(2000);
  }
}

// ========================================================================
// NOVA FUNÇÃO: VERIFICAÇÃO E RECONEXÃO AUTOMÁTICA DO MQTT
// ========================================================================
void verificarMQTT() {
  // Só tenta reconectar se o WiFi estiver conectado
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  // Se já está conectado, não faz nada
  if (client.connected()) {
    return;
  }

  // Verifica se já passou o intervalo desde a última tentativa
  unsigned long now = millis();
  if (now - lastMqttReconnectAttempt < INTERVALO_VERIFICACAO_MQTT) {
    return;
  }

  // Atualiza o tempo da última tentativa
  lastMqttReconnectAttempt = now;

  Serial.println("MQTT desconectado. Tentando reconectar...");
  
  // Tenta reconectar
  if (client.connect("ESP32_Monitor", mqtt_user, mqtt_password)) {
    Serial.println("MQTT reconectado com sucesso!");
    logDisplay("MQTT: RECONECTADO");
    
    // Re-inscreve nos tópicos após reconexão
    client.subscribe(STATUS_TOPIC);
    delay(100);
  } else {
    Serial.print("Falha na reconexão MQTT. Código de erro: ");
    Serial.println(client.state());
  }
}

// --- FUNÇÃO DE ENVIO DE DADOS AO MQTT ---
void enviarDadosMqtt(String evento = "periodico") {
  if (!client.connected()) return;

  StaticJsonDocument<512> doc; 
  doc["device"] = "esp32c3";
  doc["evento"] = evento; // Identifica se foi uma leitura rotineira ou resposta a um comando
  doc["temperatura"] = temperaturaAtual;
  doc["tempMax"] = tempMax;
  doc["tempMin"] = tempMin;
  doc["rele"] = releLigado ? "LIGADO" : "DESLIGADO";
  doc["modo"] = modoManual ? "manual" : "automatico";
  doc["wifi_bars"] = currentWifiBars;

  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char dataStr[20]; char horaStr[10];
    strftime(dataStr, sizeof(dataStr), "%d/%m/%Y", &timeinfo);
    strftime(horaStr, sizeof(horaStr), "%H:%M:%S", &timeinfo);
    doc["hora"] = horaStr;
    doc["data"] = dataStr;
  }

  String payload;
  serializeJson(doc, payload);
  client.publish(DATA_TOPIC, payload.c_str());
  Serial.println("✅ Resposta enviada ao n8n: " + evento);
}

void configurarLimitesTemperatura(float novoMax, float novoMin) {
  // Validação de segurança: evita inversão de valores
  if (novoMax > novoMin) {
    tempMax = novoMax;
    tempMin = novoMin;
    
    // Grava na EEPROM usando as posições que você já definiu (ADDR_TEMP_MAX e ADDR_TEMP_MIN)
    EEPROM.put(ADDR_TEMP_MAX, tempMax);
    EEPROM.put(ADDR_TEMP_MIN, tempMin);
    EEPROM.commit();
    
    Serial.println("✅ Novos limites salvos na EEPROM!");
    Serial.print("Max: "); Serial.println(tempMax);
    Serial.print("Min: "); Serial.println(tempMin);
  } else {
    Serial.println("❌ Erro: Temp Máxima deve ser maior que a Mínima!");
  }
}

// =================================================================
// FUNÇÃO DE CALLBACK MQTT - VERSÃO OTIMIZADA E ROBUSTA
// =================================================================
void callback(char* topic, byte* payload, unsigned int length) {
  String mensagem;
  for (unsigned int i = 0; i < length; i++) mensagem += (char)payload[i];
  
  StaticJsonDocument<1024> doc; 
  if (deserializeJson(doc, mensagem)) return;

  if (doc.containsKey("output")) {
    JsonObject output = doc["output"];
    if (output.containsKey("comandos") && output["comandos"].is<JsonArray>()) {
      JsonArray comandos = output["comandos"];
      if (comandos.size() > 0) {
        String intencao = comandos[0]["intencao"];
        String statusEvento = "";

        if (intencao == "ligar_rele") {
          modoManual = true; releLigado = true;
          digitalWrite(RELAY_PIN, HIGH);
          manualTimeout = millis();
          mensagemOLED = "RELE: LIGADO";
          statusEvento = "comando_ligar_sucesso";
        } 
        else if (intencao == "desligar_rele") {
          modoManual = true; releLigado = false;
          digitalWrite(RELAY_PIN, LOW);
          manualTimeout = millis();
          mensagemOLED = "RELE: DESLIGADO";
          statusEvento = "comando_desligar_sucesso";
        }
        else if (intencao == "configurar_limites") {
          bool alt = false;
          if (comandos[0].containsKey("valor_max")) { tempMax = comandos[0]["valor_max"]; alt = true; }
          if (comandos[0].containsKey("valor_min")) { tempMin = comandos[0]["valor_min"]; alt = true; }
          if (alt) {
            salvarEEPROM();
            mensagemOLED = "LIMITES SALVOS";
            statusEvento = "limites_alterados";
          }
        }
        else if (intencao == "ativar_automatico") {
          modoManual = false;
          mensagemOLED = "MODO AUTO";
          statusEvento = "modo_auto_ativado";
        }

        if (statusEvento != "") {
          exibindoNotificacao = true;
          oledMsgTimeout = millis();
          // ENVIO IMEDIATO DO FEEDBACK
          enviarDadosMqtt(statusEvento); 
        }
      }
    }
  }
}

// --- ATUALIZAÇÃO NÃO BLOQUEANTE DA INTENSIDADE DO WIFI ---
void updateWifiIntensity() {
  if (WiFi.status() != WL_CONNECTED) {
    currentWifiBars = 0;
    return;
  }

  long rssi = WiFi.RSSI();
  if (rssi >= -50) currentWifiBars = 4;
  else if (rssi >= -60) currentWifiBars = 3;
  else if (rssi >= -70) currentWifiBars = 2;
  else if (rssi >= -80) currentWifiBars = 1;
  else currentWifiBars = 0;
}

void drawWiFiIconBars(int x, int y) {
  int w = 3; 
  int spacing = 2; 
  for (int i = 0; i < currentWifiBars; i++) {
    int barHeight = (i + 1) * 3;
    display.drawBox(x + (i * (w + spacing)), y - barHeight, w, barHeight);
  }
}

// Função para controlar o Relé via comando
void setLed(bool estado) {
  releLigado = estado;
  digitalWrite(RELAY_PIN, releLigado ? HIGH : LOW);
  Serial.println(releLigado ? "Relé LIGADO via MQTT" : "Relé DESLIGADO via MQTT");
}

// Função para reportar status de volta (opcional, usada pelo seu callback)
void publishActionStatus(const char* action, const char* status, const char* msg) {
  StaticJsonDocument<200> doc;
  doc["action"] = action;
  doc["status"] = status;
  doc["message"] = msg;
  String out;
  serializeJson(doc, out);
  client.publish("esp32c3/status/result", out.c_str());
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  sensors.begin();
  sensors.setWaitForConversion(false); 

  Wire.begin(SDA_PIN, SCL_PIN);
  display.begin();
  
  logDisplay("Sistema Iniciando...");

  EEPROM.begin(EEPROM_SIZE);
  EEPROM.get(ADDR_TEMP_MAX, tempMax);
  EEPROM.get(ADDR_TEMP_MIN, tempMin);
  
  if (isnan(tempMax) || tempMax < -50 || tempMax > 150) tempMax = -100;
  if (isnan(tempMin) || tempMin < -50 || tempMin > 150) tempMin = 100;

  logDisplay("Conectando WiFi...");
  conectarWiFi();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  logDisplay("Conectando MQTT...");
  conectarMQTT();

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tf);
  display.drawStr(20, 30, "Sistema Ativo");
  display.sendBuffer();
  delay(1000);
  
  lastMqttSend = millis(); 
}

void loop() {
  unsigned long now = millis();

  // NOVA LINHA: Verifica e reconecta MQTT automaticamente
  verificarMQTT();

  client.loop();

  // 2. TEMPERATURA (A cada 2 segundos)
  if (now - lastTempCheck > 2000) {
    lastTempCheck = now;
    temperaturaAtual = sensors.getTempCByIndex(0);
    sensors.requestTemperatures(); 

    // SEGURANÇA: Se estiver no manual por mais de 30 minutos, volta pro automático
    if (modoManual && (now - manualTimeout > 30 * 60 * 1000)) {
       modoManual = false;
       Serial.println("Timeout Manual: Retornando ao Automático");
    }

    // Só executa a lógica de ligar/desligar se NÃO estiver no modo manual
    if (!modoManual && temperaturaAtual > -55 && temperaturaAtual < 125) {
      bool salvar = false;
      if (temperaturaAtual > tempMax) { tempMax = temperaturaAtual; salvar = true; }
      if (temperaturaAtual < tempMin) { tempMin = temperaturaAtual; salvar = true; }
      if (salvar) salvarEEPROM();

      if (temperaturaAtual >= TEMP_LIGA && !releLigado) {
        releLigado = true;
        digitalWrite(RELAY_PIN, HIGH);
      }
      if (temperaturaAtual <= TEMP_DESLIGA && releLigado) {
        releLigado = false;
        digitalWrite(RELAY_PIN, LOW);
      }
    }
  }

  // 3. ENVIO PERIÓDICO (A CADA 2 HORAS)
  if (now - lastMqttSend >= INTERVALO_ENVIO) {
    lastMqttSend = now;
    enviarDadosMqtt("periodico"); // Adicione o parâmetro aqui
  }

  // 4. WIFI RSSI (A cada 5 segundos)
  if (now - lastWifiCheck > 5000) {
    lastWifiCheck = now;
    updateWifiIntensity();
  }

  // 5. LÓGICA DE ALTERNÂNCIA DO RODAPÉ
  if (!client.connected()) {
    if (now - lastToggleTime > 2000) {
      showRelayStatus = !showRelayStatus;
      lastToggleTime = now;
    }
  } else {
    showRelayStatus = true;
  }

  // 6. ATUALIZAÇÃO DO DISPLAY (A cada 200ms)
  // 6. ATUALIZAÇÃO DO DISPLAY (A cada 200ms)
  if (now - lastDisplayUpdate > 200) {
    lastDisplayUpdate = now;
    display.clearBuffer();

    // Verifica se deve exibir notificação (por 3 segundos)
    if (exibindoNotificacao) {
      if (now - oledMsgTimeout < 3000) {
        display.setFont(u8g2_font_6x12_tf);
        display.drawStr(15, 15, "COMANDO RECEBIDO:");
        
        display.setFont(u8g2_font_9x15_tf);// Fonte maior para a mensagem
        int width = display.getStrWidth(mensagemOLED.c_str());
        display.drawStr((128 - width) / 2, 45, mensagemOLED.c_str());
        
        display.drawLine(0, 50, 127, 50);
        display.setFont(u8g2_font_6x12_tf);
        display.drawStr(30, 62, "Aguarde...");
      } else {
        exibindoNotificacao = false; // Volta ao normal após 3 segundos
      }
    } 
    else {
      // --- INTERFACE NORMAL (Seu código original de desenho abaixo) ---
      struct tm timeinfo;
      if (getLocalTime(&timeinfo)) {
        char dataStr[20]; char horaStr[10];
        strftime(dataStr, sizeof(dataStr), "%d/%m/%Y", &timeinfo);
        strftime(horaStr, sizeof(horaStr), "%H:%M:%S", &timeinfo);
        display.setFont(u8g2_font_6x12_tf);
        display.drawStr(0, 10, dataStr);
        display.drawStr(78, 10, horaStr);
      }

      char buf[10];
      dtostrf(temperaturaAtual, 4, 1, buf);
      display.setFont(u8g2_font_logisoso24_tf);
      display.drawStr(0, 45, buf);
      display.setFont(u8g2_font_6x12_tf);
      display.drawStr(58, 45, "C");
      display.drawLine(0, 48, 127, 48);

      dtostrf(tempMax, 4, 1, buf);
      display.drawStr(108, 30, "Max"); display.drawStr(80, 30, buf);
      dtostrf(tempMin, 4, 1, buf);
      display.drawStr(108, 40, "Min"); display.drawStr(80, 40, buf);

      if (showRelayStatus) {
        display.drawStr(0, 63, modoManual ? "MANU:" : "AUTO:");
        display.drawStr(40, 63, releLigado ? "LIGADO" : "DESLIGADO");
      } else {
        display.drawStr(0, 63, "MQTT:"); display.drawStr(40, 63, "OFF!!"); 
      }
      drawWiFiIconBars(108, 63);
    }
    display.sendBuffer();
  }
}
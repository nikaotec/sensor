#include <Arduino.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "Config.h"
#include "StorageManager.h"
#include "DisplayManager.h"
#include "AppNetworkManager.h"
#include "VoltageSensor.h"

// ---------- OBJETOS GLOBAIS ----------
StorageManager storage;
DisplayManager display;
AppNetworkManager network;

OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);
VoltageSensor voltSensor(PIN_ZMPT, VOLTAGE_CALIBRATION_DEFAULT);
            
// ---------- ESTADO DO SISTEMA ----------
float temperaturaAtual = 0.0;
bool releLigado = false;
bool modoManual = false;
unsigned long manualTimeout = 0;
String statusSeguranca = "OK";

// ---------- TIMERS ----------
unsigned long inicioForaDaFaixa = 0;
unsigned long inicioAlarmeTensao = 0;
unsigned long lastMqttAlert = 0;
unsigned long lastMqttVoltAlert = 0; // Novo timer para tensao
unsigned long lastTempCheck = 0;
int lastReportDay = -1;
bool alarmeAtivo = false;
bool alarmeTensaoAtivo = false;

// ---------- PROTÓTIPOS ----------
void processarMensagemMqtt(String topic, String payload);
void enviarDadosMqtt(String evento);

// ---------- SETUP ----------
void setup() {
    Serial.begin(115200);

    // Inicializa Hardware
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);
    
    // I2C
    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(400000); 
    Wire.setTimeOut(1000); 

    // Managers
    storage.begin();
    display.begin();
    network.begin(processarMensagemMqtt);

    // Sensores
    sensors.begin();
    sensors.setWaitForConversion(false);
    
    // Configura Calibração Inicial
    voltSensor.setCalibration(storage.data.voltCalFactor);
    voltSensor.begin();

    configTime(-3 * 3600, 0, "pool.ntp.org");
    
    Serial.println("Sistema Iniciado (Modular)");
}

// ---------- LOOP ----------
void loop() {
    delay(1); // Watchdog Feed
    unsigned long now = millis();

    // 1. Atualizar Rede
    network.update();

    // 2. Ler Sensores (a cada 2s)
    if (now - lastTempCheck > 2000) {
        lastTempCheck = now;
        
        sensors.requestTemperatures();
        temperaturaAtual = sensors.getTempCByIndex(0);
        float tVoltagem = voltSensor.getVoltage();

        // --- Lógica de Tensão ---
        if (millis() > 60000) { // Estabilização (reduzi para 60s)
            if (tVoltagem > 50.0) { // Ignora se sensor desconectado
                bool foraDaFaixa = (tVoltagem >= storage.data.voltMax || tVoltagem <= storage.data.voltMin);

                if (foraDaFaixa) {
                    String tipoAlarme = (tVoltagem >= storage.data.voltMax) ? "TENSAO_ALTA" : "TENSAO_BAIXA";
                    
                    if (inicioAlarmeTensao == 0) { 
                        inicioAlarmeTensao = now; 
                        enviarDadosMqtt(tipoAlarme); 
                        lastMqttVoltAlert = now;
                    }

                    // Repetição do Alerta
                    unsigned long intervaloVolt = (now - inicioAlarmeTensao <= TEMPO_ALARME_MS) ? 120000 : 600000;
                    if (now - lastMqttVoltAlert >= intervaloVolt) { 
                        enviarDadosMqtt("ALERTA_REPETITIVO_" + tipoAlarme);
                        lastMqttVoltAlert = now;
                    }

                    alarmeTensaoAtivo = true;
                } else {
                    if (inicioAlarmeTensao != 0) { 
                        enviarDadosMqtt("TENSAO_NORMALIZADA"); 
                    }
                    inicioAlarmeTensao = 0;
                    alarmeTensaoAtivo = false;
                }
            } else {
                inicioAlarmeTensao = 0;
                alarmeTensaoAtivo = false;
            }
        }

        // --- Lógica de Temperatura ---
        if (temperaturaAtual > -50 && temperaturaAtual < 80) {
            storage.updateRecords(temperaturaAtual);

            // Controle Relé (Histerese)
            if (!modoManual) {
                if (temperaturaAtual >= TEMP_LIGA && !releLigado) {
                    releLigado = true;
                    digitalWrite(RELAY_PIN, HIGH);
                } else if (temperaturaAtual <= TEMP_DESLIGA && releLigado) {
                    releLigado = false;
                    digitalWrite(RELAY_PIN, LOW);
                }
            }

            // Alarmes
            if (millis() > 120000) {
                if (temperaturaAtual >= storage.data.alarmMax || temperaturaAtual <= storage.data.alarmMin) {
                    if (inicioForaDaFaixa == 0) { inicioForaDaFaixa = now; enviarDadosMqtt("SAIU_DA_FAIXA"); }
                    statusSeguranca = (temperaturaAtual >= storage.data.alarmMax) ? "QUENTE!" : "FRIO!";
                    
                    unsigned long intervalo = (temperaturaAtual > storage.data.alarmMax && (now - inicioForaDaFaixa <= TEMPO_ALARME_MS)) ? 120000 : 600000;
                    if (now - lastMqttAlert >= intervalo) { enviarDadosMqtt("ALERTA_REPETITIVO"); }
                    if (now - inicioForaDaFaixa >= TEMPO_ALARME_MS) { alarmeAtivo = true; }
                } else {
                    if (inicioForaDaFaixa != 0) { enviarDadosMqtt("VOLTOU_PARA_FAIXA"); }
                    inicioForaDaFaixa = 0;
                    alarmeAtivo = false;
                    statusSeguranca = "OK";
                }
            }
        }
    }

    // 3. Reset Diário 08:00 e 16:00
    struct tm t;
    if (getLocalTime(&t)) {
        if ((t.tm_hour == 8 || t.tm_hour == 16) && t.tm_mday != lastReportDay) {
            lastReportDay = t.tm_mday;
            enviarDadosMqtt("relatorio_diario_reset");
            storage.resetMinMax(temperaturaAtual);
            display.showMessage("Reset Diario", 5000);
        }
    }

    // 4. Atualizar Display
    display.update(
        temperaturaAtual, 
        storage.data.tempMaxRec, 
        storage.data.tempMinRec, 
        voltSensor.getVoltage(), 
        network.isWifiConnected(), 
        modoManual, 
        releLigado, 
        alarmeAtivo
    );
}

// ---------- CALLBACK MQTT ----------
void processarMensagemMqtt(String topic, String payload) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (error) return;

    String intencao = doc["intencao"] | "";

    if (intencao == "configurar_limites") {
        bool alterouTemp = false;
        bool alterouTensao = false;

        // Verifica e atualiza cada campo individualmente (Partial Update)
        if (doc.containsKey("temp_max")) { storage.data.alarmMax = doc["temp_max"]; alterouTemp = true; }
        if (doc.containsKey("temp_min")) { storage.data.alarmMin = doc["temp_min"]; alterouTemp = true; }
        if (doc.containsKey("volt_max")) { storage.data.voltMax = doc["volt_max"]; alterouTensao = true; }
        if (doc.containsKey("volt_min")) { storage.data.voltMin = doc["volt_min"]; alterouTensao = true; }

        if (alterouTemp || alterouTensao) {
            storage.save();
            enviarDadosMqtt("feedback_configuracao");
            
            // Feedback Visual Inteligente
            if (alterouTemp && alterouTensao) {
                 display.showMessage("Limites Atualizados", 4000);
            } else if (alterouTemp) {
                 String msg = "LIM T: " + String(storage.data.alarmMin, 1) + " - " + String(storage.data.alarmMax, 1);
                 display.showMessage(msg, 5000);
            } else if (alterouTensao) {
                 String msg = "LIM V: " + String(storage.data.voltMin, 0) + " - " + String(storage.data.voltMax, 0);
                 display.showMessage(msg, 5000);
            }
        }
    } 
    else if (intencao == "calibrar_tensao") {
        float novoFator = 0.0;
        bool calculoAuto = false;
        float tensaoAlvo = 0.0;

        // Opção 1: Calibração por Referência (Tensão Real)
        if (doc.containsKey("nova_tensao")) {
             String tStr = doc["nova_tensao"].as<String>();
             tStr.replace(",", "."); // Trata 220,5
             tensaoAlvo = tStr.toFloat();

             float tensaoAtual = voltSensor.getVoltage();
             float fatorAtual = storage.data.voltCalFactor;

             if (tensaoAtual > 10.0 && tensaoAlvo > 10.0) {
                 novoFator = fatorAtual * (tensaoAlvo / tensaoAtual);
                 calculoAuto = true;
             } else {
                 display.showMessage("Erro: Tensao Baixa/Zero", 4000);
                 return;
             }
        } 
        // Opção 2: Fator Direto (Legado/Manual)
        else if (doc.containsKey("novo_fator")) {
             // Lógica anterior
             if (doc["novo_fator"].is<float>()) {
                novoFator = doc["novo_fator"];
            } else if (doc["novo_fator"].is<String>()) {
                novoFator = String(doc["novo_fator"]).toFloat();
            }
        }

        Serial.print("DEBUG: Calib Fator Final: "); Serial.println(novoFator);

        if (novoFator > 10 && novoFator < 1000) {
            storage.data.voltCalFactor = novoFator;
            voltSensor.setCalibration(novoFator);
            storage.save();
            enviarDadosMqtt("feedback_calibracao_sucesso");
            
            if (calculoAuto) {
                 String msg = "Calib: " + String(tensaoAlvo, 0) + "V (F:" + String(novoFator, 1) + ")";
                 display.showMessage(msg, 5000);
            } else {
                 display.showMessage("Calib. Sucesso: " + String(novoFator, 1), 5000);
            }
        } else {
             display.showMessage("Erro Calib: " + String(novoFator, 1), 5000);
        }
    }
    else if (intencao == "ligar_rele") {
        modoManual = true; releLigado = true; manualTimeout = millis();
        digitalWrite(RELAY_PIN, HIGH);
        display.showMessage("Rele LIGADO Manual", 5000);
    }
    else if (intencao == "desligar_rele") {
        modoManual = true; releLigado = false; manualTimeout = millis();
        digitalWrite(RELAY_PIN, LOW);
        display.showMessage("Rele DESLIGADO Manual", 5000);
    }
    else if (intencao == "ativar_automatico") {
        modoManual = false;
        display.showMessage("Modo AUTOMATICO", 5000);
    }
    else if (intencao == "reset_manual") {
        storage.resetMinMax(temperaturaAtual);
        display.showMessage("Reset Max/Min", 5000);
    }
    else {
        // Feedback Genérico para Debug Visual
        if (intencao.length() > 0) {
             String msgRef = "CMD: " + intencao;
             display.showMessage(msgRef, 4000);
        }
    }
    
    enviarDadosMqtt("feedback_comando");
}

void enviarDadosMqtt(String evento) {
    if (!network.isConnected()) return;

    StaticJsonDocument<512> doc;
    doc["DISPOSITIVO"] = "02 CENTRO";
    doc["TIPO"] = evento;
    doc["TEMP_ATUAL"] = serialized(String(temperaturaAtual, 1));
    doc["MAX"] = serialized(String(storage.data.tempMaxRec, 1));
    doc["MIN"] = serialized(String(storage.data.tempMinRec, 1));
    doc["VOLTAGEM"] = serialized(String(voltSensor.getVoltage(), 1));

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
    network.publish(MSG_TOPIC_DATA, payload);
}

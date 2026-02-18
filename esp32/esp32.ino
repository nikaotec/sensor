#include "AlertManager.h"
#include "AmbientSensor.h"
#include "AppNetworkManager.h"
#include "BatterySensor.h"
#include "Config.h"
#include "DisplayManager.h"
#include "StorageManager.h"
#include "VoltageSensor.h"
#include <Arduino.h>
#include <DallasTemperature.h>
#include <OneWire.h>
#include <Wire.h>

// ---------- OBJETOS GLOBAIS ----------
StorageManager storage;
DisplayManager display;
AppNetworkManager network;

OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);
VoltageSensor voltSensor(PIN_ZMPT, VOLTAGE_CALIBRATION_DEFAULT);
// BatterySensor agora é lida dentro da Task do VoltageSensor (evita contenção
// ADC1) BatterySensor batterySensor(PIN_BATTERY, BATTERY_CALIBRATION_DEFAULT);
AmbientSensor ambientSensor(PIN_DHT11);

AlertManager alertTempMax("TEMPERATURA_ALTA", ALERT_DEBOUNCE, ALERT_REPEAT);
AlertManager alertTempMin("TEMPERATURA_BAIXA", ALERT_DEBOUNCE, ALERT_REPEAT);
AlertManager alertVoltMax("TENSAO_ALTA", ALERT_DEBOUNCE, ALERT_REPEAT);
AlertManager alertVoltMin("TENSAO_BAIXA", ALERT_DEBOUNCE, ALERT_REPEAT);
AlertManager alertBatLow("BATERIA_BAIXA", ALERT_DEBOUNCE, ALERT_REPEAT);
AlertManager alertPower("FALTA_ENERGIA", 2000,
                        ALERT_REPEAT); // 2s debounce para falta de luz
AlertManager alertDoor("PORTA_ABERTA", 2000, ALERT_REPEAT); // 2s debounce porta

// ---------- ESTADO DO SISTEMA ----------
float temperaturaAtual = 0.0;
bool releLigado = false;
bool modoManual = false;
unsigned long manualTimeout = 0;
String statusSeguranca = "OK";

// ---------- TIMERS ----------
unsigned long lastTempCheck = 0;
unsigned long lastReportTime = 0; // Novo Timer
int lastReportDay = -1;

// ...

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

  // Configurações Iniciais
  alertDoor.setDebounce(storage.data.doorMaxTime * 1000);

  // Sensores
  sensors.begin();
  sensors.setWaitForConversion(false);
  ambientSensor.begin();

  // Configura Calibração Inicial
  voltSensor.setCalibration(storage.data.voltCalFactor);
  voltSensor.setBatteryConfig(PIN_BATTERY, storage.data.batCalFactor);
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
  // 2. Ler Sensores (a cada 2s)
  if (now - lastTempCheck > 2000) {
    lastTempCheck = now;

    // 2.1 Envio Periódico (A cada 5 minutos - 300000 ms)
    if (now - lastReportTime > 300000) {
      lastReportTime = now;
      enviarDadosMqtt("periodico");
    }

    sensors.requestTemperatures();
    temperaturaAtual = sensors.getTempCByIndex(0);
    float tVoltagem = voltSensor.getVoltage();
    float tBateria = voltSensor.getBatteryVoltage();
    ambientSensor.read();
    bool isDoorOpen =
        digitalRead(PIN_DOOR) == HIGH; // HIGH = Aberto (se pullup interno)

    // --- VERIFICAÇÃO DE ALERTAS (AlertManager) ---

    // --- VERIFICAÇÃO DE ALERTAS (AlertManager) ---
    // Se modoManual (Manutenção) estiver ativo, silencia alertas sonoros/MQTT
    if (!modoManual) {
      // 1. Falta de Energia (Prioridade)
      if (alertPower.check(tVoltagem < VOLT_OUTAGE_THR) == ALERT_STARTED)
        enviarDadosMqtt("ALERTA_FALTA_ENERGIA");
      if (alertPower.check(tVoltagem < VOLT_OUTAGE_THR) == ALERT_NORMALIZED)
        enviarDadosMqtt("ENERGIA_RESTABELECIDA");

      // 2. Bateria Baixa (Usa Limite Configurável)
      if (alertBatLow.check(tBateria < storage.data.batMinLimit) ==
          ALERT_STARTED)
        enviarDadosMqtt("ALERTA_BATERIA_BAIXA");
      if (alertBatLow.check(tBateria < storage.data.batMinLimit) ==
          ALERT_NORMALIZED)
        enviarDadosMqtt("BATERIA_OK");

      // 3. Porta Aberta
      if (alertDoor.check(isDoorOpen) == ALERT_STARTED)
        enviarDadosMqtt("ALERTA_PORTA_ABERTA");
      if (alertDoor.check(isDoorOpen) == ALERT_NORMALIZED)
        enviarDadosMqtt("PORTA_FECHADA");

      // 4. Tensão da Rede (Só checa se tiver energia, > 20V)
      if (tVoltagem > VOLT_OUTAGE_THR) {
        if (alertVoltMax.check(tVoltagem > storage.data.voltMax) ==
            ALERT_STARTED)
          enviarDadosMqtt("ALERTA_TENSAO_ALTA");
        if (alertVoltMax.check(tVoltagem > storage.data.voltMax) ==
            ALERT_NORMALIZED)
          enviarDadosMqtt("TENSAO_NORMALIZADA");

        if (alertVoltMin.check(tVoltagem < storage.data.voltMin) ==
            ALERT_STARTED)
          enviarDadosMqtt("ALERTA_TENSAO_BAIXA");
        if (alertVoltMin.check(tVoltagem < storage.data.voltMin) ==
            ALERT_NORMALIZED)
          enviarDadosMqtt("TENSAO_NORMALIZADA");
      }
    }

    // 5. Temperatura (Com lógica para não sobrepor Max/Min)
    if (temperaturaAtual > -50 && temperaturaAtual < 80) {
      storage.updateRecords(temperaturaAtual);

      // Lógica Relé
      if (!modoManual) {
        if (temperaturaAtual >= TEMP_LIGA && !releLigado) {
          releLigado = true;
          digitalWrite(RELAY_PIN, HIGH);
        } else if (temperaturaAtual <= TEMP_DESLIGA && releLigado) {
          releLigado = false;
          digitalWrite(RELAY_PIN, LOW);
        }

        // Alertas Temperatura (Apenas em automático/não manutenção)
        if (alertTempMax.check(temperaturaAtual > storage.data.alarmMax) ==
            ALERT_STARTED) {
          statusSeguranca = "QUENTE!";
          enviarDadosMqtt("ALERTA_TEMP_ALTA");
        }
        if (alertTempMin.check(temperaturaAtual < storage.data.alarmMin) ==
            ALERT_STARTED) {
          statusSeguranca = "FRIO!";
          enviarDadosMqtt("ALERTA_TEMP_BAIXA");
        }

        // Verifica Normalização
        if (!alertTempMax.isActive() && !alertTempMin.isActive()) {
          if (statusSeguranca != "OK") {
            statusSeguranca = "OK";
            enviarDadosMqtt("TEMP_NORMALIZADA");
          }
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
  display.update(temperaturaAtual, storage.data.tempMaxRec,
                 storage.data.tempMinRec, voltSensor.getVoltage(),
                 network.isWifiConnected(), modoManual, releLigado,
                 (alertTempMax.isActive() || alertTempMin.isActive() ||
                  alertVoltMax.isActive() || alertVoltMin.isActive() ||
                  alertBatLow.isActive() || alertPower.isActive() ||
                  alertDoor.isActive()));
}

// Função Helper para notificar por Display e MQTT ao mesmo tempo
void notificarUsuario(String mensagem, int tempo = 4000) {
  display.showMessage(mensagem, tempo);

  StaticJsonDocument<256> doc;
  doc["TIPO"] = "MENSAGEM_DISPLAY";
  doc["CONTEUDO"] = mensagem;
  doc["HORA"] = network.getCurrentTime();
  doc["DISPOSITIVO"] = DEVICE_NAME;

  String output;
  serializeJson(doc, output);
  network.publish(MSG_TOPIC_STATUS, output);
}

// ---------- CALLBACK MQTT ----------
void processarMensagemMqtt(String topic, String payload) {
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error)
    return;

  String intencao = doc["intencao"] | "";

  if (intencao == "configurar_limites") {
    bool alterouTemp = false;
    bool alterouTensao = false;
    bool alterouBat = false;
    bool alterouPorta = false;

    // Verifica e atualiza cada campo individualmente
    if (doc.containsKey("temp_max")) {
      storage.data.alarmMax = doc["temp_max"];
      alterouTemp = true;
    }
    if (doc.containsKey("temp_min")) {
      storage.data.alarmMin = doc["temp_min"];
      alterouTemp = true;
    }
    if (doc.containsKey("volt_max")) {
      storage.data.voltMax = doc["volt_max"];
      alterouTensao = true;
    }
    if (doc.containsKey("volt_min")) {
      storage.data.voltMin = doc["volt_min"];
      alterouTensao = true;
    }
    if (doc.containsKey("bat_min")) {
      storage.data.batMinLimit = doc["bat_min"];
      alterouBat = true;
    }
    if (doc.containsKey("tempo_porta")) {
      storage.data.doorMaxTime = doc["tempo_porta"];
      alertDoor.setDebounce(storage.data.doorMaxTime * 1000);
      alterouPorta = true;
    }

    if (alterouTemp || alterouTensao || alterouBat || alterouPorta) {
      storage.save();
      enviarDadosMqtt("feedback_configuracao");

      if (alterouTemp && alterouTensao && alterouBat) {
        notificarUsuario("Config. Completa", 5000);
      } else if (alterouBat) {
        notificarUsuario(
            "Bat Min: " + String(storage.data.batMinLimit, 1) + "V", 4000);
      } else if (alterouPorta) {
        notificarUsuario("Porta Max: " + String(storage.data.doorMaxTime) + "s",
                         4000);
      } else {
        notificarUsuario("Limites Atualizados", 4000);
      }
    }
  } else if (intencao == "modo_manutencao") {
    // Toggle ou Set
    if (doc.containsKey("ativo")) {
      // Se o JSON trouxer explicitamente true/false
      bool state = doc["ativo"];
      if (state) {
        modoManual = true; // RE Using existing manual mode flag as maintenance
        notificarUsuario("Manutencao ATIVADA", 5000);
      } else {
        modoManual = false;
        notificarUsuario("Manutencao DESATIVADA", 5000);
      }
    } else {
      // Toggle se não especificado
      modoManual = !modoManual;
      notificarUsuario(
          modoManual ? "Manutencao ATIVADA" : "Manutencao DESATIVADA", 5000);
    }
    enviarDadosMqtt(modoManual ? "MANUTENCAO_ATIVADA"
                               : "MANUTENCAO_DESATIVADA");

  } else if (intencao == "silenciar_alarme") {
    // Apenas limpa a mensagem do display por enquanto,
    // mas poderia parar buzzer se tivesse
    notificarUsuario("Alarme Silenciado", 3000);
    // Reseta flags de alerta visual se possível, ou apenas ack
    enviarDadosMqtt("ALARME_SILENCIADO");

  } else if (intencao == "obter_status_atual") {
    enviarDadosMqtt("STATUS_SOLICITADO");

  } else if (intencao == "calibrar_tensao") {
    float novoFator = 0.0;
    bool calculoAuto = false;
    float tensaoAlvo = 0.0;

    // Opção 1: Calibração por Referência (Tensão Real)
    if (doc.containsKey("nova_tensao")) {
      String tStr = doc["nova_tensao"].as<String>();
      tStr.replace(",", "."); // Trata 220,5
      tensaoAlvo = tStr.toFloat();

      float tensaoAtual = voltSensor.getRawVoltage();
      float fatorAtual = storage.data.voltCalFactor;

      if (tensaoAtual > 10.0 && tensaoAlvo > 10.0) {
        novoFator = fatorAtual * (tensaoAlvo / tensaoAtual);
        calculoAuto = true;
      } else {
        notificarUsuario("Erro: Tensao Baixa/Zero", 4000);
        enviarDadosMqtt("ALERTA_ERRO_CALIBRACAO_TENSAO_BAIXA");
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

    Serial.print("DEBUG: Calib Fator Final: ");
    Serial.println(novoFator);

    if (novoFator > 5 && novoFator < 20000) {
      storage.data.voltCalFactor = novoFator;
      voltSensor.setCalibration(novoFator);
      storage.save();
      enviarDadosMqtt("feedback_calibracao_sucesso");

      if (calculoAuto) {
        String msg = "Calib: " + String(tensaoAlvo, 0) +
                     "V (F:" + String(novoFator, 1) + ")";
        notificarUsuario(msg, 5000);
      } else {
        notificarUsuario("Calib. Sucesso: " + String(novoFator, 1), 5000);
      }
    } else {
      notificarUsuario("Erro Calib: " + String(novoFator, 1), 5000);
      enviarDadosMqtt("ALERTA_ERRO_CALIBRACAO_FATOR");
    }
  } else if (intencao == "calibrar_bateria") {
    float novoFator = 0.0;

    if (doc.containsKey("nova_tensao")) {
      String tStr = doc["nova_tensao"].as<String>();
      tStr.replace(",", ".");
      float tensaoAlvo = tStr.toFloat();
      float tensaoAtual = voltSensor.getBatteryVoltage();

      if (tensaoAtual > 1.0 && tensaoAlvo > 1.0) {
        novoFator = storage.data.batCalFactor * (tensaoAlvo / tensaoAtual);
      } else {
        notificarUsuario("Erro: Bat. Baixa/Zero", 4000);
        return;
      }
    } else if (doc.containsKey("novo_fator")) {
      if (doc["novo_fator"].is<float>()) {
        novoFator = doc["novo_fator"];
      } else {
        novoFator = String(doc["novo_fator"]).toFloat();
      }
    }

    if (novoFator > 0.1 && novoFator < 100.0) {
      storage.data.batCalFactor = novoFator;
      voltSensor.setBatteryCalibration(novoFator);
      storage.save();
      notificarUsuario("Bat Calib: " + String(novoFator, 2), 5000);
      enviarDadosMqtt("feedback_calibracao_bateria");
    } else {
      notificarUsuario("Erro Bat Cal: " + String(novoFator, 2), 5000);
    }
  } else if (intencao == "ligar_rele") {
    modoManual = true;
    releLigado = true;
    manualTimeout = millis();
    digitalWrite(RELAY_PIN, HIGH);
    notificarUsuario("Rele LIGADO Manual", 5000);
  } else if (intencao == "desligar_rele") {
    modoManual = true;
    releLigado = false;
    manualTimeout = millis();
    digitalWrite(RELAY_PIN, LOW);
    notificarUsuario("Rele DESLIGADO Man.", 5000);
  } else if (intencao == "ativar_automatico") {
    modoManual = false;
    notificarUsuario("Modo AUTOMATICO", 5000);
  } else if (intencao == "reset_manual") {
    storage.resetMinMax(temperaturaAtual);
    notificarUsuario("Reset Max/Min", 5000);
  } else {
    // Feedback Genérico para Debug Visual
    if (intencao.length() > 0) {
      String msgRef = "CMD: " + intencao;
      notificarUsuario(msgRef, 4000);
    }
  }

  enviarDadosMqtt("feedback_comando");
}

// ---------- ENVIA DADOS COMPLETOS PARA MQTT ----------
void enviarDadosMqtt(String evento) {
  if (!network.isConnected())
    return;

  StaticJsonDocument<768> doc;
  doc["DISPOSITIVO"] = "02 CENTRO";
  doc["TIPO"] = evento;

  // Dados de Sensores Formatados
  doc["TEMP_ATUAL"] = serialized(String(temperaturaAtual, 1));
  doc["MAX"] = serialized(String(storage.data.tempMaxRec, 1));
  doc["MIN"] = serialized(String(storage.data.tempMinRec, 1));

  doc["VOLTAGEM"] = serialized(String(voltSensor.getVoltage(), 1));
  doc["BATERIA"] = serialized(String(voltSensor.getBatteryVoltage(), 2));

  // Sensor Ambiente (DHT11)
  doc["TEMP_EXTERNA"] = serialized(String(ambientSensor.getTemperature(), 1));
  doc["UMIDADE"] = serialized(String(ambientSensor.getHumidity(), 1));

  // Estado da Porta
  doc["PORTA"] = digitalRead(PIN_DOOR) == HIGH ? "ABERTA" : "FECHADA";

  // Timestamp
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char dStr[20], hStr[10];
    strftime(dStr, sizeof(dStr), "%d/%m/%Y", &timeinfo);
    strftime(hStr, sizeof(hStr), "%H:%M:%S", &timeinfo);
    doc["DATA"] = dStr;
    doc["HORA"] = hStr;
  }

  // Publica no tópico de DADOS (telemetria)
  String payload;
  serializeJson(doc, payload);
  network.publish(MSG_TOPIC_DATA, payload);
}

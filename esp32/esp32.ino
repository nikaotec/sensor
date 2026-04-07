#include "AlertManager.h"
#include "AmbientSensor.h"
#include "AppNetworkManager.h"
#include "BatterySensor.h"
#include "ButtonManager.h"
#include "Config.h"
#include "DisplayManager.h"
#include "StorageManager.h"
#include "VoltageSensor.h"
#include <Arduino.h>
#include <DallasTemperature.h>
#include <OneWire.h>
#include <WiFi.h>
#include <Wire.h>

// ---------- OBJETOS GLOBAIS ----------
StorageManager storage;
DisplayManager display;
AppNetworkManager network;
ButtonManager buttons;

OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);
VoltageSensor voltSensor(PIN_ZMPT, VOLTAGE_CALIBRATION_DEFAULT);
// BatterySensor agora é lida dentro da Task do VoltageSensor (evita contenção
// ADC1) BatterySensor batterySensor(PIN_BATTERY, BATTERY_CALIBRATION_DEFAULT);
AmbientSensor ambientSensor;

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
bool alertasSilenciados =
    false; // Novo flag para silenciar alertas persistentes
unsigned long manualTimeout = 0;
String statusSeguranca = "OK";
String ultimoRemoteJid = "";        // remoteJid do ultimo comando recebido
String ultimosCamposAlterados = ""; // Campos alterados na ultima configuracao

// ---------- TIMERS ----------
unsigned long lastTempCheck = 0;
unsigned long lastReportTime = 0;      // Novo Timer
unsigned long lastWebReport = 0;       // Timer para Dashboard Web
unsigned long lastDashboardReport = 0; // Timer para Dashboard Especial (1 min)
unsigned long lastSupportReport = 0;   // Timer relatorio suporte (1h)
unsigned long lastReportDay = -1;
unsigned long doorOpenStart = 0; // Início do tempo de porta aberta

// ...

void enviarDadosMqtt(String evento);
void enviarDadosDashboard();
void enviarDadosWeb();

// ---------- FUNÇÕES AUXILIARES ----------
void emitirBipe(int tempo = 100, int repeticoes = 1) {
  for (int i = 0; i < repeticoes; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(tempo);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < repeticoes - 1)
      delay(100);
  }
}

// ---------- ID ÚNICO ----------
String getIdDispositivo() {
  uint64_t chipId = ESP.getEfuseMac();
  char idUnico[13];
  snprintf(idUnico, sizeof(idUnico), "%04X%08X", (uint16_t)(chipId >> 32),
           (uint32_t)chipId);
  return String(idUnico);
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);

  // Inicializa Hardware
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  emitirBipe(200, 2); // Feedback de inicialização

  // I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  Wire.setTimeOut(1000);

  // Managers
  storage.begin();
  display.begin();
  network.begin(processarMensagemMqtt);
  buttons.begin();

  // Configurações Iniciais
  alertDoor.setDebounce(storage.data.doorMaxTime * 1000);

  // Sensores
  sensors.begin();
  sensors.setWaitForConversion(false);
  ambientSensor.begin();
  pinMode(PIN_DOOR, INPUT_PULLUP);

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

  // 0. Ler Botões e Gerenciar Menu
  ButtonEvent ev = buttons.checkButtons();
  if (ev != BTN_NONE) {
    if (!display.isMenuOpen()) {
      if (ev == BTN_PRESSED_MENU)
        display.openMenu();
    } else {
      if (ev == BTN_PRESSED_MENU)
        display.closeMenu();
      else if (ev == BTN_PRESSED_UP)
        display.menuPrev();
      else if (ev == BTN_PRESSED_DOWN)
        display.menuNext();
      else if (ev == BTN_PRESSED_ENTER) {
        bool relayStatus = releLigado;
        int res =
            display.menuEnter(storage.data.alarmMax, storage.data.alarmMin,
                              storage.data.chkVolt, relayStatus);
        if (res == 1) {
          // Se alterou algum parâmetro, salva
          storage.save();
          enviarDadosMqtt("feedback_configuracao");

          // Trata teste de relé especificamente
          if (relayStatus != releLigado) {
            releLigado = relayStatus;
            digitalWrite(RELAY_PIN, releLigado ? HIGH : LOW);
            modoManual = true; // Força modo manual para teste
          }
        } else if (res == 2) {
          // RESET WIFI
          display.showMessage("RESETANDO WIFI...", 3000);
          network.resetWifi();
        }
      }
    }
  }

  // 1. Atualizar Rede
  network.update();

  // 1.1 Atualizar Dashboard Web (Tempo Real)
  if (now - lastWebReport >= 2000) {
    lastWebReport = now;
    enviarDadosWeb();
  }

  // 1.2 Atualizar Dashboard via n8n (A cada 1 hora)
  if (now - lastDashboardReport >= 3600000UL) {
    lastDashboardReport = now;
    enviarDadosDashboard();
  }

  // 2. Ler Sensores (a cada 2s)
  if (now - lastTempCheck > 2000) {
    lastTempCheck = now;

    sensors.requestTemperatures();
    temperaturaAtual = sensors.getTempCByIndex(0);
    float tVoltagem = voltSensor.getVoltage();
    float tBateria = voltSensor.getBatteryVoltage();
    ambientSensor.read();
    bool isDoorOpen = digitalRead(PIN_DOOR) == HIGH;
    if (isDoorOpen) {
      if (doorOpenStart == 0)
        doorOpenStart = now;
    } else {
      doorOpenStart = 0;
    }

    // 2.1 Envio Periódico de Alerta (Sincronização de timers)
    bool foraDaFaixa =
        (temperaturaAtual > storage.data.alarmMax ||
         temperaturaAtual < storage.data.alarmMin ||
         tVoltagem > storage.data.voltMax || tVoltagem < storage.data.voltMin ||
         tVoltagem < VOLT_OUTAGE_THR || tBateria < storage.data.batMinLimit);

    // Sincroniza o silêncio na borda
    static bool prevForaDaFaixa = false;
    if (foraDaFaixa && !prevForaDaFaixa) {
      alertasSilenciados =
          false; // Garante que alerta novo não nasça silenciado
    }
    prevForaDaFaixa = foraDaFaixa;

    // Auto-reset do silêncio se voltar ao normal
    if (!foraDaFaixa) {
      alertasSilenciados = false;
    }

    // --- VERIFICAÇÃO DE ALERTAS E CONTROLE ---

    // Atualiza registros se temperatura válida (independente do modo)
    if (temperaturaAtual > -50 && temperaturaAtual < 80) {
      storage.updateRecords(temperaturaAtual);
    }

    // Controle e Alertas (Apenas se não estiver em manutenção)
    if (!modoManual) {

      // 0. Lógica do Relé (Apenas com temperatura válida)
      if (temperaturaAtual > -50 && temperaturaAtual < 80) {
        if (temperaturaAtual >= TEMP_LIGA && !releLigado) {
          releLigado = true;
          digitalWrite(RELAY_PIN, HIGH);
        } else if (temperaturaAtual <= TEMP_DESLIGA && releLigado) {
          releLigado = false;
          digitalWrite(RELAY_PIN, LOW);
        }
      }

      // 1. Declaração de status de temperatura
      AlertStatus stMax =
          alertTempMax.check(temperaturaAtual >= storage.data.alarmMax);
      AlertStatus stMin =
          alertTempMin.check(temperaturaAtual <= storage.data.alarmMin);

      // 2. Falta de Energia
      // 2. Falta de Energia
      if (storage.data.chkVolt) {
        AlertStatus stPower = alertPower.check(tVoltagem < VOLT_OUTAGE_THR);
        if (stPower == ALERT_STARTED ||
            (stPower == ALERT_REPEATED && !alertasSilenciados))
          enviarDadosMqtt("ALERTA_FALTA_ENERGIA");
        if (stPower == ALERT_NORMALIZED)
          enviarDadosMqtt("ENERGIA_RESTABELECIDA");
      }

      // 3. Bateria Baixa
      if (storage.data.chkBat) {
        AlertStatus stBat =
            alertBatLow.check(tBateria < storage.data.batMinLimit);
        if (stBat == ALERT_STARTED ||
            (stBat == ALERT_REPEATED && !alertasSilenciados))
          enviarDadosMqtt("ALERTA_BATERIA_BAIXA");
        if (stBat == ALERT_NORMALIZED)
          enviarDadosMqtt("BATERIA_NORMALIZADA");
      }

      // 4. Porta
      if (storage.data.chkDoor) {
        AlertStatus stDoor = alertDoor.check(isDoorOpen);
        if (stDoor == ALERT_STARTED ||
            (stDoor == ALERT_REPEATED && !alertasSilenciados))
          enviarDadosMqtt("ALERTA_PORTA_ABERTA");
        if (stDoor == ALERT_NORMALIZED)
          enviarDadosMqtt("PORTA_FECHADA");
      }

      // 5. Tensão da Rede
      if (storage.data.chkVolt && tVoltagem > VOLT_OUTAGE_THR) {
        AlertStatus stVoltMax =
            alertVoltMax.check(tVoltagem > storage.data.voltMax);
        AlertStatus stVoltMin =
            alertVoltMin.check(tVoltagem < storage.data.voltMin);

        if (stVoltMax == ALERT_STARTED ||
            (stVoltMax == ALERT_REPEATED && !alertasSilenciados)) {
          enviarDadosMqtt("ALERTA_TENSAO_ALTA");
        }
        if (stVoltMax == ALERT_NORMALIZED) {
          enviarDadosMqtt("TENSAO_NORMALIZADA");
        }

        if (stVoltMin == ALERT_STARTED ||
            (stVoltMin == ALERT_REPEATED && !alertasSilenciados)) {
          enviarDadosMqtt("ALERTA_TENSAO_BAIXA");
        }
        if (stVoltMin == ALERT_NORMALIZED) {
          enviarDadosMqtt("TENSAO_NORMALIZADA");
        }
      }

      // 6. Temperatura Alerts
      if (stMax == ALERT_STARTED ||
          (stMax == ALERT_REPEATED && !alertasSilenciados)) {
        statusSeguranca = "QUENTE!";
        // Buzzer direto no loop para garantir feedback local
        if (!alertasSilenciados)
          emitirBipe(300, 3);
        enviarDadosMqtt("ALERTA_TEMP_ALTA");
      }
      if (stMin == ALERT_STARTED ||
          (stMin == ALERT_REPEATED && !alertasSilenciados)) {
        statusSeguranca = "FRIO!";
        // Buzzer direto no loop para garantir feedback local
        if (!alertasSilenciados)
          emitirBipe(300, 3);
        enviarDadosMqtt("ALERTA_TEMP_BAIXA");
      }

      // Verifica Normalização Temperatura
      if (stMax == ALERT_NORMALIZED || stMin == ALERT_NORMALIZED) {
        statusSeguranca = "OK";
        enviarDadosMqtt("TEMP_NORMALIZADA");
      }
    }

    // 3. Reset Diário 06:00 e 16:00
    struct tm t;
    if (getLocalTime(&t)) {
      // Check if hour changed to avoid multiple triggers within the same hour
      static int lastReportHour = -1;
      if ((t.tm_hour == 8 || t.tm_hour == 16) && t.tm_hour != lastReportHour) {
        lastReportHour = t.tm_hour;
        enviarDadosMqtt("relatorio_diario");
        storage.resetMinMax(temperaturaAtual);
        display.showMessage("Reset Diario", 5000);
      }
      // Update tracking variable when hour changes (to allow re-trigger next
      // day)
      if (t.tm_hour != 8 && t.tm_hour != 16) {
        lastReportHour = -1;
      }
    }

    // 3.1. Relatório Periódico de Telemetria (hora cheia para log histórico no
    // Firestore)
    if (!modoManual) {
      static int lastProcessedHour = -1;
      if (t.tm_hour != lastProcessedHour) {
        lastProcessedHour = t.tm_hour;
        enviarDadosMqtt("periodico");
      }
    }

    // 3.2. Relatorio de suporte (hora em hora)
    if (!modoManual && (now - lastSupportReport >= 3600000UL)) {
      lastSupportReport = now;
      enviarDadosMqtt("periodico_suporte");
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
}

// Helper para verificar se o dispositivo está vinculado a uma empresa real
bool isDeviceLinked() {
  String comp = String(storage.data.companyName);
  comp.trim();
  comp.toLowerCase();
  // Lista de identificadores considerados "não vinculados"
  if (comp == "" || comp == "unknown" || comp == "empresa_default") {
    return false;
  }
  return true;
}

// Função Helper para notificar por Display e MQTT ao mesmo tempo
void notificarUsuario(String mensagem, int tempo = 4000) {
  display.showMessage(mensagem, tempo);
  emitirBipe(100);

  StaticJsonDocument<256> doc;
  doc["TIPO"] = "MENSAGEM_DISPLAY";
  doc["CONTEUDO"] = mensagem;
  doc["HORA"] = network.getCurrentTime();
  doc["DISPOSITIVO"] = storage.data.deviceName;

  String output;
  serializeJson(doc, output);
  // Removemos a publicação no tópico de STATUS (RX) para evitar loops e
  // duplicidade. O feedback para o n8n/WhatsApp deve vir pelo enviarDadosMqtt
  // (tópico DATA).
  network.publish(MSG_TOPIC_WEB_STATUS, output);
}

// ---------- CALLBACK MQTT ----------
void processarMensagemMqtt(String topic, String payload) {
  Serial.println("[MQTT RX] Topico: " + topic);
  Serial.println("[MQTT RX] Payload: " + payload);

  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.println("[MQTT RX] ERRO JSON: " + String(error.c_str()));
    return;
  }

  String intencao = doc["intencao"] | "";
  bool isAdmin = doc["is_admin"] | false;

  // Salva remoteJid para incluir nas respostas
  if (doc.containsKey("remoteJid")) {
    ultimoRemoteJid = doc["remoteJid"].as<String>();
  }

  Serial.println("[MQTT RX] Intencao: " + intencao +
                 " | Admin: " + String(isAdmin ? "SIM" : "NAO") +
                 " | RemoteJid: " + ultimoRemoteJid);

  // --- VERIFICAÇÃO DE AUTORIZAÇÃO ---
  // Se não for um comando de leitura ("obter_status_atual", "obter_ambiente"),
  // requer ser admin
  if (intencao != "" && intencao != "obter_status_atual" &&
      intencao != "obter_ambiente") {
    if (!isAdmin) {
      Serial.println("[MQTT RX] BLOQUEADO - Usuario nao autorizado");
      enviarDadosMqtt("ERRO_NAO_AUTORIZADO");
      return;
    }
  }

  // --- MODO MANUTENÇÃO: Bloqueia todos os comandos exceto
  // modo_manutencao/modo_operacional ---
  if (modoManual && intencao != "modo_manutencao" &&
      intencao != "modo_operacional") {
    Serial.println("[MQTT RX] BLOQUEADO - Dispositivo em manutenção");
    enviarDadosMqtt("EM_MANUTENCAO");
    return;
  }

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
      ultimosCamposAlterados = String(alterouTemp ? "ALARM," : "") +
                               String(alterouTensao ? "VOLT," : "") +
                               String(alterouBat ? "BAT," : "") +
                               String(alterouPorta ? "DOOR," : "");
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
    // Apenas ATIVA manutenção
    if (!modoManual) {
      modoManual = true;
      display.showMessage("EM MANUTENCAO", 0); // Permanente no display
      enviarDadosMqtt("MANUTENCAO_ATIVADA");
    } else {
      // Já está em manutenção
      enviarDadosMqtt("EM_MANUTENCAO");
    }

  } else if (intencao == "modo_operacional") {
    // Apenas DESATIVA manutenção
    if (modoManual) {
      modoManual = false;
      display.showMessage("OPERACIONAL", 0); // Permanente no display
      enviarDadosMqtt("MANUTENCAO_DESATIVADA");
    } else {
      // Já está operacional
      enviarDadosMqtt("feedback_comando");
    }

  } else if (intencao == "silenciar_alarme") {
    alertasSilenciados =
        true; // Impede novos alertas persistentes até normalizar
    notificarUsuario("Alarme Silenciado", 3000);
    enviarDadosMqtt("ALARME_SILENCIADO");
  } else if (intencao == "reativar_alarme") {
    alertasSilenciados = false;
    notificarUsuario("Alarme Reativado", 3000);
    enviarDadosMqtt("ALARME_REATIVADO");

  } else if (intencao == "obter_status_atual") {
    enviarDadosMqtt("STATUS_SOLICITADO");

  } else if (intencao == "obter_ambiente") {
    // Envia dados do sensor ambiente com mensagem já formatada
    StaticJsonDocument<512> ambDoc;
    ambDoc["DISPOSITIVO"] = "02 CENTRO";
    ambDoc["TIPO"] = "DADOS_AMBIENTE";
    float tempExt = ambientSensor.getTemperature();
    float umid = ambientSensor.getHumidity();
    ambDoc["TEMP_EXTERNA"] = serialized(String(tempExt, 1));
    ambDoc["UMIDADE"] = serialized(String(umid, 1));
    struct tm ti;
    String dataStr = "", horaStr = "";
    if (getLocalTime(&ti)) {
      char d[20], h[10];
      strftime(d, sizeof(d), "%d/%m/%Y", &ti);
      strftime(h, sizeof(h), "%H:%M:%S", &ti);
      ambDoc["DATA"] = d;
      ambDoc["HORA"] = h;
      dataStr = String(d);
      horaStr = String(h);
    }
    // Mensagem formatada para WhatsApp
    String msg = "🌡️ *Dados Ambientais*\n";
    msg += "🌍 Temp Externa: " + String(tempExt, 1) + "°C\n";
    msg += "💧 Umidade: " + String(umid, 1) + "%\n";
    msg += "📅 " + dataStr + " às " + horaStr;
    ambDoc["MSG"] = msg;
    String ambPayload;
    serializeJson(ambDoc, ambPayload);
    network.publish(MSG_TOPIC_DATA, ambPayload.c_str());
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
  } else if (intencao == "vincular_dispositivo") {
    bool alterou = false;
    if (doc.containsKey("nome")) {
      strncpy(storage.data.deviceName, doc["nome"], 31);
      storage.data.deviceName[31] = '\0';
      alterou = true;
    }
    if (doc.containsKey("empresa")) {
      strncpy(storage.data.companyName, doc["empresa"], 31);
      storage.data.companyName[31] = '\0';
      alterou = true;
    }
    if (doc.containsKey("ala")) {
      strncpy(storage.data.deviceLocation, doc["ala"], 31);
      storage.data.deviceLocation[31] = '\0';
      alterou = true;
    }

    if (alterou) {
      storage.save();
      notificarUsuario("VINCULADO: " + String(storage.data.companyName), 5000);
      enviarDadosMqtt("feedback_vinculo");
      // Envia REALTIME imediato para atualizar dashboard
      enviarDadosWeb();
    }
  } else if (intencao == "desvincular_dispositivo") {
    strncpy(storage.data.deviceName, DEFAULT_DEVICE_NAME, 31);
    strncpy(storage.data.companyName, DEFAULT_COMPANY_NAME, 31);
    strncpy(storage.data.deviceLocation, DEFAULT_DEVICE_LOCATION, 31);
    storage.data.deviceName[31] = '\0';
    storage.data.companyName[31] = '\0';
    storage.data.deviceLocation[31] = '\0';
    storage.save();
    notificarUsuario("DESVINCULADO", 5000);
    enviarDadosMqtt("feedback_desvinculo");
    enviarDadosWeb();
  } else if (intencao == "ligar_rele") {
    modoManual = true;
    releLigado = true;
    manualTimeout = millis();
    digitalWrite(RELAY_PIN, HIGH);
    notificarUsuario("Rele LIGADO Manual", 5000);
    enviarDadosMqtt("RELE_LIGADO_MANUAL");
  } else if (intencao == "desligar_rele") {
    modoManual = true;
    releLigado = false;
    manualTimeout = millis();
    digitalWrite(RELAY_PIN, LOW);
    notificarUsuario("Rele DESLIGADO Man.", 5000);
    enviarDadosMqtt("RELE_DESDILIGADO_MANUAL");
  } else if (intencao == "ativar_automatico") {
    modoManual = false;
    notificarUsuario("Modo AUTOMATICO", 5000);
    enviarDadosMqtt("MODO_AUTOMATICO_ATIVADO");
  } else if (intencao == "habilitar_tensao") {
    storage.data.chkVolt = true;
    storage.save();
    notificarUsuario("Mon. Tensao LIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao");
  } else if (intencao == "desabilitar_tensao") {
    storage.data.chkVolt = false;
    storage.save();
    notificarUsuario("Mon. Tensao DESLIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao");
  } else if (intencao == "habilitar_bateria") {
    storage.data.chkBat = true;
    storage.save();
    notificarUsuario("Mon. Bateria LIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao");
  } else if (intencao == "desabilitar_bateria") {
    storage.data.chkBat = false;
    storage.save();
    notificarUsuario("Mon. Bateria DESLIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao");
  } else if (intencao == "habilitar_porta") {
    storage.data.chkDoor = true;
    storage.save();
    notificarUsuario("Mon. Porta LIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao");
  } else if (intencao == "desabilitar_porta") {
    storage.data.chkDoor = false;
    storage.save();
    notificarUsuario("Mon. Porta DESLIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao");
  } else if (intencao == "reset_manual") {
    storage.resetMinMax(temperaturaAtual);
    notificarUsuario("Reset Max/Min", 5000);
    enviarDadosMqtt("RESET_MAX_MIN_MANUAL");
  } else {
    // Feedback Genérico para Debug Visual
    if (intencao.length() > 0) {
      String msgRef = "CMD: " + intencao;
      notificarUsuario(msgRef, 4000);
    }
    enviarDadosMqtt("FEEDBACK_COMANDO_GENERICO");
  }

  // Os outros comandos (habilitar/desabilitar/calibrar) já enviam seu próprio
  // feedback via MQTT. enviarDadosMqtt("feedback_comando"); // REMOVIDO PARA
  // EVITAR MENSAGENS DUPLICADAS NO WHATSAPP
}

// ---------- ENVIA DADOS PARA O DASHBOARD WEB (REAL-TIME) ----------
void enviarDadosWeb() {
  if (!network.isConnected())
    return;

  StaticJsonDocument<512> doc;
  doc["ID_DISPOSITIVO"] = getIdDispositivo();
  doc["DISPOSITIVO"] = storage.data.deviceName;
  doc["EMPRESA"] = storage.data.companyName;
  doc["ALA"] = storage.data.deviceLocation;
  doc["TIPO"] = "REALTIME";
  doc["TEMP_C"] = serialized(String(temperaturaAtual, 1));
  doc["TEMP_MAX"] = serialized(String(storage.data.tempMaxRec, 1));
  doc["TEMP_MIN"] = serialized(String(storage.data.tempMinRec, 1));
  doc["VOLTAGEM"] = serialized(String(voltSensor.getVoltage(), 1));
  doc["BATERIA"] = serialized(String(voltSensor.getBatteryVoltage(), 2));
  doc["ALARM_MAX"] = serialized(String(storage.data.alarmMax, 1));
  doc["ALARM_MIN"] = serialized(String(storage.data.alarmMin, 1));
  doc["VOLT_MAX_LIMIT"] = serialized(String(storage.data.voltMax, 1));
  doc["VOLT_MIN_LIMIT"] = serialized(String(storage.data.voltMin, 1));
  doc["BAT_MIN_LIMIT"] = serialized(String(storage.data.batMinLimit, 1));
  doc["TEMPO_PORTA"] = storage.data.doorMaxTime;

  // Dados do Sensor Ambiente (DHT11)
  doc["TEMP_EXTERNA"] = serialized(String(ambientSensor.getTemperature(), 1));
  doc["UMIDADE"] = serialized(String(ambientSensor.getHumidity(), 1));

  doc["RELE"] = releLigado;
  doc["MODO"] = modoManual ? "MANUAL" : "AUTO";
  doc["SILENCIADO"] = alertasSilenciados;
  doc["RSSI"] = network.getRSSI();
  doc["IP_LOCAL"] = WiFi.localIP().toString();
  doc["UPTIME"] = millis() / 1000;
  doc["PROTOCOLO"] = "MQTT/WSS";

  // Status da Porta
  bool portaAberta = (digitalRead(PIN_DOOR) == HIGH);
  doc["PORTA_ABERTA"] = portaAberta;
  doc["SEC_ABERTA"] =
      (doorOpenStart > 0) ? (uint32_t)((millis() - doorOpenStart) / 1000) : 0;

  JsonObject saude = doc.createNestedObject("SAUDE_SENSORES");
  saude["DS18B20"] = (temperaturaAtual > -50 && temperaturaAtual < 80);
  saude["DHT11"] = ambientSensor.isValid();
  saude["ZMPT"] = true;
  saude["BATERIA"] = (voltSensor.getBatteryVoltage() > 0);
  saude["PORTA"] = true;

  // Timestamp
  struct tm ti;
  if (getLocalTime(&ti)) {
    char h[10];
    strftime(h, sizeof(h), "%H:%M:%S", &ti);
    doc["HORA"] = h;
  }

  String payload;
  serializeJson(doc, payload);
  network.publish(MSG_TOPIC_WEB_STATUS, payload);
}

// ---------- ENVIA DADOS COMPLETOS PARA MQTT ----------
void enviarDadosMqtt(String evento) {
  Serial.println(
      "[DATA] enviarDadosMqtt chamada - evento: " + evento +
      " | conectado: " + String(network.isConnected() ? "SIM" : "NAO"));
  if (!network.isConnected()) {
    Serial.println("[DATA] ABORTADO: MQTT nao conectado!");
    return;
  }

  StaticJsonDocument<1024> doc;
  doc["ID_DISPOSITIVO"] = getIdDispositivo();
  doc["DISPOSITIVO"] = storage.data.deviceName;
  doc["EMPRESA"] = storage.data.companyName;
  doc["ALA"] = storage.data.deviceLocation;
  doc["TIPO"] = evento;

  // Feedback sonoro LOCAL para alertas (SEMPRE, antes de qualquer bloqueio)
  if (evento.startsWith("ALERTA_") && !alertasSilenciados) {
    emitirBipe(300, 2);

    // Exibe mensagem de alerta no Display por 5 segundos
    String msgAlerta = "";
    if (evento == "ALERTA_TEMP_ALTA")
      msgAlerta = "TEMP. MUITO ALTA";
    else if (evento == "ALERTA_TEMP_BAIXA")
      msgAlerta = "TEMP. MUITO BAIXA";
    else if (evento == "ALERTA_FALTA_ENERGIA")
      msgAlerta = "FALTA DE ENERGIA";
    else if (evento == "ALERTA_BATERIA_BAIXA")
      msgAlerta = "BATERIA FRACA";
    else if (evento == "ALERTA_PORTA_ABERTA")
      msgAlerta = "PORTA ABERTA";
    else if (evento == "ALERTA_TENSAO_ALTA")
      msgAlerta = "VOLTAGEM ALTA";
    else if (evento == "ALERTA_TENSAO_BAIXA")
      msgAlerta = "VOLTAGEM BAIXA";

    if (msgAlerta != "") {
      display.showMessage(msgAlerta, 5000);
    }
  }

  // Lógica de Silêncio: Se não vinculado, bloqueia apenas envio remoto
  // (n8n/Supabase/WhatsApp)
  if (!isDeviceLinked()) {
    if (evento.startsWith("ALERTA_") || evento == "periodico" ||
        evento == "periodico_suporte" || evento == "relatorio_diario") {
      Serial.println("[SILENCIO] Bloqueado envio remoto: Dispositivo nao "
                     "vinculado (Empresa: " +
                     String(storage.data.companyName) + ")");
      return;
    }
  }

  // Dados de Sensores Formatados
  doc["TEMP_C"] = serialized(String(temperaturaAtual, 1));
  doc["TEMP_MAX"] = serialized(String(storage.data.tempMaxRec, 1));
  doc["TEMP_MIN"] = serialized(String(storage.data.tempMinRec, 1));

  // Limites Configurados (Envia em status, configuração, relatórios periódicos
  // e ALERTAS para o n8n/IA saber o contexto)
  if (evento == "STATUS_SOLICITADO" || evento == "feedback_configuracao" ||
      evento == "periodico" || evento.startsWith("ALERTA_")) {
    doc["ALARM_MAX"] = serialized(String(storage.data.alarmMax, 1));
    doc["ALARM_MIN"] = serialized(String(storage.data.alarmMin, 1));
    doc["VOLT_MAX_LIMIT"] = serialized(String(storage.data.voltMax, 1));
    doc["VOLT_MIN_LIMIT"] = serialized(String(storage.data.voltMin, 1));
    doc["BAT_MIN_LIMIT"] = serialized(String(storage.data.batMinLimit, 1));
  }

  doc["VOLTAGEM"] = serialized(String(voltSensor.getVoltage(), 1));
  doc["BATERIA"] = serialized(String(voltSensor.getBatteryVoltage(), 2));
  doc["CHK_VOLT"] = storage.data.chkVolt;
  doc["CHK_BAT"] = storage.data.chkBat;
  doc["CHK_DOOR"] = storage.data.chkDoor;

  // Sensor Ambiente (DHT11)
  if (evento == "STATUS_SOLICITADO" || evento == "periodico_suporte") {
    doc["TEMP_EXTERNA"] = serialized(String(ambientSensor.getTemperature(), 1));
    doc["UMIDADE"] = serialized(String(ambientSensor.getHumidity(), 1));
  }

  // Inclui campos alterados no feedback de configuracao
  if (evento == "feedback_configuracao" &&
      ultimosCamposAlterados.length() > 0) {
    doc["CAMPOS_ALTERADOS"] = ultimosCamposAlterados;
    ultimosCamposAlterados = "";
  }

  // Estado da Porta, RSSI e Saúde apenas se solicitado
  if (evento == "STATUS_SOLICITADO") {
    doc["PORTA"] = digitalRead(PIN_DOOR) == HIGH ? "ABERTA" : "FECHADA";
    doc["RSSI"] = network.getRSSI();

    JsonObject saude = doc.createNestedObject("SAUDE_SENSORES");
    saude["DS18B20"] = (temperaturaAtual > -50 && temperaturaAtual < 80);
    saude["DHT11"] = ambientSensor.isValid();
    saude["ZMPT"] = true;
    saude["BATERIA"] = (voltSensor.getBatteryVoltage() > 0);
    saude["PORTA"] = true;
  }

  // Timestamp
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char dStr[20], hStr[10];
    strftime(dStr, sizeof(dStr), "%d/%m/%Y", &timeinfo);
    strftime(hStr, sizeof(hStr), "%H:%M:%S", &timeinfo);
    doc["DATA"] = dStr;
    doc["HORA"] = hStr;
  }

  // Inclui remoteJid se disponivel (para roteamento de resposta de comandos)
  if (ultimoRemoteJid.length() > 0) {
    doc["REMOTE_JID"] = ultimoRemoteJid;
  }

  // Publica no tópico de DADOS (telemetria tradicional/n8n)
  String payload;
  serializeJson(doc, payload);
  network.publish(MSG_TOPIC_DATA, payload);

  // Broadcast para o Dashboard Web (Real-time)
  network.publish(MSG_TOPIC_WEB_STATUS, payload);
}

// ---------- ENVIA DADOS PARA O DASHBOARD (PERIÓDICO 1 MIN) ----------
void enviarDadosDashboard() {
  if (!network.isConnected())
    return;

  // Se não vinculado, não envia para o dashboard global (n8n)
  if (!isDeviceLinked())
    return;

  StaticJsonDocument<512> doc;
  doc["ID_DISPOSITIVO"] = getIdDispositivo();
  doc["DISPOSITIVO"] = storage.data.deviceName;
  doc["EMPRESA"] = storage.data.companyName;
  doc["TIPO"] = "DASHBOARD_PERIODIC";
  doc["TEMP_C"] = serialized(String(temperaturaAtual, 1));
  doc["TEMP_MAX"] = serialized(String(storage.data.tempMaxRec, 1));
  doc["TEMP_MIN"] = serialized(String(storage.data.tempMinRec, 1));
  doc["CPU_TEMP"] = 0; // Nao disponivel
  doc["TENSAO"] = serialized(String(voltSensor.getVoltage(), 1));
  doc["UPTIME_MIN"] = millis() / 60000;
  doc["WIFI_RSSI"] = network.getRSSI();
  doc["RELE_STATUS"] = digitalRead(RELAY_PIN) == LOW ? "ON" : "OFF";
  doc["UPTIME"] = millis() / 1000;
  doc["PROTOCOLO"] = "MQTT/WSS";

  JsonObject saude = doc.createNestedObject("SAUDE_SENSORES");
  saude["DS18B20"] = (temperaturaAtual > -50 && temperaturaAtual < 80);
  saude["DHT11"] = ambientSensor.isValid();
  saude["ZMPT"] = true;
  saude["BATERIA"] = (voltSensor.getBatteryVoltage() > 0);
  saude["PORTA"] = true;

  // Timestamp
  struct tm ti;
  if (getLocalTime(&ti)) {
    char h[10];
    strftime(h, sizeof(h), "%H:%M:%S", &ti);
    doc["HORA"] = h;
  }

  String payload;
  serializeJson(doc, payload);
  network.publish(MSG_TOPIC_DASHBOARD, payload);
}

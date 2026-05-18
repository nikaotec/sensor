#include "main.h"
#include "AlertManager.h"
#include "config/Config.h"
#include "display/DisplayManager.h"
#include "mqtt/MqttManager.h"
#include "ota/OtaManager.h"
#include "sensors/AmbientSensor.h"
#include "sensors/BatterySensor.h"
#include "sensors/VoltageSensor.h"
#include "storage/StorageManager.h"
#include "utils/ButtonManager.h"
#include <ArduinoJson.h>
#include <DallasTemperature.h>
#include <EEPROM.h>
#include <OneWire.h>
#include <WiFi.h>
#include <Wire.h>

// ---------- OBJETOS GLOBAIS ----------
StorageManager storage;
DisplayManager display;
MqttManager mqtt;
OtaManager ota;
ButtonManager buttons;
// RelayService relays foi removido, usamos storage.data.relays diretamente.

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
bool releEstado[RELAY_COUNT] = {false, false, false,
                                false}; // Estado dos 4 relés
bool modoManual = false;
bool alertasSilenciados =
    false; // Novo flag para silenciar alertas persistentes
unsigned long manualTimeout = 0;
String statusSeguranca = "OK";
String ultimoRemoteJid = "";        // remoteJid do ultimo comando recebido
String ultimosCamposAlterados = ""; // Campos alterados na ultima configuracao
int qtdSensoresDs18b20 = 0;         // Quantidade de sensores DS18B20 conectados

// ---------- TIMERS ----------
unsigned long lastTempCheck = 0;
unsigned long lastReportTime = 0;      // Novo Timer
unsigned long lastWebReport = 0;       // Timer para Dashboard Web
unsigned long lastDashboardReport = 0; // Timer para Dashboard Especial (1 min)
unsigned long lastSupportReport = 0;   // Timer relatorio suporte (1h)
unsigned long lastReportDay = -1;
unsigned long doorOpenStart = 0; // Início do tempo de porta aberta

// ...

void enviarDadosMqtt(String evento, bool isRepeat = false);
void enviarDadosDashboard();
void enviarDadosWeb();
void notificarUsuario(String mensagem, int tempo = 4000);
bool isDeviceLinked();
void handleCommand(String intent, JsonObject params); // Forward declaration

// ---------- FUNÇÕES AUXILIARES ----------
void emitirBipe(int tempo = 100, int repeticoes = 1, int pausa = 100) {
  for (int i = 0; i < repeticoes; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(tempo);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < repeticoes - 1)
      delay(pausa);
  }
}

// Bipes específicos para temperatura e porta (500ms ON, 300ms OFF)
void emitirBipeAlertaCritico(int repeticoes = 2) {
  for (int i = 0; i < repeticoes; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(500);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < repeticoes - 1)
      delay(300);
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

// ---------- HELPERS ----------
// Verifica se o dispositivo está vinculado a uma empresa real
bool isDeviceLinked() {
  String comp = String(storage.data.companyName);
  comp.trim();
  comp.toLowerCase();
  if (comp == "" || comp == "unknown" || comp == "empresa_default") {
    return false;
  }
  return true;
}

// Notifica o usuário via Display + MQTT simultaneamente
void notificarUsuario(String mensagem, int tempo) {
  display.showMessage(mensagem, tempo);
  emitirBipe(100);

  StaticJsonDocument<256> doc;
  doc["TIPO"] = "MENSAGEM_DISPLAY";
  doc["CONTEUDO"] = mensagem;
  doc["HORA"] = mqtt.getCurrentTime();
  doc["DISPOSITIVO"] = storage.data.deviceName;
  doc["ID_DISPOSITIVO"] = getIdDispositivo();
  doc["EMPRESA"] = storage.data.companyName;
  doc["ALA"] = storage.data.deviceLocation;

  String output;
  serializeJson(doc, output);
  mqtt.publish(MSG_TOPIC_WEB_STATUS, output);
}

// ---------- LOOP ----------
void firmware_loop() {
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
        bool relayStatus = releEstado[0];
        int res =
            display.menuEnter(storage.data.alarmMax, storage.data.alarmMin,
                              storage.data.chkVolt, relayStatus);
        if (res == 1) {
          // Se alterou algum parâmetro, salva
          storage.save();
          enviarDadosMqtt("feedback_configuracao");

          // Trata teste de relé especificamente
          if (relayStatus != releEstado[0]) {
            releEstado[0] = relayStatus;
            digitalWrite(RELAY_PINS[0], releEstado[0] ? HIGH : LOW);
            modoManual = true; // Força modo manual para teste
          }
        } else if (res == 2) {
          // RESET WIFI
          display.showMessage("RESETANDO WIFI...", 3000);
          mqtt.resetWifi();
        }
      }
    }
  }

  // 1. Atualizar Rede
  mqtt.update();

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

  // 2. Ler Sensores (a cada 1s para bipes mais frequentes)
  if (now - lastTempCheck > 1000) {
    lastTempCheck = now;

    sensors.requestTemperatures();
    float tempBruta = sensors.getTempCByIndex(0);
    temperaturaAtual = tempBruta + storage.data.tempCalOffset;
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
        (storage.data.chkTemp && (temperaturaAtual > storage.data.alarmMax ||
                                  temperaturaAtual < storage.data.alarmMin)) ||
        (storage.data.chkVolt &&
         (tVoltagem > storage.data.voltMax ||
          tVoltagem < storage.data.voltMin || tVoltagem < VOLT_OUTAGE_THR)) ||
        (storage.data.chkBat && (tBateria < storage.data.batMinLimit)) ||
        (storage.data.chkDoor && isDoorOpen);

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
    // 0. Verifica timeout do modo manual (restaura após 5 minutos)
    if (modoManual && (now - manualTimeout > 300000)) {
      modoManual = false;
      display.showMessage("Aviso: M. Auto Retomado", 4000);
      enviarDadosMqtt("MODO_AUTOMATICO_RETOMADO_TIMEOUT");
      Serial.println("[TIMER] Modo Manual expirado, retornando ao automático");
    }

    if (!modoManual) {
      // --- LÓGICA DE CONTROLE DOS RELÉS (HISTERESE E MANUAL) ---
      if (temperaturaAtual > -50 && temperaturaAtual < 80) {
        for (int i = 0; i < RELAY_COUNT; i++) {
          RelayConfig &relay = storage.data.relays[i];
          bool anterior = releEstado[i];

          if (relay.func == RELAY_FUNC_AUTO) {
            // Histerese: Liga se >= max, Desliga se <= min
            if (temperaturaAtual >= relay.tempOn) {
              releEstado[i] = true;
            } else if (temperaturaAtual <= relay.tempOff) {
              releEstado[i] = false;
            }
          } else if (relay.func == RELAY_FUNC_MANUAL) {
            releEstado[i] = relay.manualState;
          } else {
            releEstado[i] = false; // DESLIGADO
          }

          // Aplica ao hardware se o estado mudou
          digitalWrite(RELAY_PINS[i], releEstado[i] ? HIGH : LOW);

          if (releEstado[i] != anterior) {
            Serial.print(F("[RELE] R"));
            Serial.print(i);
            Serial.println(releEstado[i] ? F(" LIGADO") : F(" DESLIGADO"));
          }
        }
      }

      // 1. Declaração de status de temperatura
      AlertStatus stMax = alertTempMax.check(
          storage.data.chkTemp && (temperaturaAtual >= storage.data.alarmMax));
      AlertStatus stMin = alertTempMin.check(
          storage.data.chkTemp && (temperaturaAtual <= storage.data.alarmMin));

      // 2. Falta de Energia
      AlertStatus stPower = alertPower.check(storage.data.chkVolt &&
                                             (tVoltagem < VOLT_OUTAGE_THR));
      if (stPower == ALERT_STARTED) {
        enviarDadosMqtt("ALERTA_FALTA_ENERGIA", false);
        notificarUsuario("FALTA ENERGIA", 6000);
      } else if (stPower == ALERT_REPEATED && !alertasSilenciados) {
        enviarDadosMqtt("ALERTA_FALTA_ENERGIA", true);
      }

      if (stPower == ALERT_NORMALIZED) {
        enviarDadosMqtt("ENERGIA_RESTABELECIDA", false);
        notificarUsuario("ENERGIA OK", 4000);
      }

      // 3. Bateria Baixa
      AlertStatus stBat = alertBatLow.check(
          storage.data.chkBat && (tBateria < storage.data.batMinLimit));
      if (stBat == ALERT_STARTED) {
        enviarDadosMqtt("ALERTA_BATERIA_BAIXA", false);
        notificarUsuario("BATERIA FRACA", 6000);
      } else if (stBat == ALERT_REPEATED && !alertasSilenciados) {
        enviarDadosMqtt("ALERTA_BATERIA_BAIXA", true);
      }

      if (stBat == ALERT_NORMALIZED) {
        enviarDadosMqtt("BATERIA_NORMALIZADA", false);
        notificarUsuario("BATERIA OK", 4000);
      }

      // 4. Porta
      AlertStatus stDoor = alertDoor.check(storage.data.chkDoor && isDoorOpen);

      // Registro Único no DB
      if (stDoor == ALERT_STARTED) {
        enviarDadosMqtt("ALERTA_PORTA_ABERTA", false);
        notificarUsuario("PORTA ABERTA", 6000);
      }

      // Envio de repetições locais removidos. Som acontece na central do loop.
      if (!alertasSilenciados && stDoor == ALERT_REPEATED) {
        enviarDadosMqtt("ALERTA_PORTA_ABERTA", true);
      }

      if (stDoor == ALERT_NORMALIZED) {
        enviarDadosMqtt("PORTA_FECHADA", false);
        notificarUsuario("PORTA FECHADA", 4000);
      }

      // 5. Tensão da Rede
      bool activeVoltMonitoring =
          storage.data.chkVolt && (tVoltagem > VOLT_OUTAGE_THR);
      AlertStatus stVoltMax = alertVoltMax.check(
          activeVoltMonitoring && (tVoltagem > storage.data.voltMax));
      AlertStatus stVoltMin = alertVoltMin.check(
          activeVoltMonitoring && (tVoltagem < storage.data.voltMin));

      if (stVoltMax == ALERT_STARTED) {
        enviarDadosMqtt("ALERTA_TENSAO_ALTA", false);
        notificarUsuario("TENSAO ALTA", 6000);
      } else if (stVoltMax == ALERT_REPEATED && !alertasSilenciados) {
        enviarDadosMqtt("ALERTA_TENSAO_ALTA", true);
      }
      if (stVoltMax == ALERT_NORMALIZED) {
        enviarDadosMqtt("TENSAO_NORMALIZADA", false);
        notificarUsuario("TENSAO OK", 4000);
      }

      if (stVoltMin == ALERT_STARTED) {
        enviarDadosMqtt("ALERTA_TENSAO_BAIXA", false);
        notificarUsuario("TENSAO BAIXA", 6000);
      } else if (stVoltMin == ALERT_REPEATED && !alertasSilenciados) {
        enviarDadosMqtt("ALERTA_TENSAO_BAIXA", true);
      }
      if (stVoltMin == ALERT_NORMALIZED) {
        enviarDadosMqtt("TENSAO_NORMALIZADA", false);
        notificarUsuario("TENSAO OK", 4000);
      }

      // 6. Temperatura Alerts
      if (stMax == ALERT_STARTED) {
        statusSeguranca = "QUENTE!";
        enviarDadosMqtt("ALERTA_TEMP_ALTA", false);
        notificarUsuario("TEMP. ALTA!", 8000);
      } else if (stMax == ALERT_REPEATED && !alertasSilenciados) {
        enviarDadosMqtt("ALERTA_TEMP_ALTA", true);
      }

      if (stMin == ALERT_STARTED) {
        statusSeguranca = "FRIO!";
        enviarDadosMqtt("ALERTA_TEMP_BAIXA", false);
        notificarUsuario("TEMP. BAIXA!", 8000);
      } else if (stMin == ALERT_REPEATED && !alertasSilenciados) {
        enviarDadosMqtt("ALERTA_TEMP_BAIXA", true);
      }

      // Verifica Normalização Temperatura
      if (stMax == ALERT_NORMALIZED || stMin == ALERT_NORMALIZED) {
        statusSeguranca = "OK";
        enviarDadosMqtt("TEMP_NORMALIZADA", false);
        notificarUsuario("TEMP. NORMAL", 4000);
      }
    }

    // 3. Reset Diário 06:00 e 16:00
    struct tm t;
    if (getLocalTime(&t)) {
      // Check if hour changed to avoid multiple triggers within the same hour
      static int lastReportHour = -1;
      if ((t.tm_hour == 8 || t.tm_hour == 16) && t.tm_hour != lastReportHour) {
        lastReportHour = t.tm_hour;
        enviarDadosMqtt("relatorio_diario", false);
        storage.resetMinMax(temperaturaAtual);
        display.showMessage("Reset Diario", 5000);
      }
      // Update tracking variable when hour changes (to allow re-trigger next
      // day)
      if (t.tm_hour != 8 && t.tm_hour != 16) {
        lastReportHour = -1;
      }
    }

    // 3.1. Relatório Periódico de Telemetria (hora cheia para log histórico
    // no Firestore)
    if (!modoManual) {
      static int lastProcessedHour = -1;
      if (t.tm_hour != lastProcessedHour) {
        lastProcessedHour = t.tm_hour;
        // Se já enviou relatorio_diario nesta hora (8 ou 16), o periodico é
        // redundante por que o relatorio_diario já contém todos os campos e é
        // salvo pelo n8n.
        if (t.tm_hour != 8 && t.tm_hour != 16) {
          enviarDadosMqtt("periodico", false);
        }
      }
    }

    // 3.2. Relatorio de suporte (hora em hora)
    if (!modoManual && (now - lastSupportReport >= 3600000UL)) {
      lastSupportReport = now;
      enviarDadosMqtt("periodico_suporte", false);
    }

    // 3.3. Feedback Sonoro Local Contínuo
    if (!alertasSilenciados) {
      if (alertTempMax.isActive() || alertTempMin.isActive() ||
          alertDoor.isActive()) {
        emitirBipeAlertaCritico(1);
      } else if (alertVoltMax.isActive() || alertVoltMin.isActive() ||
                 alertBatLow.isActive() || alertPower.isActive()) {
        emitirBipe(300, 1, 100);
      }
    }

    // 4. Atualizar Display
    display.update(temperaturaAtual, storage.data.tempMaxRec,
                   storage.data.tempMinRec, voltSensor.getVoltage(),
                   mqtt.isWifiConnected(), modoManual, releEstado[0],
                   (alertTempMax.isActive() || alertTempMin.isActive() ||
                    alertVoltMax.isActive() || alertVoltMin.isActive() ||
                    alertBatLow.isActive() || alertPower.isActive() ||
                    alertDoor.isActive()));
  }
}

// ---------- SETUP ----------
void firmware_setup() {
  Serial.begin(115200);

  // Inicializa Hardware - 4 relés
  for (int i = 0; i < RELAY_COUNT; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], LOW);
  }
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  emitirBipe(200, 2); // Feedback de inicialização

  // I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(4000000);
  Wire.setTimeOut(1000);

  // Managers
  storage.begin();
  display.begin();
  mqtt.begin(handleCommand);
  ota.begin([](int p) {
    mqtt.publishProgress(p);
    mqtt.update(); // Keep MQTT alive during blocking OTA
    display.showOtaProgress(p);
  });
  buttons.begin();

  // Configurações Iniciais
  alertDoor.setDebounce(storage.data.doorMaxTime * 1000);

  // Sensores
  sensors.begin();
  sensors.setWaitForConversion(false);
  qtdSensoresDs18b20 = sensors.getDeviceCount();
  Serial.println("Sensores DS18B20 encontrados: " + String(qtdSensoresDs18b20));

  ambientSensor.begin();
  pinMode(PIN_DOOR, INPUT_PULLUP);

  voltSensor.setCalibration(storage.data.voltCalFactor);
  voltSensor.setBatteryConfig(PIN_BATTERY, storage.data.batCalFactor);
  voltSensor.begin();

  configTime(-3 * 3600, 0, "pool.ntp.org");
  Serial.printf("Sistema Iniciado (Modular) - Versao: %s\n", FIRMWARE_VERSION);
}

// ---------- CALLBACK MQTT ----------
void handleCommand(String intent, JsonObject params) {
  bool isAdmin = params["is_admin"] | false;

  // Salva remoteJid para incluir nas respostas
  if (params.containsKey("remoteJid")) {
    ultimoRemoteJid = params["remoteJid"].as<String>();
  }

  Serial.println("[MQTT RX] Intencao: " + intent +
                 " | Admin: " + String(isAdmin ? "SIM" : "NAO") +
                 " | RemoteJid: " + ultimoRemoteJid);

  // 1. Comando de OTA (Update Remoto)
  if (intent == "otaupdate") {
    String url = params["url"] | "";
    String hash = params["hash"] | "";

    Serial.printf("[OTA] Debug - Intent: %s, URL: %s, Hash: %s\n",
                  intent.c_str(), url.c_str(), hash.c_str());

    if (url != "") {
      Serial.println("[OTA] Comando recebido. Iniciando update...");
      if (ota.startOTA(url, FIRMWARE_VERSION, hash)) {
        mqtt.publishOtaSuccess(FIRMWARE_VERSION);
        mqtt.update(); // Flush MQTT
        delay(2000);
        ota.rebootDevice();
      } else {
        mqtt.publishOtaError(ota.getLastError());
      }
    } else {
      mqtt.publishOtaError("URL ausente");
      Serial.println("[OTA] Erro: URL ausente no comando.");
    }
    return;
  }

  // --- VERIFICAÇÃO DE AUTORIZAÇÃO ---
  if (intent != "" && intent != "obter_status_atual" &&
      intent != "obter_ambiente") {
    if (!isAdmin) {
      Serial.println("[MQTT RX] BLOQUEADO - Usuario nao autorizado");
      enviarDadosMqtt("ERRO_NAO_AUTORIZADO", false);
      return;
    }
  }

  // --- MODO MANUTENÇÃO ---
  if (modoManual && intent != "modo_manutencao" &&
      intent != "modo_operacional") {
    Serial.println("[MQTT RX] BLOQUEADO - Dispositivo em manutenção");
    enviarDadosMqtt("EM_MANUTENCAO", false);
    return;
  }

  if (intent == "configurar_limites") {
    bool alterouTemp = false;
    bool alterouTensao = false;
    bool alterouBat = false;
    bool alterouPorta = false;

    if (params.containsKey("temp_max")) {
      storage.data.alarmMax = params["temp_max"];
      alterouTemp = true;
    }
    if (params.containsKey("temp_min")) {
      storage.data.alarmMin = params["temp_min"];
      alterouTemp = true;
    }
    if (params.containsKey("volt_max")) {
      storage.data.voltMax = params["volt_max"];
      alterouTensao = true;
    }
    if (params.containsKey("volt_min")) {
      storage.data.voltMin = params["volt_min"];
      alterouTensao = true;
    }
    if (params.containsKey("bat_min")) {
      storage.data.batMinLimit = params["bat_min"];
      alterouBat = true;
    }
    if (params.containsKey("tempo_porta")) {
      storage.data.doorMaxTime = params["tempo_porta"];
      alertDoor.setDebounce(storage.data.doorMaxTime * 1000);
      alterouPorta = true;
    }

    if (alterouTemp || alterouTensao || alterouBat || alterouPorta) {
      storage.save();
      ultimosCamposAlterados = String(alterouTemp ? "ALARM," : "") +
                               String(alterouTensao ? "VOLT," : "") +
                               String(alterouBat ? "BAT," : "") +
                               String(alterouPorta ? "DOOR," : "");
      enviarDadosMqtt("feedback_configuracao", false);

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
  } else if (intent == "modo_manutencao") {
    // Apenas ATIVA manutenção
    if (!modoManual) {
      modoManual = true;
      display.showMessage("EM MANUTENCAO", 0); // Permanente no display
      enviarDadosMqtt("MANUTENCAO_ATIVADA", false);
    } else {
      // Já está em manutenção
      enviarDadosMqtt("EM_MANUTENCAO", false);
    }

  } else if (intent == "modo_operacional") {
    // Apenas DESATIVA manutenção
    if (modoManual) {
      modoManual = false;
      display.showMessage("OPERACIONAL", 0); // Permanente no display
      enviarDadosMqtt("MANUTENCAO_DESATIVADA", false);
    } else {
      // Já está operacional
      enviarDadosMqtt("feedback_comando", false);
    }

  } else if (intent == "silenciar_alarme") {
    alertasSilenciados =
        true; // Impede novos alertas persistentes até normalizar
    notificarUsuario("Alarme Silenciado", 3000);
    enviarDadosMqtt("ALARME_SILENCIADO", false);
  } else if (intent == "reativar_alarme") {
    alertasSilenciados = false;
    notificarUsuario("Alarme Reativado", 3000);
    enviarDadosMqtt("ALARME_REATIVADO", false);

  } else if (intent == "obter_status_atual") {
    enviarDadosMqtt("STATUS_SOLICITADO", false);

  } else if (intent == "obter_ambiente") {
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
    mqtt.publish(MSG_TOPIC_DATA, ambPayload.c_str());
  } else if (intent == "calibrar_tensao") {
    float novoFator = 0.0;
    bool calculoAuto = false;
    float tensaoAlvo = 0.0;

    // Opção 1: Calibração por Referência (Tensão Real)
    if (params.containsKey("nova_tensao")) {
      String tStr = params["nova_tensao"].as<String>();
      tStr.replace(",", "."); // Trata 220,5
      tensaoAlvo = tStr.toFloat();

      float tensaoAtual = voltSensor.getRawVoltage();
      float fatorAtual = storage.data.voltCalFactor;

      if (tensaoAtual > 10.0 && tensaoAlvo > 10.0) {
        novoFator = fatorAtual * (tensaoAlvo / tensaoAtual);
        calculoAuto = true;
      } else {
        notificarUsuario("Erro: Tensao Baixa/Zero", 4000);
        enviarDadosMqtt("ALERTA_ERRO_CALIBRACAO_TENSAO_BAIXA", false);
        return;
      }
    }
    // Opção 2: Fator Direto (Legado/Manual)
    else if (params.containsKey("novo_fator")) {
      // Lógica anterior
      if (params["novo_fator"].is<float>()) {
        novoFator = params["novo_fator"];
      } else if (params["novo_fator"].is<String>()) {
        novoFator = String(params["novo_fator"]).toFloat();
      }
    }

    Serial.print("DEBUG: Calib Fator Final: ");
    Serial.println(novoFator);

    if (novoFator > 5 && novoFator < 20000) {
      storage.data.voltCalFactor = novoFator;
      voltSensor.setCalibration(novoFator);
      storage.save();
      enviarDadosMqtt("feedback_calibracao_sucesso", false);

      if (calculoAuto) {
        String msg = "Calib: " + String(tensaoAlvo, 0) +
                     "V (F:" + String(novoFator, 1) + ")";
        notificarUsuario(msg, 5000);
      } else {
        notificarUsuario("Calib. Sucesso: " + String(novoFator, 1), 5000);
      }
    } else {
      notificarUsuario("Erro Calib: " + String(novoFator, 1), 5000);
      enviarDadosMqtt("ALERTA_ERRO_CALIBRACAO_FATOR", false);
    }
  } else if (intent == "calibrar_bateria") {
    float novoFator = 0.0;

    if (params.containsKey("nova_tensao")) {
      String tStr = params["nova_tensao"].as<String>();
      tStr.replace(",", ".");
      float tensaoAlvo = tStr.toFloat();
      float tensaoAtual = voltSensor.getBatteryVoltage();

      if (tensaoAtual > 1.0 && tensaoAlvo > 1.0) {
        novoFator = storage.data.batCalFactor * (tensaoAlvo / tensaoAtual);
      } else {
        notificarUsuario("Erro: Bat. Baixa/Zero", 4000);
        return;
      }
    } else if (params.containsKey("novo_fator")) {
      if (params["novo_fator"].is<float>()) {
        novoFator = params["novo_fator"];
      } else {
        novoFator = String(params["novo_fator"]).toFloat();
      }
    }

    if (novoFator > 0.1 && novoFator < 100.0) {
      storage.data.batCalFactor = novoFator;
      voltSensor.setBatteryCalibration(novoFator);
      storage.save();
      notificarUsuario("Bat Calib: " + String(novoFator, 2), 5000);
      enviarDadosMqtt("feedback_calibracao_bateria", false);
    } else {
      notificarUsuario("Erro Bat Cal: " + String(novoFator, 2), 5000);
    }
  } else if (intent == "vincular_dispositivo") {
    bool alterou = false;
    if (params.containsKey("nome")) {
      strncpy(storage.data.deviceName, params["nome"], 31);
      storage.data.deviceName[31] = '\0';
      alterou = true;
    }
    if (params.containsKey("empresa")) {
      strncpy(storage.data.companyName, params["empresa"], 31);
      storage.data.companyName[31] = '\0';
      alterou = true;
    }
    if (params.containsKey("ala")) {
      strncpy(storage.data.deviceLocation, params["ala"], 31);
      storage.data.deviceLocation[31] = '\0';
      alterou = true;
    }

    if (alterou) {
      storage.save();
      notificarUsuario("VINCULADO: " + String(storage.data.companyName), 5000);
      enviarDadosMqtt("feedback_vinculo", false);
      // Envia REALTIME imediato para atualizar dashboard
      enviarDadosWeb();
    }
  } else if (intent == "desvincular_dispositivo") {
    strncpy(storage.data.deviceName, DEFAULT_DEVICE_NAME, 31);
    strncpy(storage.data.companyName, DEFAULT_COMPANY_NAME, 31);
    strncpy(storage.data.deviceLocation, DEFAULT_DEVICE_LOCATION, 31);
    storage.data.deviceName[31] = '\0';
    storage.data.companyName[31] = '\0';
    storage.data.deviceLocation[31] = '\0';
    storage.save();
    notificarUsuario("DESVINCULADO", 5000);
    enviarDadosMqtt("feedback_desvinculo", false);
    enviarDadosWeb();
  } else if (intent == "ligar_rele") {
    // Determina qual rele (0 por padrão, ou especificado)
    int idx =
        params.containsKey("rele_index") ? params["rele_index"].as<int>() : 0;
    if (idx >= 0 && idx < RELAY_COUNT) {
      storage.data.relays[idx].manualState = true;
      storage.data.relays[idx].func = RELAY_FUNC_MANUAL;
      storage.save();
      String msg = "Rele " + String(idx + 1) + " LIGADO";
      notificarUsuario(msg, 5000);
      String resp = "RELE_" + String(idx) + "_ON";
      enviarDadosMqtt(resp, false);
    }
  } else if (intent == "desligar_rele") {
    int idx =
        params.containsKey("rele_index") ? params["rele_index"].as<int>() : 0;
    if (idx >= 0 && idx < RELAY_COUNT) {
      storage.data.relays[idx].manualState = false;
      storage.data.relays[idx].func = RELAY_FUNC_MANUAL;
      storage.save();
      String msg = "Rele " + String(idx + 1) + " DESLIGADO";
      notificarUsuario(msg, 5000);
      String resp = "RELE_" + String(idx) + "_OFF";
      enviarDadosMqtt(resp, false);
    }
  } else if (intent == "ativar_automatico") {
    modoManual = false;
    notificarUsuario("Modo AUTOMATICO", 5000);
    enviarDadosMqtt("MODO_AUTOMATICO_ATIVADO", false);
  } else if (intent == "configurar_rele") {
    int idx = params["rele_index"].as<int>();
    if (idx >= 0 && idx < RELAY_COUNT) {
      RelayConfig &r = storage.data.relays[idx];
      bool alterou = false;

      if (params.containsKey("temp_on")) {
        r.tempOn = params["temp_on"];
        alterou = true;
      }
      if (params.containsKey("temp_off")) {
        r.tempOff = params["temp_off"];
        alterou = true;
      }
      if (params.containsKey("funcao")) {
        r.func = params["funcao"];
        alterou = true;
      }
      if (params.containsKey("manual_state")) {
        r.manualState = params["manual_state"];
        alterou = true;
      }
      if (params.containsKey("nome")) {
        strncpy(r.name, params["nome"], 16);
        r.name[16] = '\0';
        alterou = true;
      }

      if (alterou) {
        storage.save();
        Serial.print(F("[MQTT] Configuração do relé "));
        Serial.print(idx);
        Serial.println(F(" atualizada e salva na EEPROM."));
        if (params.containsKey("temp_on"))
          Serial.println("  - Temp ON: " + String(r.tempOn));
        if (params.containsKey("temp_off"))
          Serial.println("  - Temp OFF: " + String(r.tempOff));
        if (params.containsKey("funcao"))
          Serial.println("  - Funcao: " + String(r.func));

        emitirBipe(100, 2); // Dois bipes curtos para confirmar configuração
      }

      String msg = "Rele " + String(idx + 1) + " config.";
      notificarUsuario(msg, 5000);
      String resp = "RELE_" + String(idx) + "_CONFIG_OK";
      enviarDadosMqtt(resp, false);
      enviarDadosWeb();
    }
  } else if (intent == "habilitar_tensao") {
    storage.data.chkVolt = true;
    storage.save();
    notificarUsuario("Mon. Tensao LIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao", false);
    enviarDadosWeb();
  } else if (intent == "desabilitar_tensao") {
    storage.data.chkVolt = false;
    storage.save();
    notificarUsuario("Mon. Tensao DESLIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao", false);
    enviarDadosWeb();
  } else if (intent == "habilitar_bateria") {
    storage.data.chkBat = true;
    storage.save();
    notificarUsuario("Mon. Bateria LIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao", false);
    enviarDadosWeb();
  } else if (intent == "desabilitar_bateria") {
    storage.data.chkBat = false;
    storage.save();
    notificarUsuario("Mon. Bateria DESLIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao", false);
    enviarDadosWeb();
  } else if (intent == "habilitar_porta") {
    storage.data.chkDoor = true;
    storage.save();
    notificarUsuario("Mon. Porta LIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao", false);
    enviarDadosWeb();
  } else if (intent == "desabilitar_porta") {
    storage.data.chkDoor = false;
    storage.save();
    notificarUsuario("Mon. Porta DESLIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao", false);
    enviarDadosWeb();
  } else if (intent == "habilitar_temperatura") {
    storage.data.chkTemp = true;
    storage.save();
    notificarUsuario("Mon. Temp LIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao", false);
    enviarDadosWeb();
  } else if (intent == "desabilitar_temperatura") {
    storage.data.chkTemp = false;
    storage.save();
    notificarUsuario("Mon. Temp DESLIGADO", 4000);
    enviarDadosMqtt("feedback_configuracao", false);
    enviarDadosWeb();
  } else if (intent == "calibrar_temperatura") {
    if (params.containsKey("nova_temperatura")) {
      float offset = params["nova_temperatura"].as<float>();
      storage.data.tempCalOffset = offset;
      storage.save();
      String msg = "Cal. Temp: " + String(offset, 1) + "C";
      notificarUsuario(msg, 4000);
    }
    enviarDadosMqtt("feedback_configuracao", false);
  } else if (intent == "reset_manual") {
    storage.resetMinMax(temperaturaAtual);
    notificarUsuario("Reset Max/Min", 5000);
    enviarDadosMqtt("RESET_MAX_MIN_MANUAL", false);
  } else if (intent == "alterar_nome") {
    if (params.containsKey("novo_nome")) {
      String novoNome = params["novo_nome"].as<String>();
      novoNome = novoNome.substring(0, 31);
      strncpy(storage.data.deviceName, novoNome.c_str(), 31);
      storage.data.deviceName[31] = '\0';
      storage.save();
      String msg = "Nome: " + String(storage.data.deviceName);
      notificarUsuario(msg, 5000);
      enviarDadosWeb();
      String feedbackMsg = "NOME_ALTERADO|" + String(storage.data.deviceName);
      enviarDadosMqtt(feedbackMsg, false);
    } else {
      enviarDadosMqtt("ERRO_NOME_FALTANDO", false);
    }
  } else {
    // Feedback Genérico para Debug Visual
    if (intent.length() > 0) {
      String msgRef = "CMD: " + intent;
      notificarUsuario(msgRef, 4000);
    }
    enviarDadosMqtt("FEEDBACK_COMANDO_GENERICO", false);
  }
}

// ---------- ENVIA DADOS PARA O DASHBOARD WEB (REAL-TIME) ----------
void enviarDadosWeb() {
  if (!mqtt.isConnected())
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
  doc["CHK_VOLT"] = storage.data.chkVolt;
  doc["CHK_BAT"] = storage.data.chkBat;
  doc["CHK_TEMP"] = storage.data.chkTemp;
  doc["CHK_DOOR"] = storage.data.chkDoor;

  // Dados do Sensor Ambiente (DHT11)
  doc["TEMP_EXTERNA"] = serialized(String(ambientSensor.getTemperature(), 1));
  doc["UMIDADE"] = serialized(String(ambientSensor.getHumidity(), 1));

  JsonObject relays = doc.createNestedObject("RELES");
  for (int i = 0; i < RELAY_COUNT; i++) {
    String key = "R" + String(i);
    relays[key] = releEstado[i];
  }

  // Dados de histerese do relé 0
  Serial.print(F("[ENVIAR_WEB] Histerese Rele 0 - tempOn: "));
  Serial.print(storage.data.relays[0].tempOn, 1);
  Serial.print(F(" | tempOff: "));
  Serial.print(storage.data.relays[0].tempOff, 1);
  Serial.print(F(" | func: "));
  Serial.println(storage.data.relays[0].func);

  doc["R0_TEMP_ON"] = serialized(String(storage.data.relays[0].tempOn, 1));
  doc["R0_TEMP_OFF"] = serialized(String(storage.data.relays[0].tempOff, 1));
  doc["R0_FUNC"] = storage.data.relays[0].func;
  doc["MODO"] = modoManual ? "MANUAL" : "AUTO";
  doc["SILENCIADO"] = alertasSilenciados;
  doc["RSSI"] = mqtt.getRSSI();
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
  saude["DS18B20_QTD"] = qtdSensoresDs18b20;
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
  mqtt.publish(MSG_TOPIC_WEB_STATUS, payload);
}

// ---------- ENVIA DADOS COMPLETOS PARA MQTT ----------
void enviarDadosMqtt(String evento, bool isRepeat) {
  Serial.println("[DATA] enviarDadosMqtt chamada - evento: " + evento +
                 " | conectado: " + String(mqtt.isConnected() ? "SIM" : "NAO"));
  if (!mqtt.isConnected()) {
    Serial.println("[DATA] ABORTADO: MQTT nao conectado!");
    return;
  }

  StaticJsonDocument<1024> doc;
  doc["ID_DISPOSITIVO"] = getIdDispositivo();
  doc["DISPOSITIVO"] = storage.data.deviceName;
  doc["EMPRESA"] = storage.data.companyName;
  doc["ALA"] = storage.data.deviceLocation;
  doc["TIPO"] = evento;
  doc["VERSION"] = FIRMWARE_VERSION;
  doc["IS_REPEAT"] = isRepeat;

  // Feedback local removido daqui e transferido para o loop principal.

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
  doc["TEMP"] = serialized(String(temperaturaAtual, 1)); // Compatibilidade n8n
  doc["TEMP_MAX"] = serialized(String(storage.data.tempMaxRec, 1));
  doc["TEMP_MIN"] = serialized(String(storage.data.tempMinRec, 1));

  // Limites Configurados (Envia em status, configuração, relatórios
  // periódicos e ALERTAS para o n8n/IA saber o contexto)
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
  doc["CHK_TEMP"] = storage.data.chkTemp;
  doc["CHK_DOOR"] = storage.data.chkDoor;
  doc["TEMP_CAL_OFFSET"] = storage.data.tempCalOffset;

  // Sensor Ambiente (DHT11)
  if (evento == "STATUS_SOLICITADO" || evento == "periodico_suporte") {
    doc["TEMP_EXTERNA"] = serialized(String(ambientSensor.getTemperature(), 1));
    doc["UMIDADE"] = serialized(String(ambientSensor.getHumidity(), 1));
  }

  // Dados de histerese do relé 0 (enviado em status e periódicos)
  if (evento == "STATUS_SOLICITADO" || evento == "periodico" ||
      evento == "periodico_suporte" || evento == "REALTIME" ||
      (evento.startsWith("RELE_") && evento.endsWith("_CONFIG_OK"))) {
    doc["R0_TEMP_ON"] = serialized(String(storage.data.relays[0].tempOn, 1));
    doc["R0_TEMP_OFF"] = serialized(String(storage.data.relays[0].tempOff, 1));
    doc["R0_FUNC"] = storage.data.relays[0].func;
  }

  // Inclui campos alterados no feedback de configuracao
  if (evento == "feedback_configuracao" &&
      ultimosCamposAlterados.length() > 0) {
    doc["CAMPOS_ALTERADOS"] = ultimosCamposAlterados;
    ultimosCamposAlterados = "";
  }

  // Dados comuns para todos os eventos
  doc["PORTA"] = digitalRead(PIN_DOOR) == HIGH ? "ABERTA" : "FECHADA";

  JsonObject reles = doc.createNestedObject("RELES");
  for (int i = 0; i < 4; i++) {
    reles["R" + String(i)] =
        digitalRead(RELAY_PINS[i]) == LOW ? "LIGADO" : "DESLIGADO";
  }

  // RSSI e Saúde apenas se solicitado (mantendo payload enxuto nos demais)
  if (evento == "STATUS_SOLICITADO") {
    doc["RSSI"] = mqtt.getRSSI();

    JsonObject saude = doc.createNestedObject("SAUDE_SENSORES");
    saude["DS18B20"] = (temperaturaAtual > -50 && temperaturaAtual < 80);
    saude["DS18B20_QTD"] = qtdSensoresDs18b20;
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
  mqtt.publish(MSG_TOPIC_DATA, payload);

  // Broadcast para o Dashboard Web (Real-time)
  mqtt.publish(MSG_TOPIC_WEB_STATUS, payload);
}

// ---------- ENVIA DADOS PARA O DASHBOARD (PERIÓDICO 1 MIN) ----------
void enviarDadosDashboard() {
  if (!mqtt.isConnected())
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
  doc["WIFI_RSSI"] = mqtt.getRSSI();
  doc["RELE_STATUS"] = digitalRead(RELAY_PINS[0]) == LOW ? "ON" : "OFF";
  doc["UPTIME"] = millis() / 1000;
  doc["PROTOCOLO"] = "MQTT/WSS";

  JsonObject saude = doc.createNestedObject("SAUDE_SENSORES");
  saude["DS18B20"] = (temperaturaAtual > -50 && temperaturaAtual < 80);
  saude["DS18B20_QTD"] = qtdSensoresDs18b20;
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
  mqtt.publish(MSG_TOPIC_DASHBOARD, payload);
}

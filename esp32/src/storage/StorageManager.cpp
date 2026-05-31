#include "StorageManager.h"

void StorageManager::begin() {
  EEPROM.begin(EEPROM_SIZE);
  load();
}

void StorageManager::load() {
  EEPROM.get(ADDR_MAX_REC, data.tempMaxRec);
  EEPROM.get(ADDR_MIN_REC, data.tempMinRec);
  EEPROM.get(ADDR_ALM_MAX, data.alarmMax);
  EEPROM.get(ADDR_ALM_MIN, data.alarmMin);
  EEPROM.get(ADDR_VOLT_MAX, data.voltMax);
  EEPROM.get(ADDR_VOLT_MIN, data.voltMin);
  EEPROM.get(ADDR_VOLT_CAL, data.voltCalFactor);
  EEPROM.get(ADDR_BAT_CAL, data.batCalFactor);
  EEPROM.get(ADDR_BAT_MIN, data.batMinLimit);
  EEPROM.get(ADDR_DOOR_TIME, data.doorMaxTime);
  EEPROM.get(ADDR_CHK_VOLT, data.chkVolt);
  EEPROM.get(ADDR_CHK_BAT, data.chkBat);
  EEPROM.get(ADDR_CHK_TEMP, data.chkTemp);
  EEPROM.get(ADDR_CHK_DOOR, data.chkDoor);
  EEPROM.get(ADDR_TEMP_CAL, data.tempCalOffset);
  EEPROM.get(ADDR_DEVICE_NAME, data.deviceName);
  EEPROM.get(ADDR_COMPANY_NAME, data.companyName);
  EEPROM.get(ADDR_DEVICE_LOCATION, data.deviceLocation);
  EEPROM.get(ADDR_PT100_OFFSET, data.pt100Offset);
  EEPROM.get(ADDR_SENSOR_TYPE, data.sensorType);
  EEPROM.get(ADDR_LIGHT_ENABLED, data.lightEnabled);
  EEPROM.get(ADDR_SENSOR_PIN_IDX, data.sensorPinIdx);
  EEPROM.get(ADDR_VERSION, data.version);
  EEPROM.get(ADDR_VOLT_RETURN_DELAY, data.voltReturnDelay);

  // Carregar relés (cada relé usa 32 bytes para evitar sobreposição)
  Serial.println("STORAGE: Carregando relés...");
  for (int i = 0; i < RELAY_COUNT; i++) {
    int addr = ADDR_RELAY_0 + (i * 32);

    // Ler valor atual da EEPROM
    RelayConfig tempRelay;
    EEPROM.get(addr, tempRelay);

    // Verificar se é válido (nome não pode ser FF ou vazio)
    bool nomeValido =
        tempRelay.name[0] != 0 && (uint8_t)tempRelay.name[0] != 0xFF;

    Serial.print("STORAGE R");
    Serial.print(i);
    Serial.print(" addr:");
    Serial.print(addr);
    Serial.print(" nome[0]:");
    Serial.print((int)tempRelay.name[0]);
    Serial.print(" valido:");
    Serial.println(nomeValido ? "SIM" : "NAO");

    if (nomeValido) {
      // Carregar valores válidos
      data.relays[i] = tempRelay;
      Serial.print("  -> Usando: ON=");
      Serial.print(data.relays[i].tempOn, 1);
      Serial.print(" OFF=");
      Serial.print(data.relays[i].tempOff, 1);
      Serial.print(" F=");
      Serial.println(data.relays[i].func);
    } else {
      // Inicializar com defaults e salvar
      data.relays[i].func = RELAY_FUNC_OFF;
      data.relays[i].tempOn = 0;
      data.relays[i].tempOff = 0;
      data.relays[i].manualState = false;
      strncpy(data.relays[i].name, i == 0 ? "Rele 1" : "Rele X", 16);
      data.relays[i].name[16] = '\0';

      EEPROM.put(addr, data.relays[i]);
      Serial.print("  -> Inicializado para: ON=0 OFF=0 F=0");
    }
  }
  EEPROM.commit();
  Serial.println("STORAGE: Carregamento completo!");

  // Validação e Valores Padrão
  if (isnan(data.voltCalFactor) || data.voltCalFactor < 10.0 ||
      data.voltCalFactor > 1000.0) {
    data.voltCalFactor = VOLTAGE_CALIBRATION_DEFAULT;
    EEPROM.put(ADDR_VOLT_CAL, data.voltCalFactor);
    EEPROM.commit();
  }

  if (isnan(data.batCalFactor) || data.batCalFactor <= 0.0 ||
      data.batCalFactor > 10.0) {
    data.batCalFactor = BATTERY_CALIBRATION_DEFAULT;
    EEPROM.put(ADDR_BAT_CAL, data.batCalFactor);
    EEPROM.commit();
  }

  if (isnan(data.batMinLimit) || data.batMinLimit < 9.0 ||
      data.batMinLimit > 15.0) {
    data.batMinLimit = BAT_MIN_DEFAULT;
    EEPROM.put(ADDR_BAT_MIN, data.batMinLimit);
    EEPROM.commit();
  }

  if (isnan(data.doorMaxTime) || data.doorMaxTime < 5 ||
      data.doorMaxTime > 300) {
    data.doorMaxTime = DOOR_TIME_DEFAULT;
    EEPROM.put(ADDR_DOOR_TIME, data.doorMaxTime);
    EEPROM.commit();
  }

  // Validação do novo atraso de relé: entre 0 e 600 segundos
  if (data.voltReturnDelay < 0 || data.voltReturnDelay > 600) {
    data.voltReturnDelay = VOLT_RETURN_DELAY_DEFAULT;
    EEPROM.put(ADDR_VOLT_RETURN_DELAY, data.voltReturnDelay);
    EEPROM.commit();
  }

  // chkTemp default = true
  if (data.chkTemp != true && data.chkTemp != false) {
    data.chkTemp = true;
    EEPROM.put(ADDR_CHK_TEMP, data.chkTemp);
    EEPROM.commit();
  }

  // tempCalOffset default = 0.0
  if (isnan(data.tempCalOffset)) {
    data.tempCalOffset = 0.0;
    EEPROM.put(ADDR_TEMP_CAL, data.tempCalOffset);
    EEPROM.commit();
  }

  if (isnan(data.alarmMax))
    data.alarmMax = 8.0;
  if (isnan(data.alarmMin))
    data.alarmMin = 2.5;
  if (isnan(data.voltMax))
    data.voltMax = 245.0;
  if (isnan(data.voltMin))
    data.voltMin = 190.0;

  if (isnan(data.tempMaxRec) || data.tempMaxRec > 80.0)
    data.tempMaxRec = -50.0;
  if (isnan(data.tempMinRec) || data.tempMinRec < -40.0 ||
      data.tempMinRec == 0.0) {
    data.tempMinRec = 100.0;
    EEPROM.put(ADDR_MIN_REC, data.tempMinRec);
    EEPROM.commit();
  }

  // Padrões para Strings
  if (data.deviceName[0] == 0 || (uint8_t)data.deviceName[0] == 0xFF) {
    strncpy(data.deviceName, "ESP32 Sensor", 31);
    data.deviceName[31] = '\0';
  }
  if (data.companyName[0] == 0 || (uint8_t)data.companyName[0] == 0xFF) {
    strncpy(data.companyName, "Nikaotec", 31);
    data.companyName[31] = '\0';
  }
  if (data.deviceLocation[0] == 0 || (uint8_t)data.deviceLocation[0] == 0xFF) {
    strncpy(data.deviceLocation, "Nao Definida", 31);
    data.deviceLocation[31] = '\0';
  }

  // Validação novos campos
  if (isnan(data.pt100Offset) || data.pt100Offset < -20.0 ||
      data.pt100Offset > 20.0) {
    data.pt100Offset = 0.0;
    EEPROM.put(ADDR_PT100_OFFSET, data.pt100Offset);
  }
  if (data.sensorType > 1) {
    data.sensorType = SENSOR_DS18B20;
    EEPROM.put(ADDR_SENSOR_TYPE, data.sensorType);
  }
  if (data.sensorPinIdx > 1) {
    data.sensorPinIdx = 0; // IN-1
    EEPROM.put(ADDR_SENSOR_PIN_IDX, data.sensorPinIdx);
  }
  // lightEnabled não precisa de validação complexa (bool)
  if (data.version[0] == 0 || (uint8_t)data.version[0] == 0xFF) {
    strncpy(data.version, FIRMWARE_VERSION, 15);
    data.version[15] = '\0';
    EEPROM.put(ADDR_VERSION, data.version);
  }

  // Padrões para relés (somente para nomes inválidos)
  for (int i = 0; i < RELAY_COUNT; i++) {
    if (data.relays[i].name[0] == 0 ||
        (uint8_t)data.relays[i].name[0] == 0xFF) {
      // Rele 0: desligado por padrão (será configurado via dashboard)
      if (i == 0) {
        strncpy(data.relays[i].name, "Rele 1", 16);
        data.relays[i].func = RELAY_FUNC_OFF;
        data.relays[i].tempOn = 0;
        data.relays[i].tempOff = 0;
      } else {
        // Outros relés: desativados por padrão
        strncpy(data.relays[i].name, "Rele X", 16);
        data.relays[i].func = RELAY_FUNC_OFF;
        data.relays[i].tempOn = 0;
        data.relays[i].tempOff = 0;
      }
      data.relays[i].manualState = false;
      // Salvar defaults apenas para relés inválidos
      int addr = ADDR_RELAY_0 + (i * 32);
      EEPROM.put(addr, data.relays[i]);
    }
  }
  EEPROM.commit(); // Commit único após todos os relés
}

void StorageManager::save() {
  Serial.println("STORAGE: save() iniciado");
  EEPROM.put(ADDR_ALM_MAX, data.alarmMax);
  EEPROM.put(ADDR_ALM_MIN, data.alarmMin);
  EEPROM.put(ADDR_VOLT_MAX, data.voltMax);
  EEPROM.put(ADDR_VOLT_MIN, data.voltMin);
  EEPROM.put(ADDR_VOLT_CAL, data.voltCalFactor);
  EEPROM.put(ADDR_BAT_CAL, data.batCalFactor);
  EEPROM.put(ADDR_BAT_MIN, data.batMinLimit);
  EEPROM.put(ADDR_DOOR_TIME, data.doorMaxTime);
  EEPROM.put(ADDR_CHK_VOLT, data.chkVolt);
  EEPROM.put(ADDR_CHK_BAT, data.chkBat);
  EEPROM.put(ADDR_CHK_TEMP, data.chkTemp);
  EEPROM.put(ADDR_CHK_DOOR, data.chkDoor);
  EEPROM.put(ADDR_TEMP_CAL, data.tempCalOffset);
  EEPROM.put(ADDR_DEVICE_NAME, data.deviceName);
  EEPROM.put(ADDR_COMPANY_NAME, data.companyName);
  EEPROM.put(ADDR_DEVICE_LOCATION, data.deviceLocation);
  EEPROM.put(ADDR_PT100_OFFSET, data.pt100Offset);
  EEPROM.put(ADDR_SENSOR_TYPE, data.sensorType);
  EEPROM.put(ADDR_LIGHT_ENABLED, data.lightEnabled);
  EEPROM.put(ADDR_SENSOR_PIN_IDX, data.sensorPinIdx);
  EEPROM.put(ADDR_VERSION, data.version);
  EEPROM.put(ADDR_VOLT_RETURN_DELAY, data.voltReturnDelay);

  // Salvar relés (cada relé usa 32 bytes para evitar sobreposição)
  for (int i = 0; i < RELAY_COUNT; i++) {
    int addr = ADDR_RELAY_0 + (i * 32); // 32 bytes por relé
    Serial.print("STORAGE: Salvando R");
    Serial.print(i);
    Serial.print(" no addr ");
    Serial.print(addr);
    Serial.print(" ON=");
    Serial.print(data.relays[i].tempOn, 1);
    Serial.print(" OFF=");
    Serial.print(data.relays[i].tempOff, 1);
    Serial.print(" F=");
    Serial.println(data.relays[i].func);
    EEPROM.put(addr, data.relays[i]);
  }

  EEPROM.commit();
  Serial.println("STORAGE: save() completo");
}

void StorageManager::updateRecords(float currentTemp) {
  if (currentTemp > -50 && currentTemp < 80) {
    if (currentTemp > data.tempMaxRec) {
      data.tempMaxRec = currentTemp;
      EEPROM.put(ADDR_MAX_REC, data.tempMaxRec);
      EEPROM.commit();
    }
    if (currentTemp < data.tempMinRec) {
      data.tempMinRec = currentTemp;
      EEPROM.put(ADDR_MIN_REC, data.tempMinRec);
      EEPROM.commit();
    }
  }
}

void StorageManager::resetMinMax(float currentTemp) {
  if (currentTemp > -50 && currentTemp < 80) {
    data.tempMaxRec = currentTemp;
    data.tempMinRec = currentTemp;
  }
  // Não grava na EEPROM/Flash para evitar desgaste físico do chip
}

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
  EEPROM.get(ADDR_VOLT_MIN, data.voltMin);
  EEPROM.get(ADDR_VOLT_CAL, data.voltCalFactor);
  EEPROM.get(ADDR_BAT_CAL, data.batCalFactor);
  EEPROM.get(ADDR_BAT_MIN, data.batMinLimit);
  EEPROM.get(ADDR_DOOR_TIME, data.doorMaxTime);
  EEPROM.get(ADDR_MON_VOLTAGE, data.monVoltage);
  EEPROM.get(ADDR_MON_BATTERY, data.monBattery);
  EEPROM.get(ADDR_MON_DOOR, data.monDoor);
  EEPROM.get(ADDR_MON_AMBIENT, data.monAmbient);

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

  // Monitoring flags: default OFF (0) if uninitialized
  if (data.monVoltage != 0 && data.monVoltage != 1) {
    data.monVoltage = 0;
    EEPROM.put(ADDR_MON_VOLTAGE, data.monVoltage);
    EEPROM.commit();
  }
  if (data.monBattery != 0 && data.monBattery != 1) {
    data.monBattery = 0;
    EEPROM.put(ADDR_MON_BATTERY, data.monBattery);
    EEPROM.commit();
  }
  if (data.monDoor != 0 && data.monDoor != 1) {
    data.monDoor = 0;
    EEPROM.put(ADDR_MON_DOOR, data.monDoor);
    EEPROM.commit();
  }
  if (data.monAmbient != 0 && data.monAmbient != 1) {
    data.monAmbient = 0;
    EEPROM.put(ADDR_MON_AMBIENT, data.monAmbient);
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
}

void StorageManager::save() {
  EEPROM.put(ADDR_ALM_MAX, data.alarmMax);
  EEPROM.put(ADDR_ALM_MIN, data.alarmMin);
  EEPROM.put(ADDR_VOLT_MAX, data.voltMax);
  EEPROM.put(ADDR_VOLT_MIN, data.voltMin);
  EEPROM.put(ADDR_VOLT_MIN, data.voltMin); // Remover duplicata se houver
  EEPROM.put(ADDR_VOLT_CAL, data.voltCalFactor);
  EEPROM.put(ADDR_BAT_CAL, data.batCalFactor);
  EEPROM.put(ADDR_BAT_MIN, data.batMinLimit);
  EEPROM.put(ADDR_DOOR_TIME, data.doorMaxTime);
  EEPROM.put(ADDR_MON_VOLTAGE, data.monVoltage);
  EEPROM.put(ADDR_MON_BATTERY, data.monBattery);
  EEPROM.put(ADDR_MON_DOOR, data.monDoor);
  EEPROM.put(ADDR_MON_AMBIENT, data.monAmbient);

  // Não salvamos Max/Min aqui para não desgastar à toa, eles são salvos em
  // updateRecords
  EEPROM.commit();
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
  EEPROM.put(ADDR_MAX_REC, data.tempMaxRec);
  EEPROM.put(ADDR_MIN_REC, data.tempMinRec);
  EEPROM.commit();
}

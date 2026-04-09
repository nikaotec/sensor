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
}

void StorageManager::save() {
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

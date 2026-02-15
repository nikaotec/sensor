#ifndef STORAGE_MANAGER_H
#define STORAGE_MANAGER_H

#include <EEPROM.h>
#include "Config.h"

class StorageManager {
public:
    SystemSettings data;

    void begin();
    void load();
    void save();
    void updateRecords(float currentTemp);
    void resetMinMax(float currentTemp);
};

#endif

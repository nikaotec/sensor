#ifndef MAIN_H
#define MAIN_H

#include <Arduino.h>

// Firmware entry points renamed to avoid conflict with Arduino's setup/loop
void firmware_setup();
void firmware_loop();

#endif // MAIN_H

#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include "../config/Config.h"
#include <U8g2lib.h>
#include <WiFi.h>
#include <Wire.h>

class DisplayManager {
private:
  U8G2_SH1106_128X64_NONAME_F_HW_I2C display;

  // Controle de Mensagem
  String mensagemRodape;
  unsigned long tempoMensagemRodape;
  // int scrollOffset; // REPLACED WITH STATIC PAGING

  // Paging Variables
  int currentMsgPage;
  int totalPages;
  unsigned long lastPageChange;
  String currentMessage; // Store original message for re-calc if needed

  unsigned long lastDisplayUpdate;

  // --- MENU ---
  enum MenuState {
    MENU_OFF,
    MENU_MAIN,
    SET_TEMP_MAX,
    SET_TEMP_MIN,
    TOGGLE_ALARM,
    TEST_RELAY,
    RESET_WIFI
  };
  MenuState _currentMenu;
  int _menuIndex;
  float _tempAdjust; // Para ajuste de temperatura

  void drawWifiSignal(bool connected);
  void drawMenu();

public:
  DisplayManager();
  void begin();
  void update(float temp, float max, float min, float voltage,
              bool wifiConnected, bool manual, bool relay, bool alarm);
  void showMessage(String msg, int duracaoMs);

  // Controle do Menu
  void openMenu();
  void closeMenu();
  bool isMenuOpen() { return _currentMenu != MENU_OFF; }
  void menuNext();
  void menuPrev();
  int menuEnter(float &targetMax, float &targetMin, bool &targetAlarm,
                bool &targetRelay); // Retorna 1 se alterou algo

  void showOtaProgress(int percent);
};

#endif

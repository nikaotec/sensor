#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include "../config/Config.h"
#include "../utils/ButtonManager.h"
#include <U8g2lib.h>
#include <WiFi.h>
#include <Wire.h>

class DisplayManager {
private:
  U8G2_SH1106_128X64_NONAME_F_HW_I2C display;

  // Controle de Mensagem
  String mensagemRodape;
  long tempoMensagemRodape; // signed: -1 = permanente, 0 = nenhuma, >0 = expira em millis()
  // int scrollOffset; // REPLACED WITH STATIC PAGING

  // Paging Variables
  int currentMsgPage;
  int totalPages;
  unsigned long lastPageChange;
  String currentMessage; // Store original message for re-calc if needed

  unsigned long lastDisplayUpdate;

public:
  enum MenuState {
    MENU_OFF,
    MENU_PASSWORD,
    MENU_MAIN,
    MENU_CONTROLE,
    MENU_SAIDAS,
    MENU_TESTAR_SAIDAS,
    MENU_ENTRADAS,
    MENU_SENSOR,
    MENU_LUZ,
    MENU_RESET_WIFI,
    EDIT_TEMP_MIN,
    EDIT_TEMP_MAX,
    EDIT_DS18B20_OFFSET,
    EDIT_PT100_OFFSET,
    EDIT_OUTPUT_ASSIGN,
    EDIT_SENSOR_PIN,
    EDIT_SENSOR_TYPE,
    EDIT_LIGHT_ENABLE,
    TEST_RELAY_TOGGLE
  };

private:
  MenuState _currentMenu;
  int _menuIndex;
  int _subMenuIndex;
  float _tempAdjust;
  uint8_t _password[4];
  uint8_t _passwordIndex;

  void drawWifiSignal(bool connected, int rssi);
  void drawHomeStatusBar(bool connected, String datetime);
  void drawHome(float temp, float observedMin, float observedMax,
                bool wifiConnected, int rssi, bool linked, String datetime,
                bool alertActive, bool manual, bool relay);
  void drawPasswordScreen();
  void drawMainMenuPaged();
  void drawMenu();
  void drawSubMenu(const char *title, const char **items, int count, int index);
  void drawEditValue(const char *title, float value, const char *unit);
  void drawTestRelayToggle(int relayIndex, bool state);

public:
  DisplayManager();
  void begin();
  void update(float temp, float observedMin, float observedMax,
              bool wifiConnected, int rssi, bool linked, bool manual, bool relay,
              SensorType sensorType, String datetime, bool alertActive);
  void showMessage(String msg, int duracaoMs);

  // Controle do Menu
  void openMenu();
  void closeMenu();
  bool isMenuOpen() { return _currentMenu != MENU_OFF; }
  void menuNext(int maxItems = 8);
  void menuPrev(int maxItems = 8);
  void menuAction(ButtonEvent ev);

  float getTempAdjust() { return _tempAdjust; }
  void setTempAdjust(float val) { _tempAdjust = val; }

  MenuState getMenuState() { return _currentMenu; }
  void setMenuState(MenuState state) { _currentMenu = state; }
  int getMenuIndex() { return _menuIndex; }
  void setMenuIndex(int index) { _menuIndex = index; }
  int getSubMenuIndex() { return _subMenuIndex; }
  void setSubMenuIndex(int index) { _subMenuIndex = index; }

  void showOtaProgress(int percent);
  void drawCalibrationPT100(float temp, int adc, float voltage);
};

#endif

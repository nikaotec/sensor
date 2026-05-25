#include "DisplayManager.h"

DisplayManager::DisplayManager() : display(U8G2_R0, U8X8_PIN_NONE) {
  // Default: mostra "OPERACIONAL" permanentemente no rodape
  mensagemRodape = "OPERACIONAL";
  tempoMensagemRodape = -1; // Permanente
  currentMsgPage = 0;
  totalPages = 1;
  lastPageChange = 0;
  currentMessage = "OPERACIONAL";
  lastDisplayUpdate = 0;

  // Menu state - CRITICAL: must start at MENU_OFF
  _currentMenu = MENU_OFF;
  _menuIndex = 0;
  _subMenuIndex = 0;
  _tempAdjust = 0.0f;
  _passwordIndex = 0;
  for (int i = 0; i < 4; i++) _password[i] = 0;
}

void DisplayManager::begin() {
  display.begin();
  display.clearBuffer();
  display.sendBuffer();
}

// Helper to calculate pages
int calculatePages(String msg) {
  // Approx width check. 128px screen, 6px font. ~21 chars fit comfortably.
  // Let's be safe with 18 chars to ensure readability.
  int len = msg.length();
  if (len == 0)
    return 1;
  return (len + 17) / 18; // Integer ceil division for 18 chars per page
}

void DisplayManager::showMessage(String msg, int duracaoMs) {
  mensagemRodape = msg;
  currentMessage = msg;
  currentMsgPage = 0;
  lastPageChange = millis();
  totalPages = calculatePages(msg);

  if (duracaoMs > 0) {
    tempoMensagemRodape = millis() + duracaoMs;
  } else {
    tempoMensagemRodape = -1; // Permanente (valor negativo)
  }
}

void DisplayManager::drawHome(float temp, float observedMin, float observedMax,
                              bool wifiConnected, int rssi, bool linked, String datetime,
                              bool alertActive, bool manual, bool relay) {
  display.clearBuffer();

  // Status Bar & Datetime
  display.setFont(u8g2_font_6x12_tr);
  display.drawStr(0, 10, datetime.c_str());
  drawWifiSignal(wifiConnected, rssi);
  display.drawHLine(0, 15, 128);

  // Temp Grande
  display.setFont(u8g2_font_logisoso26_tr);
  char tB[10];
  dtostrf(temp, 4, 1, tB);
  display.drawStr(0, 50, tB);

  display.setFont(u8g2_font_9x15_tr);
  display.drawStr(65, 38, "C");

  // Min/Max (Coluna Direita)
  display.setFont(u8g2_font_6x12_tr);
  char mB[10];
  String minTxt = "MIN:";
  if (observedMin < 90.0 && observedMin > -90.0) {
    dtostrf(observedMin, 4, 1, mB);
    minTxt += mB;
  } else
    minTxt += "--.-";

  String maxTxt = "MAX:";
  if (observedMax < 90.0 && observedMax > -90.0) {
    dtostrf(observedMax, 4, 1, mB);
    maxTxt += mB;
  } else
    maxTxt += "--.-";

  display.drawStr(80, 35, minTxt.c_str());
  display.drawStr(80, 50, maxTxt.c_str());

  // Verifica se a mensagem atual expirou (mas nao se e permanente)
  unsigned long now = millis();
  if (tempoMensagemRodape > 0 && now > tempoMensagemRodape) {
    tempoMensagemRodape = -1; // Volta para "OPERACIONAL" permanente
    currentMsgPage = 0;
    mensagemRodape = "OPERACIONAL";
    currentMessage = "OPERACIONAL";
    totalPages = 1;
  }

  // --- RODAPÉ ---
  if (tempoMensagemRodape != 0) {
    // Modo de Mensagem Ativa (Paging)
    if (totalPages > 1) {
      if (now - lastPageChange > 3000) {
        lastPageChange = now;
        currentMsgPage++;
        if (currentMsgPage >= totalPages)
          currentMsgPage = 0;
      }
    } else {
      currentMsgPage = 0;
    }

    int pageSize = 16; // Deixamos menor para nao sobrepor o canto direito
    int startIndex = currentMsgPage * pageSize;
    String pageText =
        mensagemRodape.substring(startIndex, startIndex + pageSize);

    // Center in the available 100 pixels
    int width = display.getStrWidth(pageText.c_str());
    int xPos = (100 - width) / 2;
    if (xPos < 0)
      xPos = 0;

    display.drawStr(xPos, 64, pageText.c_str());

  } else {
    // Modo Padrão (Sem mensagem ativa - resgatando funcionalidade antiga)
    display.drawStr(0, 64, manual ? "MANU" : "AUTO");
    display.drawStr(40, 64, relay ? "GELANDO" : "MOTOR OFF");
  }

  // Status de Vínculo/Alarme sempre fixos na direita
  if (alertActive) {
    display.drawStr(105, 64, "!!!");
  } else if (linked) {
    display.drawStr(110, 64, "OK");
  } else {
    display.drawStr(105, 64, "OFF");
  }

  display.sendBuffer();
}

void DisplayManager::drawWifiSignal(bool connected, int rssi) {
  if (!connected) {
    display.drawStr(90, 10, "OFF");
    return;
  }

  display.drawStr(90, 10, "ON");

  int bars = 0;
  if (rssi > -55)
    bars = 4;
  else if (rssi > -65)
    bars = 3;
  else if (rssi > -75)
    bars = 2;
  else if (rssi > -85)
    bars = 1;

  for (int i = 0; i < 4; i++) {
    if (i < bars) {
      display.drawBox(112 + (i * 4), 10 - (i * 2), 3, (i * 2) + 2);
    } else {
      display.drawFrame(112 + (i * 4), 10 - (i * 2), 3, (i * 2) + 2);
    }
  }
}

void DisplayManager::update(float temp, float observedMin, float observedMax,
                            bool wifiConnected, int rssi, bool linked, bool manual,
                            bool relay, SensorType sensorType, String datetime,
                            bool alertActive) {
  unsigned long now = millis();

  if (now - lastDisplayUpdate > 250) {
    lastDisplayUpdate = now;

    if (isMenuOpen()) {
      drawMenu();
      return;
    }

    drawHome(temp, observedMin, observedMax, wifiConnected, rssi, linked, datetime,
             alertActive, manual, relay);
  }
}

void DisplayManager::drawPasswordScreen() {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tr);
  display.drawStr(0, 10, "DIGITE A SENHA");

  display.setFont(u8g2_font_logisoso20_tr);
  char buffer[16];
  snprintf(buffer, sizeof(buffer), "%d %d %d %d", _password[0], _password[1],
           _password[2], _password[3]);

  display.drawStr(10, 58, buffer);

  int xPositions[4] = {8, 36, 64, 92};
  display.drawFrame(xPositions[_passwordIndex] - 2, 34, 22, 28);
  display.sendBuffer();
}

void DisplayManager::drawMainMenuPaged() {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tr);

  const int totalItems = 9;
  const char *mainMenuNames[] = {
      "CONTROLE", "SAIDAS",          "TESTAR SAIDAS", "ENTRADAS",
      "SENSOR",   "OFF SET DS18B20", "LUZ INTERNA",   "OFF SET PT100",
      "RESET WIFI"};

  const int itemsPerPage = 4;
  int totalPages = (totalItems + itemsPerPage - 1) / itemsPerPage;
  int page = _menuIndex / itemsPerPage;
  int startItem = page * itemsPerPage;
  int endItem = startItem + itemsPerPage;
  if (endItem > totalItems)
    endItem = totalItems;

  String title = "MENU ";
  title += String(page + 1) + "/" + String(totalPages);
  display.drawStr(0, 10, title.c_str());

  int line = 0;
  for (int i = startItem; i < endItem; i++) {
    int y = 24 + line * 10;
    if (i == _menuIndex) {
      display.drawBox(0, y - 8, 128, 10);
      display.setDrawColor(0);
      display.drawStr(2, y, mainMenuNames[i]);
      display.setDrawColor(1);
    } else {
      display.drawStr(2, y, mainMenuNames[i]);
    }
    line++;
  }
  display.sendBuffer();
}

void DisplayManager::drawSubMenu(const char *title, const char **items,
                                 int count, int index) {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tr);
  display.drawStr(0, 10, title);

  for (int i = 0; i < count; i++) {
    int y = 24 + i * 10;
    if (i == index) {
      display.drawBox(0, y - 8, 128, 10);
      display.setDrawColor(0);
      display.drawStr(2, y, items[i]);
      display.setDrawColor(1);
    } else {
      display.drawStr(2, y, items[i]);
    }
  }
  display.sendBuffer();
}

void DisplayManager::drawEditValue(const char *title, float value,
                                   const char *unit) {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tr);
  display.drawStr(0, 10, title);
  display.drawStr(0, 24, "UP/DOWN ajustes");
  display.drawStr(0, 36, "ENTER salvar");

  display.setFont(u8g2_font_logisoso20_tr);
  char buf[10];
  dtostrf(value, 4, 1, buf);
  display.drawStr(18, 64, buf);

  display.setFont(u8g2_font_6x12_tr);
  display.drawStr(95, 60, unit);
  display.sendBuffer();
}

void DisplayManager::drawTestRelayToggle(int relayIndex, bool state) {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tr);
  char buf[20];
  sprintf(buf, "RELE %02d", relayIndex);
  display.drawStr(0, 10, buf);
  display.drawStr(0, 24, "ENTER alterna");
  display.drawStr(0, 36, "BACK retorna");

  display.setFont(u8g2_font_logisoso20_tr);
  display.drawStr(20, 64, state ? "ON" : "OFF");
  display.sendBuffer();
}

void DisplayManager::drawMenu() {
  switch (_currentMenu) {
  case MENU_PASSWORD:
    drawPasswordScreen();
    break;
  case MENU_MAIN:
    drawMainMenuPaged();
    break;
  case MENU_CONTROLE: {
    const char *items[] = {"TEMP MIN", "TEMP MAX", "VOLTAR"};
    drawSubMenu("CONTROLE", items, 3, _subMenuIndex);
  } break;
  case MENU_SAIDAS: {
    const char *items[] = {"MOTOR", "LUZ INTERNA", "BATERIA", "COOLER",
                           "VOLTAR"};
    drawSubMenu("SAIDAS", items, 5, _subMenuIndex);
  } break;
  case MENU_TESTAR_SAIDAS: {
    const char *items[] = {"RELE 00", "RELE 01", "RELE 02", "RELE 03",
                           "VOLTAR"};
    drawSubMenu("TESTAR", items, 5, _subMenuIndex);
  } break;
  case MENU_ENTRADAS: {
    const char *items[] = {"PINO DS18B20", "VOLTAR"};
    drawSubMenu("ENTRADAS", items, 2, _subMenuIndex);
  } break;
  case MENU_SENSOR: {
    const char *items[] = {"TIPO SENSOR", "VOLTAR"};
    drawSubMenu("SENSOR", items, 2, _subMenuIndex);
  } break;
  case MENU_LUZ: {
    const char *items[] = {"FUNCAO", "VOLTAR"};
    drawSubMenu("LUZ INTERNA", items, 2, _subMenuIndex);
  } break;
  case MENU_RESET_WIFI:
    display.clearBuffer();
    display.setFont(u8g2_font_6x12_tr);
    display.drawStr(0, 10, "RESET WiFi");
    display.drawHLine(0, 13, 128);
    display.drawStr(0, 28, "Apaga credenciais");
    display.drawStr(0, 40, "salvas e reinicia.");
    display.drawStr(0, 56, "ENTER = confirmar");
    display.sendBuffer();
    break;
  case EDIT_TEMP_MIN:
    drawEditValue("TEMP MIN", _tempAdjust, "C");
    break;
  case EDIT_TEMP_MAX:
    drawEditValue("TEMP MAX", _tempAdjust, "C");
    break;
  case EDIT_DS18B20_OFFSET:
    drawEditValue("OFFSET DS18", _tempAdjust, "C");
    break;
  case EDIT_PT100_OFFSET:
    drawEditValue("OFFSET PT100", _tempAdjust, "C");
    break;
  case EDIT_OUTPUT_ASSIGN: {
    const char *names[] = {"MOTOR", "LUZ INTERNA", "BATERIA", "COOLER"};
    if (_subMenuIndex < 4) {
      drawEditValue(names[_subMenuIndex], _tempAdjust, "RELE");
    }
  } break;
  case EDIT_SENSOR_PIN: {
    const char *pins[] = {"IN-1 (13)", "IN-2 (17)"};
    drawSubMenu("PINO DS18B20", pins, 2, _subMenuIndex);
  } break;
  case EDIT_SENSOR_TYPE: {
    const char *types[] = {"DS18B20", "PT100"};
    drawSubMenu("TIPO SENSOR", types, 2, _subMenuIndex);
  } break;
  case EDIT_LIGHT_ENABLE: {
    const char *status[] = {"OFF", "ON"};
    drawSubMenu("FUNCAO LUZ", status, 2, _tempAdjust > 0.5f ? 1 : 0);
  } break;
  case TEST_RELAY_TOGGLE:
    drawTestRelayToggle(_subMenuIndex, _tempAdjust > 0.5f);
    break;
  default:
    break;
  }
}

void DisplayManager::openMenu() {
  _currentMenu = MENU_PASSWORD;
  _passwordIndex = 0;
  for (int i = 0; i < 4; i++)
    _password[i] = 0;
}

void DisplayManager::closeMenu() { _currentMenu = MENU_OFF; }

void DisplayManager::menuNext(int maxItems) {
  if (_currentMenu == MENU_MAIN)
    _menuIndex = (_menuIndex + 1) % maxItems;
  else
    _subMenuIndex = (_subMenuIndex + 1) % maxItems;
}

void DisplayManager::menuPrev(int maxItems) {
  if (_currentMenu == MENU_MAIN)
    _menuIndex = (_menuIndex + maxItems - 1) % maxItems;
  else
    _subMenuIndex = (_subMenuIndex + maxItems - 1) % maxItems;
}

void DisplayManager::showOtaProgress(int percent) {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tf);
  display.drawStr(10, 20, "ATUALIZANDO...");
  display.drawFrame(10, 30, 108, 10);
  display.drawBox(12, 32, (percent * 104) / 100, 6);
  char pStr[10];
  sprintf(pStr, "%d%%", percent);
  int width = display.getStrWidth(pStr);
  display.drawStr((128 - width) / 2, 55, pStr);
  display.sendBuffer();
}

void DisplayManager::drawCalibrationPT100(float temp, int adc, float voltage) {
  display.clearBuffer();
  display.setFont(u8g2_font_ncenB08_tr);
  display.drawStr(0, 10, "CALIBRACAO PT100");
  display.drawHLine(0, 13, 128);
  display.setFont(u8g2_font_ncenB12_tr);
  display.setCursor(0, 35);
  display.print("Temp: ");
  display.print(temp, 1);
  display.print(" C");
  display.setFont(u8g2_font_6x10_tf);
  display.setCursor(0, 52);
  display.print("ADC: ");
  display.print(adc);
  display.setCursor(0, 63);
  display.print("Tensao: ");
  display.print(voltage, 2);
  display.print(" V");
  display.sendBuffer();
}
void DisplayManager::menuAction(ButtonEvent ev) {
  if (ev == BTN_NONE)
    return;

  if (_currentMenu == MENU_OFF) {
    if (ev == BTN_PRESSED_MENU)
      openMenu();
    return;
  }

  // BACK / MENU volta um nível ou fecha
  if (ev == BTN_PRESSED_MENU) {
    switch (_currentMenu) {
    case MENU_PASSWORD:
    case MENU_MAIN:
      closeMenu();
      break;
    case MENU_CONTROLE:
    case MENU_SAIDAS:
    case MENU_TESTAR_SAIDAS:
    case MENU_ENTRADAS:
    case MENU_SENSOR:
    case MENU_LUZ:
    case MENU_RESET_WIFI:
    case EDIT_DS18B20_OFFSET:
    case EDIT_PT100_OFFSET:
      _currentMenu = MENU_MAIN;
      break;
    case EDIT_TEMP_MIN:
    case EDIT_TEMP_MAX:
      _currentMenu = MENU_CONTROLE;
      break;
    case EDIT_OUTPUT_ASSIGN:
      _currentMenu = MENU_SAIDAS;
      break;
    case EDIT_SENSOR_PIN:
      _currentMenu = MENU_ENTRADAS;
      break;
    case EDIT_SENSOR_TYPE:
      _currentMenu = MENU_SENSOR;
      break;
    case EDIT_LIGHT_ENABLE:
      _currentMenu = MENU_LUZ;
      break;
    case TEST_RELAY_TOGGLE:
      _currentMenu = MENU_TESTAR_SAIDAS;
      break;
    default:
      _currentMenu = MENU_MAIN;
      break;
    }
    return;
  }

  // Navegação UP/DOWN e Ajustes
  if (ev == BTN_PRESSED_UP || ev == BTN_PRESSED_DOWN) {
    int dir = (ev == BTN_PRESSED_UP) ? -1 : 1;

    switch (_currentMenu) {
    case MENU_PASSWORD:
      _password[_passwordIndex] = (_password[_passwordIndex] + dir + 10) % 10;
      break;
    case MENU_MAIN:
      _menuIndex = (_menuIndex + dir + 9) % 9; // 9 itens no menu principal
      break;
    case MENU_CONTROLE:
      _subMenuIndex = (_subMenuIndex + dir + 3) % 3;
      break;
    case MENU_SAIDAS:
      _subMenuIndex = (_subMenuIndex + dir + 5) % 5;
      break;
    case MENU_TESTAR_SAIDAS:
      _subMenuIndex = (_subMenuIndex + dir + 5) % 5;
      break;
    case MENU_ENTRADAS:
      _subMenuIndex = (_subMenuIndex + dir + 2) % 2;
      break;
    case MENU_SENSOR:
      _subMenuIndex = (_subMenuIndex + dir + 2) % 2;
      break;
    case MENU_LUZ:
      _subMenuIndex = (_subMenuIndex + dir + 2) % 2;
      break;
    case EDIT_TEMP_MIN:
    case EDIT_TEMP_MAX:
    case EDIT_DS18B20_OFFSET:
    case EDIT_PT100_OFFSET:
      _tempAdjust += dir * 0.1f;
      break;
    case EDIT_OUTPUT_ASSIGN:
    case EDIT_SENSOR_PIN:
    case EDIT_SENSOR_TYPE:
    case EDIT_LIGHT_ENABLE:
    case TEST_RELAY_TOGGLE:
      // Alternadores binários ou múltiplos
      if (_currentMenu == EDIT_OUTPUT_ASSIGN) {
        _tempAdjust = (int(_tempAdjust) + dir + 4) % 4; // 4 relés
      } else {
        _tempAdjust = _tempAdjust > 0.5f ? 0.0f : 1.0f;
      }
      break;
    default:
      break;
    }
  }

  // ENTER seleciona ou confirma
  if (ev == BTN_PRESSED_ENTER) {
    switch (_currentMenu) {
    case MENU_PASSWORD:
      if (_passwordIndex < 3) {
        _passwordIndex++;
      } else {
        // Verifica senha (default 0000 para agora, ou uma fixa)
        if (_password[0] == 0 && _password[1] == 0 && _password[2] == 0 &&
            _password[3] == 0) {
          _currentMenu = MENU_MAIN;
          _menuIndex = 0;
        } else {
          showMessage("SENHA INCORRETA", 2000);
          closeMenu();
        }
      }
      break;

    case MENU_MAIN:
      _subMenuIndex = 0;
      switch (_menuIndex) {
      case 0:
        _currentMenu = MENU_CONTROLE;
        break;
      case 1:
        _currentMenu = MENU_SAIDAS;
        break;
      case 2:
        _currentMenu = MENU_TESTAR_SAIDAS;
        break;
      case 3:
        _currentMenu = MENU_ENTRADAS;
        break;
      case 4:
        _currentMenu = MENU_SENSOR;
        break;
      case 5:
        _currentMenu = EDIT_DS18B20_OFFSET;
        break;
      case 6:
        _currentMenu = MENU_LUZ;
        break;
      case 7:
        _currentMenu = EDIT_PT100_OFFSET;
        break;
      case 8:
        _currentMenu = MENU_RESET_WIFI;
        break;
      }
      break;

    case MENU_SAIDAS:
      if (_subMenuIndex < 4) {
        _currentMenu = EDIT_OUTPUT_ASSIGN;
      } else {
        _currentMenu = MENU_MAIN;
      }
      break;

    case MENU_TESTAR_SAIDAS:
      if (_subMenuIndex < 4) {
        _currentMenu = TEST_RELAY_TOGGLE;
        _tempAdjust = 0.0f; // OFF inicial para teste
      } else {
        _currentMenu = MENU_MAIN;
      }
      break;

    case MENU_ENTRADAS:
      if (_subMenuIndex == 0) {
        _currentMenu = EDIT_SENSOR_PIN;
      } else {
        _currentMenu = MENU_MAIN;
      }
      break;

    case MENU_SENSOR:
      if (_subMenuIndex == 0) {
        _currentMenu = EDIT_SENSOR_TYPE;
      } else {
        _currentMenu = MENU_MAIN;
      }
      break;

    case MENU_LUZ:
      if (_subMenuIndex == 0) {
        _currentMenu = EDIT_LIGHT_ENABLE;
      } else {
        _currentMenu = MENU_MAIN;
      }
      break;

    case MENU_RESET_WIFI:
      _currentMenu = MENU_MAIN;
      break;

    case EDIT_TEMP_MIN:
    case EDIT_TEMP_MAX:
    case EDIT_DS18B20_OFFSET:
    case EDIT_PT100_OFFSET:
    case EDIT_OUTPUT_ASSIGN:
    case EDIT_SENSOR_PIN:
    case EDIT_SENSOR_TYPE:
    case EDIT_LIGHT_ENABLE:
      // O valor alterado deve ser capturado pelo main.cpp antes de voltar
      // mudando apenas o estado aqui
      _currentMenu = MENU_MAIN;
      break;

    default:
      _currentMenu = MENU_MAIN;
      break;
    }
  }
}

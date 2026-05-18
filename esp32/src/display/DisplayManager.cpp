#include "DisplayManager.h"

DisplayManager::DisplayManager() : display(U8G2_R0, U8X8_PIN_NONE) {
  mensagemRodape = "OPERACIONAL";
  tempoMensagemRodape = 0;
  // scrollOffset = 0; // REMOVED
  currentMsgPage = 0;
  totalPages = 1;
  lastPageChange = 0;
  currentMessage = "";
  lastDisplayUpdate = 0;
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
  currentMessage = msg; // Store needed for paging logic if needed, though we
                        // use mensagemRodape
  currentMsgPage = 0;
  lastPageChange = millis();
  totalPages = calculatePages(msg);

  if (duracaoMs > 0) {
    tempoMensagemRodape = millis() + duracaoMs;
  } else {
    tempoMensagemRodape = 0; // Fixa
  }
}

void DisplayManager::drawWifiSignal(bool connected) {
  if (!connected) {
    display.drawStr(90, 10, "OFF");
    return;
  }

  int rssi = WiFi.RSSI();
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

void DisplayManager::update(float temp, float max, float min, float voltage,
                            bool wifiConnected, bool manual, bool relay,
                            bool alarm) {
  unsigned long now = millis();

  // Controle de Mensagem no Rodapé
  if (tempoMensagemRodape > 0 && now > tempoMensagemRodape) {
    mensagemRodape = manual ? "EM MANUTENCAO" : "OPERACIONAL";
    tempoMensagemRodape = 0;
    currentMsgPage = 0;
    totalPages = 1;
  }

  if (now - lastDisplayUpdate > 250) {
    lastDisplayUpdate = now;

    if (isMenuOpen()) {
      drawMenu();
      return;
    }

    display.clearBuffer();
    display.setFont(u8g2_font_6x12_tf);

    // Hora
    struct tm t;
    char hS[10] = "--:--:--"; // Valor padrão
    if (getLocalTime(&t)) {
      strftime(hS, sizeof(hS), "%H:%M:%S", &t);
    }
    display.drawStr(0, 10, hS);

    // Tensão
    char vStr[10];
    sprintf(vStr, "%.0fV", voltage);
    display.drawStr(70, 10,
                    vStr); // Movido para X=70 para evitar conflito com WiFi

    // WiFi
    drawWifiSignal(wifiConnected);

    // Temp Grande
    // Mover para Y=38 para evitar conflito com Rodapé/Linha Divisória
    char tB[10];
    dtostrf(temp, 4, 1, tB);
    display.setFont(u8g2_font_logisoso24_tf);
    display.drawStr(0, 42, tB);

    display.setFont(u8g2_font_6x12_tf);
    display.drawStr(60, 30, "oC");

    // Min/Max (Coluna Direita - Compactado)
    char mB[10];
    dtostrf(max, 4, 1, mB);
    display.drawStr(80, 28, "Mx");
    display.drawStr(100, 28, mB);

    dtostrf(min, 4, 1, mB);
    display.drawStr(80, 40, "Mn");
    display.drawStr(100, 40, mB);

    // Linha Divisória
    display.drawLine(0, 48, 127, 48);

    // --- RODAPÉ DINÂMICO ---
    // --- RODAPÉ DINÂMICO (PAGING) ---

    // Logic to switch pages
    if (totalPages > 1) {
      if (now - lastPageChange > 3000) { // 3 seconds per page
        lastPageChange = now;
        currentMsgPage++;
        if (currentMsgPage >= totalPages) {
          currentMsgPage = 0;
        }
      }
    } else {
      currentMsgPage = 0;
    }

    // Logic to extract substring for current page
    // Page size = 18 chars
    int pageSize = 18;
    int startIndex = currentMsgPage * pageSize;
    String pageText =
        mensagemRodape.substring(startIndex, startIndex + pageSize);

    // Center the text
    int width = display.getStrWidth(pageText.c_str());
    int xPos = (128 - width) / 2;
    if (xPos < 0)
      xPos = 0;

    display.drawStr(xPos, 62, pageText.c_str());

    // Alerta Sobreposto
    if (alarm) {
      display.setDrawColor(0);
      display.drawBox(105, 52, 23, 12);
      display.setDrawColor(1);
      display.drawStr(105, 62, "!!!");
    }

    display.sendBuffer();
  }
}

void DisplayManager::showOtaProgress(int percent) {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tf);
  display.drawStr(10, 20, "ATUALIZANDO...");

  // Barra de progresso
  display.drawFrame(10, 30, 108, 10);
  display.drawBox(12, 32, (percent * 104) / 100, 6);

  char pStr[10];
  sprintf(pStr, "%d%%", percent);
  int width = display.getStrWidth(pStr);
  display.drawStr((128 - width) / 2, 55, pStr);

  display.sendBuffer();
}

// --- MENU LOGIC ---

void DisplayManager::openMenu() {
  _currentMenu = MENU_MAIN;
  _menuIndex = 0;
  showMessage("Menu Ativo", 2000);
}

void DisplayManager::closeMenu() {
  _currentMenu = MENU_OFF;
  showMessage("Menu Fechado", 2000);
}

void DisplayManager::menuNext() {
  if (_currentMenu == MENU_MAIN) {
    _menuIndex = (_menuIndex + 1) % 5;
  } else if (_currentMenu == SET_TEMP_MAX || _currentMenu == SET_TEMP_MIN) {
    _tempAdjust += 0.5;
  }
}

void DisplayManager::menuPrev() {
  if (_currentMenu == MENU_MAIN) {
    _menuIndex = (_menuIndex + 4) % 5;
  } else if (_currentMenu == SET_TEMP_MAX || _currentMenu == SET_TEMP_MIN) {
    _tempAdjust -= 0.5;
  }
}

int DisplayManager::menuEnter(float &targetMax, float &targetMin,
                              bool &targetAlarm, bool &targetRelay) {
  if (_currentMenu == MENU_MAIN) {
    if (_menuIndex == 0) {
      _currentMenu = SET_TEMP_MAX;
      _tempAdjust = targetMax;
    } else if (_menuIndex == 1) {
      _currentMenu = SET_TEMP_MIN;
      _tempAdjust = targetMin;
    } else if (_menuIndex == 2) {
      _currentMenu = TOGGLE_ALARM;
    } else if (_menuIndex == 3) {
      _currentMenu = TEST_RELAY;
    } else if (_menuIndex == 4) {
      _currentMenu = RESET_WIFI;
    }
    return 0;
  } else {
    int changed = 0;
    if (_currentMenu == SET_TEMP_MAX) {
      targetMax = _tempAdjust;
      changed = 1;
    } else if (_currentMenu == SET_TEMP_MIN) {
      targetMin = _tempAdjust;
      changed = 1;
    } else if (_currentMenu == TOGGLE_ALARM) {
      targetAlarm = !targetAlarm;
      changed = 1;
    } else if (_currentMenu == TEST_RELAY) {
      targetRelay = !targetRelay;
      changed = 1;
    } else if (_currentMenu == RESET_WIFI) {
      changed = 2; // Código especial para Reset
    }

    _currentMenu = MENU_MAIN;
    return changed;
  }
}

void DisplayManager::drawMenu() {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tf);

  if (_currentMenu == MENU_MAIN) {
    display.drawStr(0, 10, "> CONFIGURACOES");
    const char *options[] = {"1. Temp Max", "2. Temp Min", "3. Alarme ON/OFF",
                             "4. Testar Rele", "5. Reset WiFi"};
    for (int i = 0; i < 5; i++) {
      if (i == _menuIndex)
        display.drawStr(0, 25 + (i * 12), ">");
      display.drawStr(10, 25 + (i * 12), options[i]);
    }
  } else if (_currentMenu == SET_TEMP_MAX || _currentMenu == SET_TEMP_MIN) {
    display.drawStr(0, 10,
                    _currentMenu == SET_TEMP_MAX ? "AJUSTE TEMP MAX"
                                                 : "AJUSTE TEMP MIN");
    char buf[10];
    dtostrf(_tempAdjust, 4, 1, buf);
    display.setFont(u8g2_font_logisoso24_tf);
    display.drawStr(30, 45, buf);
    display.setFont(u8g2_font_6x12_tf);
    display.drawStr(90, 45, "oC");
    display.drawStr(0, 62, "[ENTER] p/ Salvar");
  } else if (_currentMenu == TOGGLE_ALARM) {
    display.drawStr(0, 10, "STATUS ALARME");
    display.setFont(u8g2_font_logisoso24_tf);
    display.drawStr(20, 45, "CONFIRMAR?");
    display.setFont(u8g2_font_6x12_tf);
    display.drawStr(0, 62, "[ENTER] Inverter");
  } else if (_currentMenu == TEST_RELAY) {
    display.drawStr(0, 10, "TESTE DE SAIDA");
    display.setFont(u8g2_font_logisoso24_tf);
    display.drawStr(20, 45, "RELE?");
    display.setFont(u8g2_font_6x12_tf);
    display.drawStr(0, 62, "[ENTER] p/ Alternar");
  } else if (_currentMenu == RESET_WIFI) {
    display.drawStr(0, 10, "RESETAR WIFI?");
    display.setFont(u8g2_font_logisoso24_tf);
    display.drawStr(5, 45, "CONFIRMAR?");
    display.setFont(u8g2_font_6x12_tf);
    display.drawStr(0, 62, "[ENTER] Apagar Tudo");
  }

  display.sendBuffer();
}

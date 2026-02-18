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

#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <U8g2lib.h>
#include <WiFi.h>
#include "Config.h"

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

    void drawWifiSignal(bool connected);

public:
    DisplayManager();
    void begin();
    void update(float temp, float max, float min, float voltage, bool wifiConnected, bool manual, bool relay, bool alarm);
    void showMessage(String msg, int duracaoMs);
};

#endif

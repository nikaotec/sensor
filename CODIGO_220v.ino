#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>
#include "VoltageSensor.h" // Inclui nossa nova biblioteca

// ======== OLED SH1106 ========
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

// ======== ZMPT101B ========
#define PIN_ZMPT 34
VoltageSensor voltSensor(PIN_ZMPT, 500.0); // Pino 34, Fator inicial 500.0

unsigned long lastDisplayUpdate = 0;

void setup() {
  Serial.begin(115200);

  // Inicializa o Sensor (começa a tarefa em background no Core 0)
  voltSensor.begin();

  // Inicializa Display
  Wire.begin(21, 22);
  u8g2.begin();
}

void loop() {
  // O loop agora está LIVRE! Não há delays de bloqueio aqui.
  // Podemos fazer outras coisas, como piscar um LED ou responder ao MQTT.
  
  // Exemplo: Atualizar display apenas a cada 250ms
  if (millis() - lastDisplayUpdate > 250) {
    lastDisplayUpdate = millis();
    
    float voltage = voltSensor.getVoltage();
    
    // Log na Serial
    Serial.print("Tensao RMS (Background): ");
    Serial.print(voltage);
    Serial.println(" V");

    // ===== OLED =====
    u8g2.clearBuffer();

    u8g2.setFont(u8g2_font_ncenB14_tr);
    u8g2.drawStr(10, 20, "Tensao:");

    u8g2.setFont(u8g2_font_logisoso24_tr);
    
    char buffer[10];
    dtostrf(voltage, 5, 1, buffer); // Formata float para string

    u8g2.drawStr(10, 55, buffer);
    u8g2.drawStr(95, 55, "V");

    u8g2.sendBuffer();
  }
  
  // Simulação de outra tarefa rodando rápido
  // delay(10); 
}



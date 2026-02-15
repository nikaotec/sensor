#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// ======== OLED SH1106 ========
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

// ======== ZMPT101B ========
#define PIN_ZMPT 34        // Pino ADC
#define NUM_SAMPLES 1000   // Quantidade de amostras

float calibrationFactor = 0.085;  // Ajuste fino (calibrar depois)

// =============================

void setup() {
  Serial.begin(115200);

  // ADC configuração
  analogReadResolution(12);      // 0-4095
  analogSetAttenuation(ADC_11db); // Até ~3.6V

  // I2C custom (SDA 4 / SCL 16)
  Wire.begin(21, 22);

  u8g2.begin();
}

void loop() {

  float sum = 0;
  float voltage;
  int sample;
  float adcVoltage;

  const int numSamples = 2000;
  float offset = 0;

  // ===== Primeiro calcula o offset (média) =====
  for (int i = 0; i < numSamples; i++) {
    offset += analogRead(PIN_ZMPT);
    delayMicroseconds(200);
  }
  offset = offset / numSamples;

  // ===== Agora calcula RMS real =====
  for (int i = 0; i < numSamples; i++) {
    sample = analogRead(PIN_ZMPT);
    float centered = sample - offset;   // Remove offset DC
    sum += centered * centered;
    delayMicroseconds(200);
  }

  float mean = sum / numSamples;
  float rms = sqrt(mean);

  // Converte ADC para tensão
  adcVoltage = rms * (3.3 / 4095.0);

  // Ajuste de calibração (MUDE ESTE VALOR)
  float calibrationFactor = 500.0;

  voltage = adcVoltage * calibrationFactor;

  Serial.print("Tensao RMS: ");
  Serial.print(voltage);
  Serial.println(" V");

  // ===== OLED =====
  u8g2.clearBuffer();

  u8g2.setFont(u8g2_font_ncenB14_tr);
  u8g2.drawStr(10, 20, "Tensao:");

  u8g2.setFont(u8g2_font_logisoso24_tr);

  char buffer[10];
  dtostrf(voltage, 5, 1, buffer);

  u8g2.drawStr(10, 55, buffer);
  u8g2.drawStr(95, 55, "V");

  u8g2.sendBuffer();

  delay(20);
}


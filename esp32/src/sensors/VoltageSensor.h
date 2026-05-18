#ifndef VOLTAGE_SENSOR_H
#define VOLTAGE_SENSOR_H

#include <Arduino.h>

class VoltageSensor {
private:
  int _pin;
  float _calibrationFactor;
  volatile float _voltageRMS;
  TaskHandle_t _taskHandle;

  // Bateria (lida sequencialmente na mesma Task para evitar contenção ADC1)
  int _batteryPin;
  float _batteryCalFactor;
  volatile float _batteryVoltage;

  // Amostragem Pico-a-Pico por 100ms (~6 ciclos de 60Hz, ~10000 leituras)
  static const int SAMPLE_WINDOW_MS = 100;

  static void sampleTask(void *pvParameters) {
    VoltageSensor *sensor = (VoltageSensor *)pvParameters;

    while (true) {
      // === 1. True RMS - Welford (tight loop, 100ms, ~10000 amostras) ===
      // Calcula offset DC e variância AC em uma única passada
      unsigned long startMillis = millis();
      float mean = 0.0;
      float M2 = 0.0;
      int n = 0;

      while (millis() - startMillis < SAMPLE_WINDOW_MS) {
        int val = analogRead(sensor->_pin);
        n++;
        float delta = val - mean;
        mean += delta / n;
        float delta2 = val - mean;
        M2 += delta * delta2;
      }

      // RMS AC = desvio padrão do sinal (ignora componente DC automaticamente)
      float rmsADC = (n > 1) ? sqrt(M2 / n) : 0.0;

      // Filtro de ruído: sem sinal AC → 0V imediato (detecção rápida de queda)
      if (rmsADC < 20.0) {
        sensor->_voltageRMS = 0.0;
      } else {
        // Converte ADC RMS para tensão real
        float adcVoltage = rmsADC * (3.3 / 4095.0);
        float newVoltage = adcVoltage * sensor->_calibrationFactor;

        // EMA leve para suavizar transições (alpha=0.3)
        if (sensor->_voltageRMS < 1.0) {
          sensor->_voltageRMS = newVoltage; // Boot rápido
        } else {
          sensor->_voltageRMS = 0.3 * newVoltage + 0.7 * sensor->_voltageRMS;
        }
      }

      // === 2. Leitura Bateria (sequencial, sem contenção) ===
      if (sensor->_batteryPin >= 0) {
        long sum = 0;
        for (int i = 0; i < 10; i++) {
          sum += analogRead(sensor->_batteryPin);
          delay(2);
        }
        float average = (float)sum / 10;
        sensor->_batteryVoltage =
            (average * 3.3 / 4095.0) * sensor->_batteryCalFactor;
      }

      vTaskDelay(pdMS_TO_TICKS(250));
    }
  }

public:
  VoltageSensor(int pin, float calibrationFactor = 500.0) {
    _pin = pin;
    _calibrationFactor = calibrationFactor;
    _voltageRMS = 0.0;
    _taskHandle = NULL;
    _batteryPin = -1;
    _batteryCalFactor = 1.0;
    _batteryVoltage = 0.0;
  }

  void begin() {
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);
    pinMode(_pin, INPUT);

    if (_batteryPin >= 0) {
      pinMode(_batteryPin, INPUT);
    }

    xTaskCreatePinnedToCore(sampleTask, "SensorTask", 4096, this, 1,
                            &_taskHandle, 0);
  }

  // Configura pino e calibração da bateria (chamar ANTES de begin())
  void setBatteryConfig(int pin, float calFactor) {
    _batteryPin = pin;
    _batteryCalFactor = calFactor;
  }

  // Tensão RAW (sem corte, para calibração)
  float getRawVoltage() { return _voltageRMS; }

  // Tensão processada (com corte de zero para UX limpa)
  float getVoltage() {
    if (_voltageRMS < 20.0) {
      return 0.0;
    }
    return _voltageRMS;
  }

  void setCalibration(float newFactor) { _calibrationFactor = newFactor; }

  // Bateria
  float getBatteryVoltage() { return _batteryVoltage; }
  void setBatteryCalibration(float newFactor) { _batteryCalFactor = newFactor; }
};

#endif

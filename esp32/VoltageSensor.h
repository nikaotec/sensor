#ifndef VOLTAGE_SENSOR_H
#define VOLTAGE_SENSOR_H

#include <Arduino.h>

class VoltageSensor {
private:
  int _pin;
  float _calibrationFactor;
  float _voltageRMS;
  TaskHandle_t _taskHandle;

  // Parâmetros de amostragem
  // 60Hz = 16.6ms. Amostrar por 100ms garante ~6 ciclos completos.
  static const int SAMPLE_WINDOW_MS = 100;

  // Função da Task que roda no Core 0 (ou 1, dependendo da config)
  static void sampleTask(void *pvParameters) {
    VoltageSensor *sensor = (VoltageSensor *)pvParameters;

    while (true) {
      while (true) {
        unsigned long startMillis = millis();
        int minVal = 4096;
        int maxVal = 0;

        // Amostra por 100ms (aprox 6 ciclos de 60Hz)
        while (millis() - startMillis < 100) {
          int val = analogRead(sensor->_pin);
          if (val < minVal)
            minVal = val;
          if (val > maxVal)
            maxVal = val;
          // Amostragem mais rápida possível, sem delay arbitrário
        }

        int p2p = maxVal - minVal;

        // Filtro de Ruído: Se pico-a-pico for muito baixo (ruído), zera.
        // Ruído típico sem carga é < 50 unidades.
        if (p2p < 25) {
          sensor->_voltageRMS = 0.0;
        } else {
          // Tensão Pico-a-Pico em Volts (ESP32 ADC -> 3.3V)
          // Vpp = p2p * (3.3 / 4095.0)
          // Vrms = Vpp * (1 / (2 * sqrt(2))) = Vpp * 0.35355
          // V_Real = V_rms * Calibração

          float v_p2p_adc = p2p * (3.3 / 4095.0);
          float v_rms_est = v_p2p_adc * 0.35355;

          // Aplica o Fator de Calibração (que deve ser alto agora, ex:
          // ~500-700)
          sensor->_voltageRMS = v_rms_est * sensor->_calibrationFactor;
        }

        vTaskDelay(pdMS_TO_TICKS(250)); // Atualiza 4x por segundo
      }
    }

  public:
    VoltageSensor(int pin, float calibrationFactor = 500.0) {
      _pin = pin;
      _calibrationFactor = calibrationFactor;
      _voltageRMS = 0.0;
      _taskHandle = NULL;
    }

    void begin() {
      analogReadResolution(12);
      analogSetAttenuation(ADC_11db);
      pinMode(_pin, INPUT);

      // Criar tarefa no Core 0 (o loop do Arduino roda no Core 1 no ESP32
      // padrão)
      xTaskCreatePinnedToCore(sampleTask,    // Função da tarefa
                              "VoltageTask", // Nome
                              4096,          // Stack size
                              this, // Parâmetro (ponteiro para o objeto)
                              1,    // Prioridade (baixa)
                              &_taskHandle, // Handle
                              0             // Core 0
      );
    }

    float getVoltage() { return _voltageRMS; }

    void setCalibration(float newFactor) { _calibrationFactor = newFactor; }
  };

#endif

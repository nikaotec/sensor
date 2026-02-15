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
    static void sampleTask(void* pvParameters) {
        VoltageSensor* sensor = (VoltageSensor*)pvParameters;
        
        while (true) {
            unsigned long startMillis = millis();
            double sumSquares = 0;
            int sampleCount = 0;
            
            // Leitura em 'burst' por SAMPLE_WINDOW_MS
            // Isso bloqueia a Task, mas NÃO o loop principal se rodar em outro Core/Task
            while (millis() - startMillis < SAMPLE_WINDOW_MS) {
                int sample = analogRead(sensor->_pin);
                // Ajuste de offset para ADC do ESP32 (0-4095, meio ~2048)
                // O ideal é medir o offset real, mas assumindo acoplamento AC com offset no hardware:
                // Se o hardware ZMPT101B tiver ajuste de offset para VCC/2, perfeito.
                // Caso contrário, usamos um filtro DC simples.
                
                // Filtro DC simples (subtrair média móvel ou fixa)
                // Para RMS real, vamos assumir que o zero é ~1980-2100 (depende do hardware)
                // Melhor: calcular Min/Max ou Média na janela para achar o zero dinamicamente
                float val = sample - 2048.0; // Centralizando (ajustar conforme hardware)
                sumSquares += val * val;
                sampleCount++;
                // Pequeno delay para não saturar o ADC e permitir yield
                delayMicroseconds(100); 
            }
            
            if (sampleCount > 0) {
                // Tensão RMS em Contas do ADC
                double meanSquare = sumSquares / sampleCount;
                float rmsADC = sqrt(meanSquare);
                
                // Converter para Volts (Calibração Empírica necessária)
                // V = rmsADC * Fator
                // O fator original 500.0 era para o código anterior que calculava tensão diferente
                // Tensão Real = (rmsADC * 3.3 / 4095.0) * Calibração
                // Simplificando: _voltageRMS = rmsADC * _calibrationFactor
                 // Como o usuário tinha um fator 500 (provavelmente compensando a tensão baixa do ADC)
                 // Vamos manter a lógica:
                 // adcVoltage = rms * (3.3 / 4095.0);
                 // voltage = adcVoltage * calibrationFactor;
                 
                 float adcVoltage = rmsADC * (3.3 / 4095.0);
                 sensor->_voltageRMS = adcVoltage * sensor->_calibrationFactor;
            }
            
            // Pausa entre leituras para dar folga à CPU
            vTaskDelay(pdMS_TO_TICKS(1000)); // Atualiza a cada 1 segundo
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

        // Criar tarefa no Core 0 (o loop do Arduino roda no Core 1 no ESP32 padrão)
        xTaskCreatePinnedToCore(
            sampleTask,   // Função da tarefa
            "VoltageTask", // Nome
            4096,         // Stack size
            this,         // Parâmetro (ponteiro para o objeto)
            1,            // Prioridade (baixa)
            &_taskHandle, // Handle
            0             // Core 0
        );
    }

    float getVoltage() {
        return _voltageRMS;
    }
    
    void setCalibration(float newFactor) {
        _calibrationFactor = newFactor;
    }
};

#endif

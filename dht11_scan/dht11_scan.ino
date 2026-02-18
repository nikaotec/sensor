/*
 * DHT11 GPIO Scanner
 *
 * Testa todos os GPIOs livres do ESP32 para encontrar
 * onde o DHT11 está conectado.
 *
 * COMO USAR:
 * 1. Faça upload deste sketch no ESP32
 * 2. Abra o Monitor Serial (115200 baud)
 * 3. Aguarde ~30 segundos
 * 4. O GPIO que responder será mostrado como "ENCONTRADO!"
 * 5. Depois de descobrir, volte a usar o esp32.ino normal
 */

#include <DHT.h>

// GPIOs livres (excluindo os já usados no projeto)
// Ocupados: 5(DS18B20), 19(Porta), 21(SDA), 22(SCL), 32(Rele), 34(ZMPT),
// 35(Bateria)
int pinsToTest[] = {2, 4, 12, 13, 14, 15, 16, 17, 18, 23, 25, 26, 27, 33};
int numPins = sizeof(pinsToTest) / sizeof(pinsToTest[0]);

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("==========================================");
  Serial.println("   DHT11 GPIO SCANNER - ESP32");
  Serial.println("==========================================");
  Serial.println("Testando GPIOs livres...");
  Serial.println();

  bool found = false;

  for (int i = 0; i < numPins; i++) {
    int pin = pinsToTest[i];
    Serial.print("GPIO ");
    Serial.print(pin);
    Serial.print(" -> ");

    DHT dht(pin, DHT11);
    dht.begin();
    delay(2000); // DHT11 precisa de 2s entre leituras

    // Tenta ler 3 vezes
    for (int attempt = 0; attempt < 3; attempt++) {
      float temp = dht.readTemperature();
      float hum = dht.readHumidity();

      if (!isnan(temp) && !isnan(hum)) {
        Serial.print("*** ENCONTRADO! *** Temp=");
        Serial.print(temp, 1);
        Serial.print("C  Umidade=");
        Serial.print(hum, 1);
        Serial.println("%");
        Serial.println();
        Serial.println("==========================================");
        Serial.print(">> DHT11 esta no GPIO ");
        Serial.print(pin);
        Serial.println(" <<");
        Serial.println("==========================================");
        found = true;
        break;
      }
      delay(500);
    }

    if (found)
      break;

    if (!found) {
      Serial.println("sem resposta");
    }
  }

  if (!found) {
    Serial.println();
    Serial.println("==========================================");
    Serial.println("DHT11 NAO ENCONTRADO em nenhum GPIO livre.");
    Serial.println("Verifique: fiacao, alimentacao 3.3V,");
    Serial.println("e se o resistor pull-up esta presente.");
    Serial.println("==========================================");
  }
}

void loop() {
  // Nada - scan roda apenas uma vez no setup
  delay(10000);
}

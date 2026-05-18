#ifndef ALERT_MANAGER_H
#define ALERT_MANAGER_H

#include <Arduino.h>

enum AlertStatus {
  ALERT_NONE,
  ALERT_STARTED,
  ALERT_REPEATED,
  ALERT_NORMALIZED
};

class AlertManager {
private:
  String _name;
  unsigned long _debounceTime;
  unsigned long _repeatInterval;

  unsigned long _startTime;
  unsigned long _lastAlertTime;
  bool _isActive;
  bool _inRecovery; // Para debounce na volta ao normal (opcional, simplificado
                    // aqui)

public:
  AlertManager(String name, unsigned long debounceTime,
               unsigned long repeatInterval);

  // Retorna o estado do alerta baseada na condição atual
  AlertStatus check(bool isErrorCondition);

  bool isActive() { return _isActive; }
  String getName() { return _name; }
  void setDebounce(unsigned long time) { _debounceTime = time; }
};

#endif

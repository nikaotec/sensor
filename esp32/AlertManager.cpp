#include "AlertManager.h"

AlertManager::AlertManager(String name, unsigned long debounceTime,
                           unsigned long repeatInterval) {
  _name = name;
  _debounceTime = debounceTime;
  _repeatInterval = repeatInterval;
  _startTime = 0;
  _lastAlertTime = 0;
  _isActive = false;
}

AlertStatus AlertManager::check(bool isErrorCondition) {
  unsigned long now = millis();

  if (isErrorCondition) {
    // Se detectou erro agora e não estava contando tempo
    if (_startTime == 0) {
      _startTime = now;
    }

    // Verifica Debounce (Persistência do erro)
    if (now - _startTime >= _debounceTime) {
      // Se o alerta ainda não está ativo, ATIVA
      if (!_isActive) {
        _isActive = true;
        _lastAlertTime = now;
        return ALERT_STARTED;
      }

      // Se já está ativo, verifica repetição
      if (now - _lastAlertTime >= _repeatInterval) {
        _lastAlertTime = now;
        return ALERT_REPEATED;
      }
    }
  } else {
    // Se a condição normalizou...
    _startTime = 0; // Reseta timer de início

    if (_isActive) {
      // Se estava ativo, desativa e avisa
      _isActive = false;
      return ALERT_NORMALIZED;
    }
  }

  return ALERT_NONE;
}

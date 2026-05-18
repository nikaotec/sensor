#include "AlertManager.h"

AlertManager::AlertManager(String name, unsigned long debounceTime,
                           unsigned long repeatInterval) {
  _name = name;
  _debounceTime = debounceTime;
  _repeatInterval = repeatInterval;
  _startTime = 0;
  _lastAlertTime = 0;
  _isActive = false;
  _inRecovery = false;
}

AlertStatus AlertManager::check(bool isErrorCondition) {
  unsigned long now = millis();

  if (isErrorCondition) {
    // Cancela qualquer tentativa de recuperação/normalização que estava em
    // andamento
    if (_inRecovery) {
      _inRecovery = false;
      _startTime = 0;
    }

    if (!_isActive) {
      // Se não está ativo, começa o debounce para ativar
      if (_startTime == 0) {
        _startTime = now;
      }
      if (now - _startTime >= _debounceTime) {
        _isActive = true;
        _lastAlertTime = now;
        _startTime = 0;
        return ALERT_STARTED;
      }
    } else {
      // Se já está ativo, envia repetições a cada _repeatInterval
      if (now - _lastAlertTime >= _repeatInterval) {
        _lastAlertTime = now;
        return ALERT_REPEATED;
      }
    }
  } else {
    // Não é condição de erro
    if (_isActive) {
      // Começa o debounce para normalizar
      if (!_inRecovery) {
        _inRecovery = true;
        _startTime = now;
      }
      if (now - _startTime >= _debounceTime) {
        _isActive = false;
        _inRecovery = false;
        _startTime = 0;
        return ALERT_NORMALIZED;
      }
    } else {
      // Garante estado resetado se parar de falhar antes de ativar
      _startTime = 0;
      _inRecovery = false;
    }
  }

  return ALERT_NONE;
}

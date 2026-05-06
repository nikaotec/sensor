# STATE.md — IoT Sensor Monitoring Platform

## Status Atual

- **Milestone:** 1 — Estabilidade e Escalabilidade
- **Fase Atual:** Fase 1 — Corrigir AlarmManager (Firmware)
- **Fase Status:** Não iniciada
- **Última atividade:** 2026-05-05 — Inicialização do projeto GSD

## Contexto para Próxima Sessão

O projeto está pronto para execução. O primeiro trabalho é a **Fase 1: AlarmManager**.

**Contexto crítico:**
- Bug ativo em produção: `chkVolt`, `chkBat`, `chkTemp`, `chkDoor` não respeitadas pelo firmware
- Trabalho anterior (conv. 92ffc94a) ficou incompleto — verificar `AlertManager.cpp` pelo estado atual
- Centenas de devices em campo, atualização só via cabo → OTA é Fase 2 (não adiar)
- Sem rollback de firmware → teste extensivo antes de qualquer deploy

**Decisões tomadas:**
- Modo interativo (confirma a cada fase)
- Granularidade fina (11 fases planejadas)
- Supabase = fonte de verdade para telemetria
- React Router v7 para migração de navegação

## Próximo Comando

```
/gsd-plan-phase 1
```

## Histórico de Fases

| Fase | Título | Status |
|------|--------|--------|
| 1 | Corrigir AlarmManager | ⏳ Pendente |
| 2 | OTA Firmware Update | ⏳ Pendente |
| 3 | Pipeline de Rollout | ⏳ Pendente |
| 4 | Testes Críticos | ⏳ Pendente |
| 5 | Segurança | ⏳ Pendente |
| 6 | Decomp. DeviceDetails | ⏳ Pendente |
| 7 | Decomp. ManagerPanel+Reports | ⏳ Pendente |
| 8 | React Router v7 | ⏳ Pendente |
| 9 | Consolidação DB | ⏳ Pendente |
| 10 | Performance | ⏳ Pendente |
| 11 | Limpeza | ⏳ Pendente |

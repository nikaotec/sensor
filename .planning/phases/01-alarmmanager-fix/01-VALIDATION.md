---
phase: 1
slug: alarmmanager-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Arduino Manual / Bench Test |
| **Config file** | none |
| **Quick run command** | `Manual: Trigger MQTT toggle` |
| **Full suite command** | `Manual: Bench test all 4 flags` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Verify buzzer state manually via Serial/Hardware
- **After every plan wave:** Full bench test of all 4 conditions
- **Before `/gsd-verify-work`:** All 4 flags must pass bench test
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | Phase 1 - 1 | — | N/A | manual | `Verify chkVolt toggle` | ✅ | ⬜ pending |
| 1-01-02 | 01 | 1 | Phase 1 - 2 | — | N/A | manual | `Verify chkBat toggle` | ✅ | ⬜ pending |
| 1-01-03 | 01 | 1 | Phase 1 - 3 | — | N/A | manual | `Verify chkTemp toggle` | ✅ | ⬜ pending |
| 1-01-04 | 01 | 1 | Phase 1 - 4 | — | N/A | manual | `Verify chkDoor toggle` | ✅ | ⬜ pending |
| 1-01-05 | 01 | 1 | Phase 1 - 5 | — | N/A | manual | `Verify Silenciar via MQTT` | ✅ | ⬜ pending |
| 1-01-06 | 01 | 1 | Phase 1 - 6 | — | N/A | manual | `Verify EEPROM Persistence` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Silenciamento Imediato | REQ-1 | Hardware Feedback | 1. Ativar alarme físico. 2. Desabilitar flag via Dashboard. 3. Buzzer deve parar em < 1s. |
| Persistência EEPROM | REQ-6 | Hardware State | 1. Desabilitar flag. 2. Reiniciar ESP32. 3. Verificar se flag continua desabilitada. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: manual verification performed
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

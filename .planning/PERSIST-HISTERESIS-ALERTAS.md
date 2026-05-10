# PLAN - Exibir Histerese e Alertas no DeviceCard (via MQTT)

**Data:** 2026-05-09  
**Fase:** Ajuste Dashboard - DeviceCard  
**Status:** PLANEJAMENTO (não executado)

---

## OBJETIVO

Exibir no DeviceCard os campos de histerese e alertas de temperatura/tensão recebidos via MQTT, **sem persistência no Supabase**. Os dados vem direto do ESP32 via MQTT e são exibidos em tempo real.

---

## ABORDAGEM SIMPLIFICADA

```
ESP32 → MQTT → useMqttData → DeviceCard (tempo real)
                         ↓
              device.telemetry.tempOn ✅
```

**Vantagens:**
- Sem alteração no banco de dados
- Sem alteração no n8n
- Atualização em tempo real
- Menos pontos de falha

---

## TAREFAS

### FASE 1: Verificar ESP32 (MQTT Payload)

- [ ] Confirmar que ESP32 envia campos no MQTT
  - `R0_TEMP_ON`, `R0_TEMP_OFF`, `R0_FUNC`
  - `ALARM_MAX`, `ALARM_MIN`
  - `VOLT_MAX_LIMIT`, `VOLT_MIN_LIMIT`
- [ ] Verificar arquivo: `esp32/esp32.ino:937-1009`

### FASE 2: Frontend - useMqttData (EXTRAIR)

- [ ] Modificar `dashboard/src/hooks/useMqttData.ts`
  - Extrair campos MQTT: `R0_TEMP_ON`, `R0_TEMP_OFF`, `ALARM_MAX`, `ALARM_MIN`, `VOLT_MAX_LIMIT`, `VOLT_MIN_LIMIT`
  - Armazenar em `device.telemetry` junto com os outros dados

### FASE 3: Frontend - SupabaseMapper (ATUALIZAR TIPO)

- [ ] Atualizar `dashboard/src/services/SupabaseMapper.ts`
  - Adicionar campos opcionais ao mapeamento (para não quebrar se vier vazio do Supabase)
  - Garantir que não dê erro se campo não existir

### FASE 4: Frontend - DeviceCard (EXIBIR)

- [ ] Adicionar seção "Histerese" no DeviceCard
  - `tempOn` - temperatura para ligar
  - `tempOff` - temperatura para desligar
  - `relayFunc` - função atual (AUTO/MANUAL/OFF)
  - Visível apenas para `isManager`

- [ ] Adicionar seção "Alertas Configurados"
  - `alarm_max` - temperatura máxima (°C)
  - `alarm_min` - temperatura mínima (°C)
  - `volt_max` - tensão máxima (V)
  - `volt_min` - tensão mínima (V)

- [ ] Layout: Nova seção após "Status do Equipamento" (relés)

---

## DESIGN SUGERIDO (DeviceCard)

```tsx
{/* HISTERESE (apenas managers) */}
{isManager && device.telemetry.tempOn !== undefined && (
  <div className="bg-[#0F110D] rounded-xl p-3 border border-[#2A2E24] mb-4">
    <div className="text-[9px] text-slate-500 font-bold uppercase mb-2">
      ⚙️ Histerese (Rele 0)
    </div>
    <div className="grid grid-cols-3 gap-2 text-center">
      <div>
        <div className="text-[8px] text-slate-500">Liga</div>
        <div className="text-sm font-bold text-amber-400">
          {device.telemetry.tempOn?.toFixed(1)}°C
        </div>
      </div>
      <div>
        <div className="text-[8px] text-slate-500">Desliga</div>
        <div className="text-sm font-bold text-blue-400">
          {device.telemetry.tempOff?.toFixed(1)}°C
        </div>
      </div>
      <div>
        <div className="text-[8px] text-slate-500">Modo</div>
        <div className="text-sm font-bold text-primary">
          {getRelayFuncLabel(device.telemetry.relayFunc)}
        </div>
      </div>
    </div>
  </div>
)}

{/* ALERTAS CONFIGURADOS */}
<div className="bg-[#0F110D] rounded-xl p-3 border border-[#2A2E24] mb-4">
  <div className="text-[9px] text-slate-500 font-bold uppercase mb-2">
    🔔 Limites de Alerta
  </div>
  <div className="grid grid-cols-2 gap-2 text-center">
    <div>
      <div className="text-[8px] text-slate-500">Temp Max</div>
      <div className="text-sm font-bold text-rose-400">
        {device.telemetry.alarm_max?.toFixed(1)}°C
      </div>
    </div>
    <div>
      <div className="text-[8px] text-slate-500">Temp Min</div>
      <div className="text-sm font-bold text-blue-400">
        {device.telemetry.alarm_min?.toFixed(1)}°C
      </div>
    </div>
    <div>
      <div className="text-[8px] text-slate-500">Volt Max</div>
      <div className="text-sm font-bold text-amber-400">
        {device.telemetry.volt_max?.toFixed(0)}V
      </div>
    </div>
    <div>
      <div className="text-[8px] text-slate-500">Volt Min</div>
      <div className="text-sm font-bold text-emerald-400">
        {device.telemetry.volt_min?.toFixed(0)}V
      </div>
    </div>
  </div>
</div>
```

---

## ARQUIVOS A MODIFICAR

| Arquivo | Ação |
|---------|------|
| `dashboard/src/hooks/useMqttData.ts` | Modificar |
| `dashboard/src/services/SupabaseMapper.ts` | Modificar (tipo) |
| `dashboard/src/components/dashboard/DeviceCard.tsx` | Modificar |

---

## ESTIMATIVA

- **Complexidade:** Baixa
- **Tempo estimado:** 1-2 horas
- **Riscos:**
  - Dados só existem quando ESP32 está online (não há fallback)

---

## SUCESSO

O DeviceCard exibe corretamente os valores de histerese e alertas em tempo real via MQTT, sem necessidade de persistência no banco.
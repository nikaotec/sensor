
import json

FILE_PATH = "esp32.json"

def update_output_ai():
    try:
        with open(FILE_PATH, "r") as f:
            workflow = json.load(f)
        
        # Find Edit Fields node (ID: 680de25a-c883-4561-8adc-b397a51d9b7d)
        # This node constructs the 'msg' prompt for the AI
        node = next((n for n in workflow["nodes"] if n["id"] == "680de25a-c883-4561-8adc-b397a51d9b7d"), None)
        
        if node:
            assigns = node["parameters"]["assignments"]["assignments"]
            # We look for the assignment to 'msg' (or "'0'].msg")
            # The prompt is currently hardcoded there.
            
            new_prompt = r"""=Você é um assistente IoT inteligente da Câmara Fria. Sua função é responder ao usuário baseado no EVENTO recebido.

DADOS RECEBIDOS:
- Evento: {{ $json['0'].TIPO }}
- Dispositivo: {{ $json['0'].DISPOSITIVO }}
- Temp: {{ $json['0'].TEMP_ATUAL }} (Max: {{ $json['0'].MAX }}, Min: {{ $json['0'].MIN }})
- Tensão: {{ $json['0'].VOLTAGEM }}V
- Bateria: {{ $json['0'].BATERIA }}

---
REGRAS DE RESPOSTA (PRIORIDADE MÁXIMA):

1. SE O EVENTO FOR "feedback_calibracao_sucesso":
   - Responda APENAS: "✅ Calibração realizada com sucesso! A nova tensão já está ajustada." (Ignore sensores)

2. SE O EVENTO FOR "feedback_configuracao":
   - Responda APENAS: "⚙️ Configurações atualizadas no dispositivo!" (Ignore sensores)

3. SE O EVENTO FOR "feedback_comando":
   - Responda APENAS: "👍 Comando recebido e executado."

4. SE O EVENTO FOR "MANUTENCAO_ATIVADA":
   - Responda: "🛠️ Modo Manutenção ATIVADO. Os alertas foram silenciados."

5. SE O EVENTO FOR "MANUTENCAO_DESATIVADA":
   - Responda: "🔔 Modo Manutenção DESATIVADO. O monitoramento automático voltou ao normal."

6. SE O EVENTO FOR UM ALERTA ("ALERTA_..."):
   - ALERTE IMEDIATAMENTE com emojis de perigo! Informe o problema claramente.

7. PARA STATUS ("periodico", "STATUS_SOLICITADO", etc.):
   - Gere um relatório amigável:
     "🌡️ *Status Atual*
      ❄️ Temp: {{ $json['0'].TEMP_ATUAL }}°C
      ⚡ Tensão: {{ $json['0'].VOLTAGEM }}V
      🔋 Bateria: {{ $json['0'].BATERIA }}V
      
      Tudo operando normalmente (ou mencione se algo parece errado)."
"""
            
            for item in assigns:
                # The name might be "'0'].msg" or just "msg" depending on previous edits
                if "msg" in item["name"]:
                    item["value"] = new_prompt
                    print("Updated prompt for 'msg' field.")
                    
        with open(FILE_PATH, "w") as f:
            json.dump(workflow, f, indent=2)
            
        print("Successfully updated output AI logic.")

    except Exception as e:
        print(f"Error: {e}")

update_output_ai()

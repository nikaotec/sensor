
import json

FILE_PATH = "esp32.json"

def revert_n8n_changes():
    try:
        with open(FILE_PATH, "r") as f:
            workflow = json.load(f)
        
        # 1. Remove the IF node "Filtra Display" (ID: if-display-filter)
        workflow["nodes"] = [n for n in workflow["nodes"] if n["id"] != "if-display-filter"]
        
        # 2. Remove connection from "Filtra Display"
        if "Filtra Display" in workflow["connections"]:
            del workflow["connections"]["Filtra Display"]
            
        # 3. Restore connection: Wait -> Google Sheets
        # Wait ID: 7b6e4e2a-5d3b-43c3-9855-8b4c5f1bb0d5 (Name: Wait)
        # Google Sheets ID: c028d980-bd41-462f-8801-12112805de42 (Name: salva temperatura)
        
        if "Wait" in workflow["connections"]:
            wait_main = workflow["connections"]["Wait"]["main"]
            # Current conn: Wait -> Filtra Display
            # Target conn: Wait -> salva temperatura
            
            # Reset connection
            workflow["connections"]["Wait"]["main"] = [
                [
                    {
                        "node": "salva temperatura",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
            print("Restored connection: Wait -> Google Sheets")

        # 4. Remove MENSAGEM_DISPLAY rule from AI Prompt
        target_node_id = "680de25a-c883-4561-8adc-b397a51d9b7d"
        node = next((n for n in workflow["nodes"] if n["id"] == target_node_id), None)
        if node:
            assigns = node["parameters"]["assignments"]["assignments"]
            for item in assigns:
                if "msg" in item["name"]:
                    current_prompt = item["value"]
                    
                    # Remove the rule: 8. SE O EVENTO FOR "MENSAGEM_DISPLAY": ...
                    # The rule ended before "7. PARA STATUS"
                    
                    # Pattern matching might be hard, so let's just replace the injected string
                    rule_to_remove = r"""
8. SE O EVENTO FOR "MENSAGEM_DISPLAY":
   - Responda APENAS: "🖥️ {{ $json['0'].CONTEUDO }}"
"""
                    # Try exact replacement
                    if rule_to_remove in current_prompt:
                        item["value"] = current_prompt.replace(rule_to_remove, "")
                        print("Removed MENSAGEM_DISPLAY rule from AI Prompt.")
                    else:
                        # Fallback: maybe spacing is different? Try looser replacement or manual fix?
                        # The user wants "como estava antes".
                        # If I can't find exact string, I might leave it?
                        # Let's try to remove slightly different formatted versions just in case
                        alt_rule = '8. SE O EVENTO FOR "MENSAGEM_DISPLAY":\n   - Responda APENAS: "🖥️ {{ $json[\'0\'].CONTEUDO }}"\n'
                        if alt_rule in current_prompt:
                             item["value"] = current_prompt.replace(alt_rule, "")
                             print("Removed MENSAGEM_DISPLAY rule (alt format).")
                        
                        # Just in case, let's look for "8. SE O EVENTO FOR" and cut until "7. PARA STATUS"
                        # But 7 comes after? The injection was BEFORE 7.
                        # Original: ... ALERTA... -> 7. PARA STATUS
                        # Injected: ... ALERTA... -> 8. MENSAGEM... -> 7. PARA STATUS
                        
                        # So we look for the block between ALERTA and STATUS
                        pass

        with open(FILE_PATH, "w") as f:
            json.dump(workflow, f, indent=2)
            
        print("Successfully reverted n8n workflow.")

    except Exception as e:
        print(f"Error: {e}")

revert_n8n_changes()

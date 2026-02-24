import json

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'r') as f:
    data = json.load(f)

for node in data['nodes']:
    if node['name'] == 'Code in JavaScript':
        print("Found Code in JavaScript")
        
        # We need to change: const isAdmin = (userRule.toUpperCase() === 'ADMIN');
        # To handle null or undefined userRule: const isAdmin = (userRule && typeof userRule === 'string' && userRule.toUpperCase() === 'ADMIN');
        
        new_code = """
const outputRaw = $input.item.json.output;
const remoteJid = $('Webhook').item.json.body.data.key.remoteJid;

let jsonString = outputRaw;
const codeBlockMatch = outputRaw.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/);
if (codeBlockMatch) {
    jsonString = codeBlockMatch[1];
} else {
    const jsonMatch = outputRaw.match(/\\{[\\s\\S]*\\}/);
    if (jsonMatch) jsonString = jsonMatch[0];
}

jsonString = jsonString.replace(/[\\u0000-\\u001F]+/g, "");

let dados;
try {
  dados = JSON.parse(jsonString);
} catch (e) {
  try {
      const clean = jsonString
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') 
          .replace(/'/g, '"'); 
      dados = JSON.parse(clean);
  } catch (e2) {
      return [{
          json: { error: "Falha crítica no parse JSON", intencao: "erro_parse_ia", requer_dados: false }
      }];
  }
}

// === VALIDAÇÃO NA BORDA (GLOBAL) ===
let userRule = "";
let userFound = false;

try {
    const editFieldsNode = $('Edit Fields').first();
    if (editFieldsNode && editFieldsNode.json) {
        if (editFieldsNode.json.RULE !== undefined && editFieldsNode.json.RULE !== null && editFieldsNode.json.RULE !== "") {
            userFound = true;
            userRule = editFieldsNode.json.RULE;
        } else {
            const sheetItems = $('Get row(s) in sheet1').all();
            if (sheetItems && sheetItems.length > 0 && Object.keys(sheetItems[0].json).length > 0 && sheetItems[0].json.NUMERO !== undefined && sheetItems[0].json.NUMERO !== null && sheetItems[0].json.NUMERO !== "") {
               userFound = true;
               userRule = "USER";
            }
        }
    }
} catch(err) {
    userFound = false;
}

if (!userFound) {
    return [{
      json: {
        intencao: "BLOQUEADO",
        mensagem_erro: "🚫 *Acesso Bloqueado*\\nDesculpe, seu número não está cadastrado no sistema para acessar este serviço nem para consultar relatórios.",
        is_admin: false
      }
    }];
}

// CORREÇÃO: Garante que userRule não é null e é uma string antes de chamar toUpperCase()
const isAdmin = (userRule && typeof userRule === 'string' && userRule.toUpperCase() === 'ADMIN');

return [
  {
    json: {
      intencao: dados.intencao ? dados.intencao.trim() : null,
      temp_max: dados.temp_max, 
      temp_min: dados.temp_min,
      volt_max: dados.volt_max,
      volt_min: dados.volt_min,
      nova_tensao: dados.nova_tensao,
      novo_fator: dados.novo_fator, 
      bat_min: dados.bat_min,
      tempo_porta: dados.tempo_porta,
      novo_numero: dados.novo_numero,
      requer_dados: dados.requer_dados,
      fonte_dados: dados.fonte_dados,
      is_admin: isAdmin,
      parametros: {
        solicitacao_original: dados.parametros ? dados.parametros.solicitacao_original : null,
        detalhe: dados.parametros ? dados.parametros.detalhe : null
      }
    }
  }
];
"""
        node['parameters']['jsCode'] = new_code

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'w') as f:
    json.dump(data, f, indent=2)
print("Updated n8n logic to fix TypeError.")

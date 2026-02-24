import json

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'r') as f:
    data = json.load(f)

for node in data['nodes']:
    if node['name'] == 'Code in JavaScript':
        # the bug is because Get row(s) in sheet1 returns data array and we need to check if there is an item
        # Also let's make it more robust. When it doesn't match, n8n with alwaysOutputData=true returns { "json": {} } usually.
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
    const sheetItems = $('Get row(s) in sheet1').all();
    
    if (sheetItems && sheetItems.length > 0) {
        const row = sheetItems[0].json;
        // Se a planilha retornou com a chave NUMERO e ela for uma string/numero valido
        if (row && typeof row === 'object' && ('NUMERO' in row)) {
             // as vezes o n8n retona NUMERO: "" quando n acha
             if (row.NUMERO !== null && row.NUMERO !== "") {
                 userFound = true;
                 userRule = row.RULE || "";
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

const isAdmin = (userRule.toUpperCase() === 'ADMIN');

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
print("Updated n8n logic successfully again.")

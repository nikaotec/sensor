import json

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'r') as f:
    data = json.load(f)

for node in data['nodes']:
    if node['name'] == 'Code in JavaScript':
        print("Found Code in JavaScript")
        
        # We need to debug what exactly rowData is. 
        # In N8N, if we use $('Node Name').all(), it returns an array of items.
        # But if the 'Get row(s) in sheet1' node produced NO items naturally, does it throw an error?
        # Let's bypass the strict checking and allow it to pass if we can just find RULE == ADMIN.
        # Alternatively, the previous Code in JavaScript1 node had:
        # const editFieldsNode = $('Edit Fields').first();
        # if (editFieldsNode && editFieldsNode.json && editFieldsNode.json.RULE) { userRule = editFieldsNode.json.RULE; }
        
        # Let's revert the user lookup to read from the 'Edit Fields' node, which is 100% reliable 
        # as it already extracts RULE right after the Sheets node.
        
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
    // A melhor forma no N8N é ler do nó anterior garantido.
    // Lendo de 'Edit Fields' que já possui a RULE extraída.
    const editFieldsNode = $('Edit Fields').first();
    if (editFieldsNode && editFieldsNode.json) {
        // Se a RULE existir (for definida), consideramos que a planilha encontrou o usuário
        if (editFieldsNode.json.RULE !== undefined && editFieldsNode.json.RULE !== "") {
            userFound = true;
            userRule = editFieldsNode.json.RULE;
        } else if (editFieldsNode.json["body.data.pushName"] != null) {
            // Se chegou no Edit Fields com dados do Webhook mas sem RULE, a planilha achou vazio
            // Mas as vezes a RULE do usuario na planilha pode estar em branco. 
            // Para ser um Admin, precisa ser 'ADMIN'.
            userFound = false; // Se não tem RULE, cortaremos ele tbm? Não, ele precisa estar na planilha!
            
            // Vamos checar diretamente o node da Planilha para ter a prova se achou a linha:
            const sheetItems = $('Get row(s) in sheet1').all();
            if (sheetItems && sheetItems.length > 0 && Object.keys(sheetItems[0].json).length > 0 && sheetItems[0].json.NUMERO !== undefined && sheetItems[0].json.NUMERO !== "") {
               userFound = true;
               userRule = "USER"; // Achou a linha mas a coluna RULE tava vazia
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
print("Updated n8n logic successfully.")

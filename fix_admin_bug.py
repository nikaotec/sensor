import json

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'r') as f:
    data = json.load(f)

for node in data['nodes']:
    # Fix the issue where an Admin user is getting blocked. 
    # The bug is very likely in 'Code in JavaScript' right after AI Agent.
    # The getItems/all() from the Google Sheets node inside 'Code in JavaScript' 
    # probably doesn't have the 'NUMERO' field formatted as string, 
    # or the node 'Get row(s) in sheet1' returns an empty array when executed downstream in N8N.
    # WAIT: In N8N, accessing data from ANOTHER branch using $('Node Name').all() 
    # in an earlier node can fail if that node hasn't run yet or runs before it! 
    # Actually, 'Get row(s) in sheet1' runs FIRST! So it is available.
    # Let's check how we accessed it:
    # const sheetItems = $('Get row(s) in sheet1').all();
    # Let's remove the strict `rowData.NUMERO !== ""` check and just do a safe fallback.
    
    if node['name'] == 'Code in JavaScript':
        print("Found Code in JavaScript")
        new_code = """
const outputRaw = $input.item.json.output;
const remoteJid = $('Webhook').item.json.body.data.key.remoteJid;

// 1. Extração robusta do bloco JSON (Markdown ou texto puro)
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
    // Busca dados do nó 'Edit Fields' que carrega o RULE garantido
    // Ou direto do Google Sheets
    const items = $('Get row(s) in sheet1').all();
    
    if (items && items.length > 0) {
        // Se a planilha devolveu algum dado real.
        // Cuidado com o "Always Output Data", que as vezes devolve [{ json: {} }]
        const row = items[0].json;
        if (Object.keys(row).length > 0) {
            // Existe Pelo menos algum dado e não é um object vazio emitido por AlwaysOutputData
            // Cuidado adicional: a coluna NUMERO pode vir como string ou numero, e as vezes n existir no fallback vazio.
            if ("NUMERO" in row && (row.NUMERO !== null && row.NUMERO !== "")) {
                userFound = true;
                userRule = row.RULE || "";
            }
        }
    }
} catch(err) {
    userFound = false;
}

// Se o usuário tentar acessar do próprio painel do N8N executando manualmente (Execute Workflow)
// as vezes os dados não batem direito. Ou se o nó Sheets falhar, vamos bloquear.
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

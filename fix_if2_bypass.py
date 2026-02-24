import json

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'r') as f:
    data = json.load(f)

# The logic right now:
# Webhook -> Get row(s) in sheet1 -> Edit Fields -> If
# If -> TRUE -> AI Agent -> Code in JavaScript -> If2
# If2 splits the flow:
#  - TRUE -> AI Agent1 -> Code in JavaScript2 -> Get row(s) in sheet -> ... -> Send PDF
#  - FALSE -> Edit Fields1 -> If1 -> Code in JavaScript1 -> Switch Validation -> ...

# Since the user logic is inside 'Code in JavaScript1', If2 bypasses it completely!
# To fix this, we need to extract the User Validation logic from 'Code in JavaScript1' 
# and put it BEFORE 'If2'. Or better yet, inside 'Code in JavaScript' right after 'AI Agent' 
# (which processes the text into JSON).

for node in data['nodes']:
    # 1. We will move the user validation block into 'Code in JavaScript' 
    if node['name'] == 'Code in JavaScript':
        print("Found Code in JavaScript (Before If2)")
        
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
    if (jsonMatch) {
        jsonString = jsonMatch[0];
    }
}

// Remove caracteres de controle inválidos
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
          json: {
            error: "Falha crítica no parse JSON",
            intencao: "erro_parse_ia",
            requer_dados: false
          }
      }];
  }
}

// === VALIDAÇÃO NA BORDA (GLOBAL) ===
let userRule = "";
let userFound = false;

try {
    const sheetItems = $('Get row(s) in sheet1').all();
    if (sheetItems && sheetItems.length > 0) {
        const rowData = sheetItems[0].json;
        if (rowData && Object.keys(rowData).length > 0 && rowData.NUMERO !== undefined && rowData.NUMERO !== "") {
            userFound = true;
            userRule = rowData.RULE || "";
        }
    }
} catch(err) {
    userFound = false;
}

// Bloqueia QUALQUER comando ou relatório se o número não estiver cadastrado
if (!userFound) {
    // Retornamos um objeto que forçará o Switch/Flow a devolver a mensagem de erro direto
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
      is_admin: isAdmin, // Passa se é admin para o resto do fluxo
      parametros: {
        solicitacao_original: dados.parametros ? dados.parametros.solicitacao_original : null,
        detalhe: dados.parametros ? dados.parametros.detalhe : null
      }
    }
  }
];
"""
        node['parameters']['jsCode'] = new_code

    # 2. We need to catch this 'BLOQUEADO' intention earlier. 
    # If If2 checks if (intencao contains 'consultar_relatorio'), 
    # BLOQUEADO will go to the FALSE branch (Edit Fields1).
    # Then in Code In JavaScript1, we just return the error immediately if intencao == "BLOQUEADO"
    
    if node['name'] == 'Code in JavaScript1':
        print("Found Code in JavaScript1 (After If2)")
        new_code = """
try {
    const item = $input.first().json;
    const outputRaw = item.intencao;
    const remoteJid = item.remoteJid;

    if (!outputRaw) {
        return { error: "Campo 'intencao' não encontrado ou vazio" };
    }

    if (outputRaw === "BLOQUEADO") {
        return {
            destination: "whatsapp",
            message: item.mensagem_erro || "🚫 Acesso Bloqueado",
            remoteJid: remoteJid
        };
    }

    let dados = item;
    const isAdmin = dados.is_admin === true;
    
    // === VALIDAÇÃO DE PERMISSÃO (ADMIN) ===
    const comandosLiberados = ["obter_status_atual", "obter_ambiente", "consultar_relatorio", "nenhuma_intencao"];
    if (!isAdmin && dados.intencao && !comandosLiberados.includes(dados.intencao)) {
        return {
            destination: "whatsapp",
            message: "⚠️ *Acesso Negado*\\nDesculpe, você não tem permissão de administrador para executar este comando.\\n\\nVocê pode apenas consultar status e relatórios.",
            remoteJid: remoteJid
        };
    }

    // === GERENCIAMENTO DE USUARIOS ===
    if (dados.intencao === "adicionar_admin") {
        if (!dados.novo_numero || dados.requer_dados) {
            return {
                destination: "whatsapp",
                message: "Por favor, me informe o número com DDD que deseja adicionar como Administrador (Ex: 81999999999).",
                remoteJid: remoteJid
            };
        }
        
        let num_limpo = dados.novo_numero.toString().replace(/\\D/g, '');
        
        return {
            destination: "sheets_add_user",
            message: "⏳ *Cadastrando Administrador...*\\nAdicionando o número " + num_limpo + " ao sistema.",
            remoteJid: remoteJid,
            novo_numero: num_limpo,
            nova_role: "ADMIN"
        };
    }
    
    // Resposta normalizada
    let resposta = {
        intencao: dados.intencao || "nenhuma_intencao",
        destination: "mqtt", // Default
        remoteJid: remoteJid,
        is_admin: isAdmin
    };

    if (dados.requer_dados) {
        return {
            destination: "whatsapp",
            message: "Entendi seu pedido de " + dados.intencao.replace('_', ' ') + ", mas preciso de mais detalhes. Qual o valor desejado?",
            remoteJid: remoteJid
        };
    }

    // Mapeamento de Campos
    const campos = ["temp_max", "temp_min", "volt_max", "volt_min", "bat_min", "tempo_porta", "nova_tensao", "novo_fator"];
    campos.forEach(c => {
        if (dados[c] !== undefined && dados[c] !== null) resposta[c] = parseFloat(dados[c]);
    });
    
    return resposta;

} catch (e) {
    return {
        error: "Erro no processamento",
        detalhe: e.message
    };
}
"""
        node['parameters']['jsCode'] = new_code

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'w') as f:
    json.dump(data, f, indent=2)
print("Updated n8n workflow completely.")

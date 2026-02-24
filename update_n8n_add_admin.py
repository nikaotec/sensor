import json

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'r') as f:
    data = json.load(f)

for node in data['nodes']:
    # Update AI Agent Prompt to understand "adicionar admin"
    if node['name'] == 'AI Agent':
        text = node['parameters']['text']
        if '- adicionar_admin' not in text:
            # Add to INTENÇÕES POSSÍVEIS
            text = text.replace('INTENÇÕES POSSÍVEIS:\n', 'INTENÇÕES POSSÍVEIS:\n- adicionar_admin (parâmetros: novo_numero)\n')
            
            # Add to REGRAS DE EXTRAÇÃO
            extraction_rule = """
11. Se a mensagem for "Adicionar o numero 81999999999 como admin", retorne:
   { "intencao": "adicionar_admin", "novo_numero": "81999999999" }
"""
            text = text.replace('FORMATO DE SAÍDA OBRIGATÓRIO:', extraction_rule + '\nFORMATO DE SAÍDA OBRIGATÓRIO:')
            
            # Add novo_numero to FORMATO DE SAIDA
            text = text.replace('"tempo_porta": number | null,\n', '"tempo_porta": number | null,\n  "novo_numero": "string | null",\n')
            
            node['parameters']['text'] = text

    # Update JS script
    if node['name'] == 'Code in JavaScript1':
        new_code = """
try {
    const item = $input.first().json;
    const outputRaw = item.intencao;
    const remoteJid = item.remoteJid;

    if (!outputRaw) {
        return { error: "Campo 'intencao' não encontrado ou vazio" };
    }

    let dados = item;
    
    // RECUPERA A ROLE DO USUARIO DA PLANILHA
    let userRule = "";
    let userFound = false;
    try {
        const sheetItems = $('Get row(s) in sheet1').all();
        if (sheetItems && sheetItems.length > 0) {
            const rowData = sheetItems[0].json;
            if (rowData && Object.keys(rowData).length > 0 && rowData.NUMERO !== undefined) {
                userFound = true;
                userRule = rowData.RULE || "";
            }
        }
    } catch(err) {
        userFound = false;
    }
    
    // === VALIDAÇÃO DE USUÁRIO DESCONHECIDO ===
    // Bloqueia QUALQUER comando se não estiver na planilha
    if (!userFound) {
        return {
            destination: "whatsapp",
            message: "🚫 *Acesso Bloqueado*\\nDesculpe, seu número não está cadastrado no sistema para acessar este serviço nem para consultar relatórios.",
            remoteJid: remoteJid
        };
    }

    const isAdmin = (userRule.toUpperCase() === 'ADMIN');
    
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
        return {
            destination: "sheets_add_user",
            message: "⏳ *Cadastrando Administrador...*\\nAdicionando o número " + dados.novo_numero + " ao sistema.",
            remoteJid: remoteJid,
            novo_numero: dados.novo_numero,
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

    // === VALIDAÇÃO DE DADOS FALTANTES (Chatbot) ===
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

    # Add branch to Switch for adding users
    if node['name'] == 'Switch Validation':
        if len(node['parameters']['rules']['values']) == 2:
            node['parameters']['rules']['values'].append({
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict",
                        "version": 1
                    },
                    "conditions": [
                        {
                            "leftValue": "={{ $json.destination }}",
                            "rightValue": "sheets_add_user",
                            "operator": {
                                "type": "string",
                                "operation": "equals"
                            },
                        }
                    ],
                    "combinator": "and"
                },
                "renameOutput": True,
                "outputKey": "sheets_add_user"
            })

# Add Google Sheets Append node and Send Text node for success feedback
# We need to find the ID of the Switch Validation node and Evolution node
switch_id = ""
sheets_cred = {}
evolve_cred = {}
for n in data['nodes']:
    if n['name'] == 'Switch Validation':
        switch_id = n['id']
    if n['name'] == 'Get row(s) in sheet1' and 'credentials' in n:
        sheets_cred = n['credentials']
    if n['name'] == 'Responder Erro' and 'credentials' in n:
        evolve_cred = n['credentials']

import uuid
sheets_add_id = str(uuid.uuid4())
evolve_ok_id = str(uuid.uuid4())

data['nodes'].append({
    "parameters": {
        "operation": "append",
        "documentId": {
            "__rl": True,
            "value": "1HTEAOfzwIQqUdf3bywOHMFVmktT3N51mtiLzpbP3Lm4",
            "mode": "list",
            "cachedResultName": "users_casinhas",
            "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1HTEAOfzwIQqUdf3bywOHMFVmktT3N51mtiLzpbP3Lm4/edit?usp=drivesdk"
        },
        "sheetName": {
            "__rl": True,
            "value": "gid=0",
            "mode": "list",
            "cachedResultName": "Página1",
            "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1HTEAOfzwIQqUdf3bywOHMFVmktT3N51mtiLzpbP3Lm4/edit#gid=0"
        },
        "columns": {
            "mappingMode": "defineBelow",
            "value": {
                "NUMERO": "={{ $json.novo_numero }}",
                "RULE": "={{ $json.nova_role }}"
            },
            "matchingColumns": [],
            "schema": [
                {
                    "id": "NUMERO",
                    "displayName": "NUMERO",
                    "required": False,
                    "defaultMatch": False,
                    "display": True,
                    "type": "string",
                    "canBeUsedToMatch": True
                },
                {
                    "id": "RULE",
                    "displayName": "RULE",
                    "required": False,
                    "defaultMatch": False,
                    "display": True,
                    "type": "string",
                    "canBeUsedToMatch": True
                }
            ],
            "attemptToConvertTypes": False,
            "convertFieldsToString": False
        },
        "options": {}
    },
    "type": "n8n-nodes-base.googleSheets",
    "typeVersion": 4.7,
    "position": [
        56288,
        27264
    ],
    "id": sheets_add_id,
    "name": "Add Admin to Sheet",
    "credentials": sheets_cred
})

data['nodes'].append({
    "parameters": {
        "resource": "messages-api",
        "instanceName": "sensor_temperatura",
        "remoteJid": "={{ $json.remoteJid }}",
        "messageText": "✅ *Administrador cadastrado com sucesso!*\\n\\nO número {{ $json.novo_numero }} agora tem acesso de administrador ao sistema.",
        "options_message": {}
    },
    "type": "n8n-nodes-evolution-api.evolutionApi",
    "typeVersion": 1,
    "position": [
        56512,
        27264
    ],
    "id": evolve_ok_id,
    "name": "Responder Sucesso Admin",
    "credentials": evolve_cred
})

# Update connections
if 'Switch Validation' in data['connections']:
    # Add third connection path
    if len(data['connections']['Switch Validation']['main']) == 2:
        data['connections']['Switch Validation']['main'].append([
            {
                "node": "Add Admin to Sheet",
                "type": "main",
                "index": 0
            }
        ])

data['connections']['Add Admin to Sheet'] = {
    "main": [
        [
            {
                "node": "Responder Sucesso Admin",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'w') as f:
    json.dump(data, f, indent=2)
print("Updated n8n workflow completely.")

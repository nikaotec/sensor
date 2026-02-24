import json

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'r') as f:
    data = json.load(f)

for node in data['nodes']:
    # Add alwaysOutputData to Google Sheets node
    if node['name'] == 'Get row(s) in sheet1':
        print("Found Google Sheets node!")
        if 'options' not in node['parameters']:
            node['parameters']['options'] = {}
        # Em n8n, under options or at the top level for the node?
        # usually it's in node['parameters']['options']['alwaysOutputData'] = true
        # wait, sometimes it is under node['alwaysOutputData'] = true
        node['alwaysOutputData'] = True

    # Update the JS script
    if node['name'] == 'Code in JavaScript1':
        print("Found JS node!")
        
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
        // Se a planilha retornou item vazio ou sem os campos da planilha, usuario nao encontrado
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
    if (!userFound) {
        return {
            destination: "whatsapp",
            message: "🚫 *Acesso Bloqueado*\\nDesculpe, seu número não está cadastrado no sistema para acessar este serviço.",
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

    // === ATUALIZAÇÃO DE STATUS ===
    if (dados.intencao === "obter_status_atual") {
        // Envia comando para ESP32 e aguarda resposta
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
print("Updated n8n workflow successfully.")

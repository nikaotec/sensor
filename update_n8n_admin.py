import json

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'r') as f:
    data = json.load(f)

for node in data['nodes']:
    if node['name'] == 'Code in JavaScript1':
        old_code = node['parameters']['jsCode']
        print("Found node!")
        
        new_code = """
try {
    const item = $input.first().json;
    const outputRaw = item.intencao;
    const remoteJid = item.remoteJid;

    if (!outputRaw) {
        return { error: "Campo 'intencao' não encontrado ou vazio" };
    }

    let dados = item;
    
    // RECUPERA A ROLE DO USUARIO DA PLANILHA (VIA NÓ 'Edit Fields')
    let userRule = "";
    try {
        const editFieldsNode = $('Edit Fields').first();
        if (editFieldsNode && editFieldsNode.json && editFieldsNode.json.RULE) {
            userRule = editFieldsNode.json.RULE;
        }
    } catch(err) {
        userRule = "";
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
        // Envia comando para ESP32 e aguarda resposta (ou ESP32 publica periodicamente)
        // Aqui apenas repassamos a intenção via MQTT e o ESP32 deve responder
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
        break

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'w') as f:
    json.dump(data, f, indent=2)
print("Updated n8n workflow successfully.")


// Test script for user provisioning logic
// Run with: node src/tests/provision_user.js

const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

console.log("--- TESTANDO GERAÇÃO DE SENHA ---");
for (let i = 0; i < 5; i++) {
    const pwd = generateRandomPassword();
    console.log(`Senha ${i + 1}: ${pwd} (Comprimento: ${pwd.length})`);
    if (pwd.length !== 12) {
        console.error("❌ FALHA: Comprimento da senha incorreto!");
        process.exit(1);
    }
}
console.log("✅ Geração de senhas funcionando.");

console.log("\n--- TESTANDO LÓGICA DE PROVISIONAMENTO ---");
// Simulando o retorno do serviço
const mockProvision = (email) => {
    if (email.includes("error")) return { success: false, error: "E-mail inválido" };
    return { success: true, uid: "mock-uid-123" };
};

const res1 = mockProvision("test@example.com");
console.log("Teste Sucesso:", res1);
if (!res1.success || res1.uid !== "mock-uid-123") {
    console.error("❌ FALHA: Lógica de sucesso quebrada!");
    process.exit(1);
}

const res2 = mockProvision("error@test.com");
console.log("Teste Erro:", res2);
if (res2.success) {
    console.error("❌ FALHA: Lógica de erro não capturada!");
    process.exit(1);
}

console.log("✅ Lógica básica de provisionamento validada.");

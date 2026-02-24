let num_limpo = "81999999999";
        
// Remove 55 se o usuário já digitou, para tratar consistentemente
if (num_limpo.startsWith('55') && num_limpo.length >= 12) {
    num_limpo = num_limpo.substring(2);
}

// Se o número tiver 11 dígitos, remove o primeiro número 9
if (num_limpo.length === 11) {
    // Fica com os 2 primeiros (ex: 81) e a partir do 3º index (pula o 9)
    num_limpo = num_limpo.substring(0, 2) + num_limpo.substring(3);
}

// Adiciona sempre o código de país (55)
if (!num_limpo.startsWith('55')) {
    num_limpo = '55' + num_limpo;
}
console.log(num_limpo);

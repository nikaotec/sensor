function format(novo_numero) {
    let num_limpo = novo_numero.toString().replace(/\D/g, '');
        
    // Remove 55 se o usuário já digitou, para tratar consistentemente
    if (num_limpo.startsWith('55') && num_limpo.length >= 12) {
        num_limpo = num_limpo.substring(2);
    }
    
    // Se o número tiver 11 dígitos, remove o primeiro número 9
    if (num_limpo.length === 11) {
        // Fica com o DDD (2 dígitos, ex. 81) e depois dos 9 de celular
        num_limpo = num_limpo.substring(0, 2) + num_limpo.substring(3);
    }
    
    // Adiciona sempre o código de país (55)
    if (!num_limpo.startsWith('55')) {
        num_limpo = '55' + num_limpo;
    }
    return num_limpo;
}

console.log(format('81999999999') + " -> 558199999999");
console.log(format('5581999999999') + " -> 558199999999");
console.log(format('558199999999') + " -> 558199999999");
console.log(format('8199999999') + " -> 558199999999");

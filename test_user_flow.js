
const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 0) return '';
    const limited = digits.slice(0, 13);
    let result = '+' + limited;
    if (limited.length > 2) result = '+' + limited.slice(0, 2) + ' ' + limited.slice(2);
    if (limited.length > 4) result = '+' + limited.slice(0, 2) + ' ' + limited.slice(2, 4) + ' ' + limited.slice(4);
    if (limited.length > 9) result = '+' + limited.slice(0, 2) + ' ' + limited.slice(2, 4) + ' ' + limited.slice(4, 9) + '-' + limited.slice(9);
    return result;
};

const testCases = [
    { input: '5', expected: '+5' },
    { input: '55', expected: '+55' },
    { input: '558', expected: '+55 8' },
    { input: '5581', expected: '+55 81' },
    { input: '55819', expected: '+55 81 9' },
    { input: '558199999', expected: '+55 81 99999' },
    { input: '5581999999', expected: '+55 81 99999-9' },
    { input: '5581999999999', expected: '+55 81 99999-9999' }
];

console.log('--- Testando Formatação ---');
testCases.forEach(tc => {
    const result = formatPhone(tc.input);
    const status = result === tc.expected ? 'PASS' : 'FAIL';
    console.log(`Input: ${tc.input} | Expected: ${tc.expected} | Result: ${result} | ${status}`);
    if (status === 'FAIL') process.exit(1);
});

console.log('\n--- Testando Mapeamento ---');
const newUserWhatsapp = '+55 81 99999-9999';
const payload = {
    phone: newUserWhatsapp || null,
};
console.log('Payload phone:', payload.phone);
if (payload.phone !== newUserWhatsapp) {
    console.log('FAIL: Payload field mismatch');
    process.exit(1);
}

console.log('\nTODOS OS TESTES PASSARAM!');

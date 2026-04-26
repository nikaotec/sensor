const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

const formatSP = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

console.log("firstDay:", formatSP(firstDay));
console.log("lastDay:", formatSP(lastDay));

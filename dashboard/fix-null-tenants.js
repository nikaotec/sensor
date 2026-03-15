const fs = require('fs');
const path = require('path');

const tsxFiles = ['Alerts.tsx', 'DeviceDetails.tsx', 'DeviceList.tsx', 'Reports.tsx', 'Settings.tsx', 'Sidebar.tsx'];

for (const file of tsxFiles) {
    const fullPath = path.join(__dirname, 'src', 'components', file);
    let content = fs.readFileSync(fullPath, 'utf-8');

    // For Sidebar, replace currentTenant.name with currentTenant?.name to avoid breaking hooks
    if (file === 'Sidebar.tsx') {
        content = content.replace(/currentTenant\.name/g, 'currentTenant?.name');
        fs.writeFileSync(fullPath, content);
        continue;
    }

    // For others, insert early return
    const match = content.match(/const\s+\{\s*currentTenant([^\}]*)\}\s*=\s*useTenant\(\);/);
    if (match) {
        if (!content.includes('if (!currentTenant) return')) {
            const index = match.index + match[0].length;
            const newContent = content.slice(0, index) + '\n    if (!currentTenant) return <div className="p-8">Carregando dados da Empresa...</div>;' + content.slice(index);
            fs.writeFileSync(fullPath, newContent);
            console.log('Fixed', file);
        }
    }
}

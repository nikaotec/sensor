import sys

filepath = "/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc849/home/antonio/Documentos/projetos/n8n/workflows/sensor/dashboard/src/components/DeviceList.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

output = []
found = False
for i, line in enumerate(lines):
    output.append(line)
    if "{device.location && (" in line:
        found = True
    if found and ")}" in line and i > 120 and i < 132:
        # insert after
        output.append("""                                                         {currentTenant?.id === 'all' && (
                                                             <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md mt-1.5 inline-block font-medium">
                                                                 {availableTenants.find(t => t.id === device.tenantId)?.name || device.tenantId}
                                                             </span>
                                                         )}
""")
        found = False # trigger once

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(output)
print("DeviceList.tsx updated via line-by-line.")

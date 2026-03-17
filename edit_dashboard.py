import sys

filepath = "/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc849/home/antonio/Documentos/projetos/n8n/workflows/sensor/dashboard/src/components/Dashboard.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

placeholder = """                                                     {device.location && (
                                                         <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                             <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                                             {device.location}
                                                         </p>
                                                     )}"""

new_text = placeholder + "\n" + """                                                     {currentTenant?.id === 'all' && (
                                                         <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md mt-1.5 inline-block font-medium">
                                                             {availableTenants.find(t => t.id === device.tenantId)?.name || device.tenantId}
                                                         </span>
                                                     )}"""

if placeholder in content:
    content = content.replace(placeholder, new_text)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Dashboard.tsx updated successfully.")
else:
    # Try with another indentation or spaces
    print("Placeholder not found.")
    # Fallback to simple replace
    if "{device.location}" in content:
        print("Found device.location, fallback to string split.")
        parts = content.split("{device.location}")
        # There might be multiple? Usually one for DeviceList etc but let's see.
        # It's better to provide a more specific script that reads line by line.

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

output = []
for i, line in enumerate(lines):
    output.append(line)
    if "p className=\"text-xs text-slate-400 mt-0.5 flex items-center gap-1.5\"" in line:
        pass # just viewing

# Safer re-write line by line matching
output = []
skip = False
found = False
for i, line in enumerate(lines):
    output.append(line)
    if "{device.location && (" in line:
        found = True
    if found and ")}" in line and i > 200 and i < 210:
        # insert after
        output.append("""                                                     {currentTenant?.id === 'all' && (
                                                         <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md mt-1.5 inline-block font-medium">
                                                             {availableTenants.find(t => t.id === device.tenantId)?.name || device.tenantId}
                                                         </span>
                                                     )}
""")
        found = False # trigger once

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(output)
print("Dashboard.tsx updated via line-by-line.")

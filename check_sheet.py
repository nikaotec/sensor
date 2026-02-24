import json

with open('/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/mqtt receive.json', 'r') as f:
    data = json.load(f)

for n in data['nodes']:
    if n['name'] == 'Get row(s) in sheet1':
        print(json.dumps(n, indent=2))
        break


import json
import uuid

# Paths
json_path = "mqtt receive.json"
html_path = "relatorio_admin.html"

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

with open(html_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

# 1. Disconnect Code in JavaScript3 from HTML
if "Code in JavaScript3" in data.get("connections", {}):
    conn_list = data["connections"]["Code in JavaScript3"].get("main", [])
    if len(conn_list) > 0:
        # Filter out connection to HTML
        new_conn = [c for c in conn_list[0] if c.get("node") != "HTML"]
        data["connections"]["Code in JavaScript3"]["main"] = [new_conn]

# 2. Add 'Check Admin Report' Node
if_node_name = "Check Admin Report"
if_node_id = str(uuid.uuid4())
if_node = {
    "parameters": {
        "conditions": {
            "options": {
                "caseSensitive": True,
                "leftValue": "",
                "typeValidation": "strict",
                "version": 3
            },
            "conditions": [
                {
                    "id": str(uuid.uuid4()),
                    "leftValue": "={{ $json.is_admin }}",
                    "rightValue": True,
                    "operator": {
                        "type": "boolean",
                        "operation": "true",
                        "singleValue": True
                    }
                }
            ],
            "combinator": "and"
        },
        "options": {}
    },
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.3,
    "position": [91680, 47448], # Slightly above HTML node
    "id": if_node_id,
    "name": if_node_name
}

# 3. Add 'HTML Admin' Node
html_node_name = "HTML Admin"
html_node_id = str(uuid.uuid4())
html_node = {
    "parameters": {
        "html": html_content
    },
    "type": "n8n-nodes-base.html",
    "typeVersion": 1.2,
    "position": [91680, 47248], # Slightly above IF node
    "id": html_node_id,
    "name": html_node_name
}

# Add nodes to array
data["nodes"].append(if_node)
data["nodes"].append(html_node)

# 4. Reconnect the workflow
# From Code in JavaScript3 to IF
if "Code in JavaScript3" not in data["connections"]:
    data["connections"]["Code in JavaScript3"] = {"main": [[]]}
data["connections"]["Code in JavaScript3"]["main"][0].append({
    "node": if_node_name,
    "type": "main",
    "index": 0
})

# From IF to HTML Admin (True) and HTML (False)
data["connections"][if_node_name] = {
    "main": [
        [
            {
                "node": html_node_name,
                "type": "main",
                "index": 0
            }
        ],
        [
            {
                "node": "HTML",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

# From HTML Admin to htmToBase64
data["connections"][html_node_name] = {
    "main": [
        [
            {
                "node": "htmToBase64",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

# Save modified workflow
output_path = "mqtt_receive_updated.json"
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Workflow updated and saved to " + output_path)

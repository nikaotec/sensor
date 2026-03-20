import json

file_path = "/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc8411/home/antonio/Documentos/projetos/n8n/workflows/sensor/n8n_mqtt_to_firestore.json"

with open(file_path, "r") as f:
    data = json.load(f)

nodes = data["nodes"]
connections = data["connections"]

# 1. Create a new IF node filtering by TIPO
new_node = {
  "parameters": {
    "conditions": {
      "options": {
        "caseSensitive": True,
        "leftValue": "",
        "typeValidation": "strict"
      },
      "conditions": [
        {
          "id": "new-condition-id",
          "leftValue": "={{ $json.TIPO }}",
          "rightValue": "DASHBOARD_PERIODIC",
          "operator": {
            "type": "string",
            "operation": "equals",
            "singleValue": True
          }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  },
  "id": "filter-telemetry-if-node",
  "name": "Filter Telemetry",
  "type": "n8n-nodes-base.if",
  "typeVersion": 3,
  "position": [
    900,
    300
  ]
}

nodes.append(new_node)

# 2. Move 'Insert Telemetry Log' position 
for n in nodes:
    if n["name"] == "Insert Telemetry Log":
        n["position"] = [1120, 300]
        break

# 3. Update connections from 'Validate Data'
validate_data_conns = connections.get("Validate Data", {}).get("main", [[]])[0]
new_valid_conns = []
for c in validate_data_conns:
    if c["node"] == "Insert Telemetry Log":
        # reroute this connection to Filter Telemetry
        new_valid_conns.append({
            "node": "Filter Telemetry",
            "type": "main",
            "index": 0
        })
    else:
        new_valid_conns.append(c)

connections["Validate Data"]["main"][0] = new_valid_conns

# 4. Connect Filter Telemetry -> Insert Telemetry Log (on true branch, which is index 0)
connections["Filter Telemetry"] = {
  "main": [
    [
      {
        "node": "Insert Telemetry Log",
        "type": "main",
        "index": 0
      }
    ],
    [] # false branch empty
  ]
}

with open(file_path, "w") as f:
    json.dump(data, f, indent=2)

print("n8n workflow patched successfully!")

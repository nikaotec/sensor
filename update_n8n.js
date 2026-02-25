const fs = require('fs');
const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

const jsonPath = "mqtt receive.json";
const htmlPath = "relatorio_admin.html";
const outputPath = "mqtt_receive_updated.json";

function updateWorkflow() {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  // 1. Disconnect Code in JavaScript3 from HTML
  if (data.connections && data.connections["Code in JavaScript3"]) {
    const connList = data.connections["Code in JavaScript3"].main || [];
    if (connList.length > 0) {
      data.connections["Code in JavaScript3"].main[0] = connList[0].filter(c => c.node !== "HTML");
    }
  }

  // 2. Add 'Check Admin Report' Node
  const ifNodeName = "Check Admin Report";
  const ifNodeId = uuidv4();
  const ifNode = {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: "",
          typeValidation: "strict",
          version: 3
        },
        conditions: [
          {
            id: uuidv4(),
            leftValue: "={{ $json.is_admin }}",
            rightValue: true,
            operator: {
              type: "boolean",
              operation: "true",
              singleValue: true
            }
          }
        ],
        combinator: "and"
      },
      options: {}
    },
    type: "n8n-nodes-base.if",
    typeVersion: 2.3,
    position: [91680, 47448],
    id: ifNodeId,
    name: ifNodeName
  };

  // 3. Add 'HTML Admin' Node
  const htmlNodeName = "HTML Admin";
  const htmlNodeId = uuidv4();
  const htmlNode = {
    parameters: {
      html: htmlContent
    },
    type: "n8n-nodes-base.html",
    typeVersion: 1.2,
    position: [91680, 47248],
    id: htmlNodeId,
    name: htmlNodeName
  };

  data.nodes.push(ifNode);
  data.nodes.push(htmlNode);

  // 4. Reconnect workflow
  if (!data.connections["Code in JavaScript3"]) {
    data.connections["Code in JavaScript3"] = { main: [[]] };
  }
  data.connections["Code in JavaScript3"].main[0].push({
    node: ifNodeName,
    type: "main",
    index: 0
  });

  data.connections[ifNodeName] = {
    main: [
      [
        {
          node: htmlNodeName,
          type: "main",
          index: 0
        }
      ],
      [
        {
          node: "HTML",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  data.connections[htmlNodeName] = {
    main: [
      [
        {
          node: "htmToBase64",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log("Updated workflow saved to " + outputPath);
}

try {
  updateWorkflow();
} catch (e) {
  console.error(e);
  process.exit(1);
}

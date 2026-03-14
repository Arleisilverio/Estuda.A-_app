const { spawn } = require('child_process');
const path = require('path');

const gatewayScript = path.join(__dirname, 'gateway.cjs');
const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
    console.log("Uso: node smart-run.js \"Seu prompt aqui\"");
    process.exit(1);
}

console.log("\x1b[36m%s\x1b[0m", "[Smart-Run] Iniciando execução inteligente...");

const child = spawn('node', [gatewayScript, prompt], { stdio: 'inherit' });

child.on('exit', (code) => {
    if (code !== 0) {
        console.error("\x1b[31m%s\x1b[0m", "[Smart-Run] Ocorreu um erro na execução do gateway.");
    }
    process.exit(code);
});

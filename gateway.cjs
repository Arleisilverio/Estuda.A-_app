const dotenv = require('dotenv');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

dotenv.config();

/**
 * Realiza chamada ao Gemini 1.5 Flash com fallback automático.
 * @param {string} prompt - O prompt para o modelo.
 * @param {boolean} usePersonalKey - Se deve usar a chave pessoal imediatamente.
 */
async function callGemini(prompt, usePersonalKey = false) {
    const api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
    const headers = {
        "Content-Type": "application/json"
    };

    let url = api_url;
    let apiKey = process.env.GOOGLE_API_KEY;
    
    if (usePersonalKey) {
        if (!apiKey) {
            return { error: "GOOGLE_API_KEY não encontrada no arquivo .env" };
        }
        apiKey = apiKey.trim();
        headers["x-goog-api-key"] = apiKey;
        console.log(`[Gateway] Utilizando chave pessoal (Fallback Ativo)`);
    } else {
        console.log("[Gateway] Tentando provedor gratuito do Antigravity...");
    }

    const data = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        // Monitorar erros de cota (429) ou acesso negado (403/401)
        if (response.status === 429 || response.status === 401 || response.status === 403) {
            if (!usePersonalKey && apiKey) {
                console.log(`[Gateway] Alerta: Provedor gratuito indisponível (Status ${response.status}).`);
                console.log("[Gateway] Alternando para sua chave pessoal...");
                return callGemini(prompt, true);
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro na API (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        return result;

    } catch (error) {
        return { error: error.message };
    }
}

// Execução CLI
if (require.main === module) {
    if (process.argv[2]) {
        const prompt = process.argv.slice(2).join(" ");
        callGemini(prompt).then(result => {
            if (result.error) {
                console.error(`Erro: ${result.error}`);
            } else {
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    console.log("\n--- Resposta Gemini ---");
                    console.log(text);
                } else {
                    console.log("Resposta em formato inesperado:");
                    console.log(JSON.stringify(result, null, 2));
                }
            }
        });
    } else {
        console.log("Uso: node gateway.cjs \"Seu prompt aqui\"");
    }
}

module.exports = { callGemini };

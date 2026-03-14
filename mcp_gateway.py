import os
import json
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

def call_gemini_with_fallback(prompt, use_personal=False):
    api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    params = {}
    if use_personal:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return "Erro: GOOGLE_API_KEY não configurada no .env"
        params["key"] = api_key
    
    data = {"contents": [{"parts": [{"text": prompt}]}]}
    
    try:
        response = requests.post(api_url, params=params, json=data)
        if response.status_code in [429, 401, 403] and not use_personal:
            return call_gemini_with_fallback(prompt, use_personal=True)
        
        response.raise_for_status()
        res_json = response.json()
        return res_json['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        return f"Erro na API: {str(e)}"

@app.route('/mcp', methods=['POST'])
def mcp_endpoint():
    # Simulação simplificada de um servidor MCP via HTTP para o exemplo
    req_data = request.json
    prompt = req_data.get("prompt", "")
    response_text = call_gemini_with_fallback(prompt)
    return jsonify({"response": response_text})

if __name__ == "__main__":
    # Nota: Servidores MCP reais geralmente usam stdio ou transports específicos.
    # Este é um exemplo de ponte funcional.
    print("Servidor de Gateway Gemini iniciado na porta 5000...")
    app.run(port=5000)

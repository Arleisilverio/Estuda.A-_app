import os
import sys
import json
import requests
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def call_gemini(prompt, use_personal_key=False):
    """
    Realiza chamada ao Gemini 1.5 Flash.
    Se use_personal_key for True, utiliza a GOOGLE_API_KEY do .env.
    Caso contrário, tenta usar o provedor padrão do Antigravity (Simulado via headers).
    """
    
    # URL da API do Google Gemini
    api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    params = {}
    
    if use_personal_key:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return {"error": "GOOGLE_API_KEY não encontrada no arquivo .env"}
        params["key"] = api_key
        print("[Gateway] Utilizando chave de API pessoal (Billing)...")
    else:
        # Aqui simulamos o uso do provedor padrão do Antigravity
        # Em um ambiente real, o Antigravity injetaria suas próprias credenciais
        # Para fins deste gateway, tentamos uma chamada sem chave ou com um header específico
        # se o Antigravity permitir. Se falhar com 401/403/429, o fallback cuidará disso.
        print("[Gateway] Tentando provedor gratuito do Antigravity...")
        # Nota: Chamadas sem chave geralmente resultam em erro em scripts isolados.
        # O objetivo aqui é capturar o erro e alternar.
        pass

    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }

    try:
        response = requests.post(api_url, headers=headers, params=params, json=data)
        
        # Monitorar erros de cota (429) ou acesso negado (403/401)
        if response.status_code in [429, 401, 403] and not use_personal_key:
            print(f"[Gateway] Alerta: Provedor gratuito bloqueado (Status {response.status_code}).")
            print("[Gateway] Alternando automaticamente para chave pessoal...")
            return call_gemini(prompt, use_personal_key=True)
            
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.HTTPError as e:
        if response.status_code == 429:
            return {"error": "Limite de cota excedido em ambos os provedores."}
        return {"error": str(e), "details": response.text}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python gateway.py \"Seu prompt aqui\"")
        sys.exit(1)
        
    user_prompt = sys.argv[1]
    result = call_gemini(user_prompt)
    
    if "error" in result:
        print(f"Erro: {result['error']}")
        if "details" in result:
            print(f"Detalhes: {result['details']}")
    else:
        # Extrair texto da resposta padrão do Gemini
        try:
            text = result['candidates'][0]['content']['parts'][0]['text']
            print("\n--- Resposta Gemini ---")
            print(text)
        except (KeyError, IndexError):
            print("Resposta em formato inesperado:")
            print(json.dumps(result, indent=2))

import re

file_path = r'c:\Users\Arlei\OneDrive\Desktop\novo projeto antigravity\src\App.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove import
text = re.sub(r"import \{ isBiometryAvailable.*?\n", "", text)

# 2. Remove states
text = re.sub(r"    // Biometria(?:.|\n)*?setShowBiometryInvite\(false\)\n", "", text) # this might be too greedy

text = re.sub(r"    // Biometria\n    const \[biometrySupported, setBiometrySupported\] = useState\(false\)\n    const \[showBiometryInvite, setShowBiometryInvite\] = useState\(false\)\n", "", text)

# 3. Remove useEffect and handlers
text = re.sub(r"    // Verificar suporte a biometria\n    useEffect\(\(\) => \{\n        const checkBiometry = async \(\) => \{.+?finally \{\n            setLoading\(false\)\n        \}\n    \}\n", "", text, flags=re.DOTALL)

# 4. Remove props from Login
text = re.sub(r"            <Login \n                biometrySupported=\{biometrySupported\} \n                onBiometricLogin=\{handleLoginWithBiometry\} \n            />", "            <Login />", text)

# 5. Remove Modal at bottom
text = re.sub(r"            \{/\* Modal de Convite para Biometria \*/\}\n            \{showBiometryInvite && \(.+?                  </div>\n                </div>\n            \)\}\n", "", text, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Biometry removed successfully.")

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'App.jsx');
let text = fs.readFileSync(filePath, 'utf-8');

// 1. Remove import
text = text.replace(/import \{ isBiometryAvailable[\s\S]*?webauthn_helpers'\n/g, '');

// 2. Remove states
text = text.replace(/    \/\/ Biometria\n    const \[biometrySupported, setBiometrySupported\] = useState\(false\)\n    const \[showBiometryInvite, setShowBiometryInvite\] = useState\(false\)\n/g, '');

// 3. Remove useEffect and handlers
text = text.replace(/    \/\/ Verificar suporte a biometria\n    useEffect\(\(\) => \{[\s\S]+?finally \{\n            setLoading\(false\)\n        \}\n    \}\n/g, '');

// 4. Remove props from Login
text = text.replace(/            <Login \n                biometrySupported=\{biometrySupported\} \n                onBiometricLogin=\{handleLoginWithBiometry\} \n            \/>/g, '            <Login />');

// 5. Remove Modal at bottom
text = text.replace(/            \{\/\* Modal de Convite para Biometria \*\/\}\n            \{showBiometryInvite && \([\s\S]+?                  <\/div>\n                <\/div>\n            \}\)\}\n/g, '');

fs.writeFileSync(filePath, text, 'utf-8');
console.log("Biometry removed successfully via Node.");

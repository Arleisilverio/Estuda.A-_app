/**
 * Utilitários para converter dados do WebAuthn (ArrayBuffer) em strings 
 * que podem ser enviadas e armazenadas no Supabase (Base64URL).
 */

export const bufferToBase64URL = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let str = "";
    for (const charCode of bytes) {
        str += String.fromCharCode(charCode);
    }
    const base64 = btoa(str);
    return base64
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
};

export const base64URLToBuffer = (base64url) => {
    const base64 = base64url
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(padLen);
    const str = atob(padded);
    const buffer = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        buffer[i] = str.charCodeAt(i);
    }
    return buffer.buffer;
};

// Verifica se o navegador suporta WebAuthn e biometria local
export const isBiometryAvailable = async () => {
    if (!window.PublicKeyCredential) return false;
    
    // Verifica se o dispositivo possui um autenticador de plataforma (TouchID, FaceID, Windows Hello)
    try {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
    } catch (e) {
        return false;
    }
};

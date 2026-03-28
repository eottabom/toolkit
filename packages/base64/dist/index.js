const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function hasBuffer() {
    return typeof Buffer !== "undefined";
}
function encodeBinaryToBase64(binary) {
    if (typeof btoa === "function") {
        return btoa(binary);
    }
    if (hasBuffer()) {
        return Buffer.from(binary, "binary").toString("base64");
    }
    throw new Error("Base64 encoding is not supported in this runtime.");
}
function decodeBase64ToBinary(input) {
    if (typeof atob === "function") {
        return atob(input);
    }
    if (hasBuffer()) {
        return Buffer.from(input, "base64").toString("binary");
    }
    throw new Error("Base64 decoding is not supported in this runtime.");
}
export function encodeBase64(input) {
    if (hasBuffer()) {
        return Buffer.from(input, "utf8").toString("base64");
    }
    const bytes = textEncoder.encode(input);
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return encodeBinaryToBase64(binary);
}
export function decodeBase64(input) {
    if (hasBuffer()) {
        return Buffer.from(input, "base64").toString("utf8");
    }
    const binary = decodeBase64ToBinary(input);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return textDecoder.decode(bytes);
}
//# sourceMappingURL=index.js.map
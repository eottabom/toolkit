export const ALGORITHMS = ["HS256", "HS384", "HS512"] as const;

export type Algorithm = (typeof ALGORITHMS)[number];

export type DecodedJwt = {
    header: string;
    payload: string;
    signature: string;
    headerAlg: string;
};

const ALG_HASH_MAP: Record<Algorithm, string> = {
    HS256: "SHA-256",
    HS384: "SHA-384",
    HS512: "SHA-512",
};

const ALG_MIN_KEY_BYTES: Record<Algorithm, number> = {
    HS256: 32,
    HS384: 48,
    HS512: 64,
};

function hasBuffer(): boolean {
    return typeof Buffer !== "undefined";
}

function encodeBinaryToBase64(binary: string): string {
    if (typeof btoa === "function") {
        return btoa(binary);
    }

    if (hasBuffer()) {
        return Buffer.from(binary, "binary").toString("base64");
    }

    throw new Error("Base64 encoding is not supported in this runtime.");
}

function decodeBase64ToBinary(input: string): string {
    if (typeof atob === "function") {
        return atob(input);
    }

    if (hasBuffer()) {
        return Buffer.from(input, "base64").toString("binary");
    }

    throw new Error("Base64 decoding is not supported in this runtime.");
}

function bytesToBinary(bytes: Uint8Array): string {
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return binary;
}

function binaryToBytes(binary: string): Uint8Array {
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function arrayBufferToBytes(buffer: ArrayBuffer): Uint8Array {
    return new Uint8Array(buffer);
}

function normalizeBase64Url(input: string): string {
    let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;

    if (pad !== 0) {
        base64 += "=".repeat(4 - pad);
    }

    return base64;
}

function getCryptoSubtle(): SubtleCrypto {
    if (typeof globalThis.crypto?.subtle !== "undefined") {
        return globalThis.crypto.subtle;
    }

    throw new Error("Web Crypto API is not supported in this runtime.");
}

export function base64UrlDecode(input: string): string {
    const normalized = normalizeBase64Url(input);

    if (hasBuffer()) {
        return Buffer.from(normalized, "base64").toString("utf8");
    }

    const binary = decodeBase64ToBinary(normalized);
    return new TextDecoder().decode(binaryToBytes(binary));
}

export function base64UrlEncode(input: ArrayBuffer | Uint8Array): string {
    const bytes = input instanceof Uint8Array ? input : arrayBufferToBytes(input);

    if (hasBuffer()) {
        return Buffer.from(bytes).toString("base64url");
    }

    return encodeBinaryToBase64(bytesToBinary(bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export function decodeJwt(token: string): DecodedJwt {
    const parts = token.trim().split(".");

    if (parts.length !== 3) {
        throw new Error("JWT must have 3 parts separated by dots.");
    }

    const headerObject = JSON.parse(base64UrlDecode(parts[0])) as { alg?: string };

    return {
        header: JSON.stringify(headerObject, null, 2),
        payload: JSON.stringify(JSON.parse(base64UrlDecode(parts[1])), null, 2),
        signature: parts[2],
        headerAlg: headerObject.alg ?? "",
    };
}

export function getJwtAlgorithmMinKeyBytes(algorithm: Algorithm): number {
    return ALG_MIN_KEY_BYTES[algorithm];
}

export function isSupportedJwtAlgorithm(value: string): value is Algorithm {
    return ALGORITHMS.includes(value as Algorithm);
}

export async function signJwt(data: string, secret: string, algorithm: Algorithm): Promise<string> {
    const subtle = getCryptoSubtle();
    const encoder = new TextEncoder();
    const key = await subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: ALG_HASH_MAP[algorithm] },
        false,
        ["sign"],
    );
    const signature = await subtle.sign("HMAC", key, encoder.encode(data));
    return base64UrlEncode(signature);
}

export async function verifyJwt(token: string, secret: string, algorithm: Algorithm): Promise<boolean> {
    const parts = token.trim().split(".");

    if (parts.length !== 3) {
        return false;
    }

    const subtle = getCryptoSubtle();
    const encoder = new TextEncoder();
    const key = await subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: ALG_HASH_MAP[algorithm] },
        false,
        ["verify"],
    );
    const data = `${parts[0]}.${parts[1]}`;
    const signatureBytes = Uint8Array.from(binaryToBytes(decodeBase64ToBinary(normalizeBase64Url(parts[2]))));

    return subtle.verify("HMAC", key, signatureBytes, encoder.encode(data));
}

export async function encodeJwt(
    headerJson: string,
    payloadJson: string,
    secret: string,
    algorithm: Algorithm,
): Promise<string> {
    JSON.parse(headerJson);
    JSON.parse(payloadJson);

    const encoder = new TextEncoder();
    const headerBase64 = base64UrlEncode(encoder.encode(headerJson));
    const payloadBase64 = base64UrlEncode(encoder.encode(payloadJson));
    const data = `${headerBase64}.${payloadBase64}`;
    const signatureBase64 = await signJwt(data, secret, algorithm);

    return `${data}.${signatureBase64}`;
}

export function encodeUrlComponent(input: string): string {
    return encodeURIComponent(input);
}

export function decodeUrlComponent(input: string): string {
    return decodeURIComponent(input);
}

export function tryDecodeUrlComponent(input: string): {
    value: string;
    error: string;
} {
    try {
        return {
            value: decodeUrlComponent(input),
            error: "",
        };
    } catch {
        return {
            value: "",
            error: "Invalid URL-encoded string.",
        };
    }
}

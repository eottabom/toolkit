export function encodeUrlComponent(input) {
    return encodeURIComponent(input);
}
export function decodeUrlComponent(input) {
    return decodeURIComponent(input);
}
export function tryDecodeUrlComponent(input) {
    try {
        return {
            value: decodeUrlComponent(input),
            error: "",
        };
    }
    catch {
        return {
            value: "",
            error: "Invalid URL-encoded string.",
        };
    }
}
//# sourceMappingURL=index.js.map
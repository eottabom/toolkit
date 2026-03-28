export declare const ALGORITHMS: readonly ["HS256", "HS384", "HS512"];
export type Algorithm = (typeof ALGORITHMS)[number];
export type DecodedJwt = {
    header: string;
    payload: string;
    signature: string;
    headerAlg: string;
};
export declare function base64UrlDecode(input: string): string;
export declare function base64UrlEncode(input: ArrayBuffer | Uint8Array): string;
export declare function decodeJwt(token: string): DecodedJwt;
export declare function getJwtAlgorithmMinKeyBytes(algorithm: Algorithm): number;
export declare function isSupportedJwtAlgorithm(value: string): value is Algorithm;
export declare function signJwt(data: string, secret: string, algorithm: Algorithm): Promise<string>;
export declare function verifyJwt(token: string, secret: string, algorithm: Algorithm): Promise<boolean>;
export declare function encodeJwt(headerJson: string, payloadJson: string, secret: string, algorithm: Algorithm): Promise<string>;
//# sourceMappingURL=index.d.ts.map
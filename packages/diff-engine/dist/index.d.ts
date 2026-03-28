export type LineStatus = "same" | "changed" | "added" | "removed";
export type DiffLine = {
    left: string;
    right: string;
    status: LineStatus;
    leftNumber?: number;
    rightNumber?: number;
};
export type WordPart = {
    text: string;
    kind: "same" | "added" | "removed";
};
export declare function buildLcsDp<T>(left: T[], right: T[]): number[][];
export declare class DiffEngine {
    private leftLines;
    private rightLines;
    constructor(leftText: string, rightText: string);
    buildLineDiff(): DiffLine[];
    static buildWordDiff(leftLine: string, rightLine: string): {
        leftParts: WordPart[];
        rightParts: WordPart[];
        leadingLeft: string;
        leadingRight: string;
    };
    private collectOps;
    private toRows;
}
//# sourceMappingURL=index.d.ts.map
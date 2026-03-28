export type LineStatus = "same" | "changed" | "added" | "removed";

export type DiffLine = {
    left: string;
    right: string;
    status: LineStatus;
    leftNumber?: number;
    rightNumber?: number;
};

type DiffOp = {
    type: "same" | "added" | "removed";
    line: string;
};

export type WordPart = {
    text: string;
    kind: "same" | "added" | "removed";
};

export function buildLcsDp<T>(left: T[], right: T[]): number[][] {
    const m = left.length;
    const n = right.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i += 1) {
        for (let j = 1; j <= n; j += 1) {
            if (left[i - 1] === right[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    return dp;
}

export class DiffEngine {
    private leftLines: string[];
    private rightLines: string[];

    constructor(leftText: string, rightText: string) {
        this.leftLines = leftText.split("\n");
        this.rightLines = rightText.split("\n");
    }

    buildLineDiff(): DiffLine[] {
        const dp = buildLcsDp(this.leftLines, this.rightLines);
        const operations = this.collectOps(dp);
        return this.toRows(operations);
    }

    static buildWordDiff(leftLine: string, rightLine: string): {
        leftParts: WordPart[];
        rightParts: WordPart[];
        leadingLeft: string;
        leadingRight: string;
    } {
        const leadingLeft = leftLine.match(/^\s*/)?.[0] ?? "";
        const leadingRight = rightLine.match(/^\s*/)?.[0] ?? "";
        const trimmedLeft = leftLine.trim();
        const trimmedRight = rightLine.trim();
        const leftWords = trimmedLeft.length > 0 ? trimmedLeft.split(/\s+/) : [];
        const rightWords = trimmedRight.length > 0 ? trimmedRight.split(/\s+/) : [];
        const dp = buildLcsDp(leftWords, rightWords);

        const leftParts: WordPart[] = [];
        const rightParts: WordPart[] = [];
        let i = leftWords.length;
        let j = rightWords.length;

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && leftWords[i - 1] === rightWords[j - 1]) {
                leftParts.unshift({ text: leftWords[i - 1], kind: "same" });
                rightParts.unshift({ text: rightWords[j - 1], kind: "same" });
                i -= 1;
                j -= 1;
                continue;
            }

            if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                rightParts.unshift({ text: rightWords[j - 1], kind: "added" });
                j -= 1;
                continue;
            }

            if (i > 0) {
                leftParts.unshift({ text: leftWords[i - 1], kind: "removed" });
                i -= 1;
            }
        }

        return {
            leftParts,
            rightParts,
            leadingLeft,
            leadingRight,
        };
    }

    private collectOps(dp: number[][]): DiffOp[] {
        const operations: DiffOp[] = [];
        let i = this.leftLines.length;
        let j = this.rightLines.length;

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && this.leftLines[i - 1] === this.rightLines[j - 1]) {
                operations.push({ type: "same", line: this.leftLines[i - 1] });
                i -= 1;
                j -= 1;
                continue;
            }

            if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                operations.push({ type: "added", line: this.rightLines[j - 1] });
                j -= 1;
                continue;
            }

            if (i > 0) {
                operations.push({ type: "removed", line: this.leftLines[i - 1] });
                i -= 1;
            }
        }

        return operations.reverse();
    }

    private toRows(operations: DiffOp[]): DiffLine[] {
        const rows: DiffLine[] = [];
        let leftNumber = 1;
        let rightNumber = 1;

        for (let index = 0; index < operations.length; index += 1) {
            const current = operations[index];
            const next = operations[index + 1];

            if (current.type === "removed" && next?.type === "added") {
                rows.push({
                    left: current.line,
                    right: next.line,
                    status: "changed",
                    leftNumber,
                    rightNumber,
                });
                leftNumber += 1;
                rightNumber += 1;
                index += 1;
                continue;
            }

            if (current.type === "same") {
                rows.push({
                    left: current.line,
                    right: current.line,
                    status: "same",
                    leftNumber,
                    rightNumber,
                });
                leftNumber += 1;
                rightNumber += 1;
                continue;
            }

            if (current.type === "removed") {
                rows.push({
                    left: current.line,
                    right: "",
                    status: "removed",
                    leftNumber,
                });
                leftNumber += 1;
                continue;
            }

            rows.push({
                left: "",
                right: current.line,
                status: "added",
                rightNumber,
            });
            rightNumber += 1;
        }

        return rows;
    }
}

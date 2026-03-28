export function buildLcsDp(left, right) {
    const m = left.length;
    const n = right.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i += 1) {
        for (let j = 1; j <= n; j += 1) {
            if (left[i - 1] === right[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            }
            else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp;
}
export class DiffEngine {
    constructor(leftText, rightText) {
        this.leftLines = leftText.split("\n");
        this.rightLines = rightText.split("\n");
    }
    buildLineDiff() {
        const dp = buildLcsDp(this.leftLines, this.rightLines);
        const operations = this.collectOps(dp);
        return this.toRows(operations);
    }
    static buildWordDiff(leftLine, rightLine) {
        const leadingLeft = leftLine.match(/^\s*/)?.[0] ?? "";
        const leadingRight = rightLine.match(/^\s*/)?.[0] ?? "";
        const trimmedLeft = leftLine.trim();
        const trimmedRight = rightLine.trim();
        const leftWords = trimmedLeft.length > 0 ? trimmedLeft.split(/\s+/) : [];
        const rightWords = trimmedRight.length > 0 ? trimmedRight.split(/\s+/) : [];
        const dp = buildLcsDp(leftWords, rightWords);
        const leftParts = [];
        const rightParts = [];
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
    collectOps(dp) {
        const operations = [];
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
    toRows(operations) {
        const rows = [];
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
//# sourceMappingURL=index.js.map
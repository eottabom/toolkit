import fs from "node:fs";
import path from "node:path";

const [, , packageDirName, nextVersionArg] = process.argv;

if (!packageDirName || !nextVersionArg) {
    console.error("Usage: node scripts/bump-package-version.mjs <package-dir> <patch|minor|major|x.y.z>");
    process.exit(1);
}

const packageJsonPath = path.join(process.cwd(), "packages", packageDirName, "package.json");

if (!fs.existsSync(packageJsonPath)) {
    console.error(`Package not found: ${packageDirName}`);
    process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const currentVersion = String(packageJson.version ?? "").trim();

if (!/^\d+\.\d+\.\d+$/.test(currentVersion)) {
    console.error(`Invalid current version: ${currentVersion}`);
    process.exit(1);
}

function incrementVersion(version, releaseType) {
    const [major, minor, patch] = version.split(".").map(Number);

    if (releaseType === "major") {
        return `${major + 1}.0.0`;
    }

    if (releaseType === "minor") {
        return `${major}.${minor + 1}.0`;
    }

    if (releaseType === "patch") {
        return `${major}.${minor}.${patch + 1}`;
    }

    if (/^\d+\.\d+\.\d+$/.test(releaseType)) {
        return releaseType;
    }

    throw new Error(`Unsupported version input: ${releaseType}`);
}

const nextVersion = incrementVersion(currentVersion, nextVersionArg);
packageJson.version = nextVersion;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log(`${packageJson.name}: ${currentVersion} -> ${nextVersion}`);

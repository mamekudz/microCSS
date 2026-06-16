// Installs monorepo deps for demo builds and verifies links before BuildSkin runs.
// Usage: node tools/ci-install-demos.mjs

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function _Run(_label, _args, _cwd = rootDir) {
	console.log(`\n> ${_label}`);
	const result = spawnSync(_args[0], _args.slice(1), { cwd: _cwd, stdio: "inherit", shell: true });
	if (result.status !== 0) {
		console.error(`! ${_label} failed (exit ${result.status ?? 1})`);
		process.exit(result.status ?? 1);
	}
}

function _RequirePath(_path, _label) {
	if (!existsSync(_path)) {
		console.error(`! missing ${_label}: ${_path}`);
		process.exit(1);
	}
	console.log(`  ok ${_label}`);
}

_Run("npm ci (root)", ["npm", "ci"], rootDir);
_Run("npm ci (gulp-mu-ps)", ["npm", "ci"], join(rootDir, "gulp-mu-ps"));
_Run("npm ci (gulp-mu-au)", ["npm", "ci"], join(rootDir, "gulp-mu-au"));
_Run("npm ci (gulp-mu-css)", ["npm", "ci"], join(rootDir, "gulp-mu-css"));

_RequirePath(join(rootDir, "gulp-mu-css", "node_modules", "gulp-mu-ps", "package.json"), "gulp-mu-ps link");
_RequirePath(join(rootDir, "gulp-mu-css", "node_modules", "gulp-mu-au", "package.json"), "gulp-mu-au link");
_RequirePath(join(rootDir, "gulp-mu-ps", "node_modules", "sharp", "package.json"), "sharp (µPS)");

console.log("\nImport smoke test…");
const importResult = spawnSync(
	"node",
	["--input-type=module", "-e", "import('./gulp-mu-css/src/index.mjs').then(() => console.log('  ok gulp-mu-css import'))"],
	{ cwd: rootDir, stdio: "inherit", shell: true }
);
if (importResult.status !== 0) process.exit(importResult.status ?? 1);

console.log("\nDemo install checks passed.");

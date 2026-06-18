// Publishes the prepared build/ bundles to npm in dependency order, skipping
// versions that are already on the registry (idempotent). Options come from CLI
// flags or environment variables:
//
//   --otp=<code>     | MU_OTP        one-time 2FA code, forwarded to npm publish
//   --login          | MU_LOGIN=1    run `npm login --auth-type=web` first (browser)
//   --only=a,b       | MU_ONLY       restrict to these package names
//   --tag=<dist-tag> | MU_TAG        npm dist-tag (default: latest)
//   --build          | MU_BUILD=1    run tools/prepare-publish.mjs first
//   --dry-run        | MU_DRY_RUN=1  show what would happen, publish nothing
//
// Interactive publish: use `npx gulp build:and:publish` — it sets MU_LOGIN=1 so npm
// opens the browser for web login before the first publish. For unattended runs
// configure an npm "Automation" access token via NODE_AUTH_TOKEN / .npmrc.

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = join(rootDir, "build");

// Publish order: internal dependencies first (gulp-mu-css depends on
// gulp-mu-ps and gulp-mu-au, so those must exist on npm beforehand).
const PUBLISH_ORDER = ["gulp-mu-ps", "gulp-mu-au", "gulp-mu-ft", "gulp-mu-css"];

function _Flag(_name) {
	return process.argv.slice(2).find((_arg) => _arg === `--${_name}` || _arg.startsWith(`--${_name}=`));
}

function _Option(_name, _envName) {
	const flag = _Flag(_name);
	if (flag) return flag.includes("=") ? flag.slice(flag.indexOf("=") + 1) : true;
	const env = process.env[_envName];
	if (env === undefined || env === "") return undefined;
	return env === "0" || env.toLowerCase() === "false" ? undefined : env;
}

const options = {
	otp: _Option("otp", "MU_OTP"),
	login: !!_Option("login", "MU_LOGIN"),
	only: _Option("only", "MU_ONLY"),
	tag: _Option("tag", "MU_TAG"),
	build: !!_Option("build", "MU_BUILD"),
	dryRun: !!_Option("dry-run", "MU_DRY_RUN")
};

const onlyFilter = typeof options.only === "string"
	? new Set(options.only.split(",").map((_name) => _name.trim()).filter(Boolean))
	: null;

function _ReadJson(_path) {
	return JSON.parse(readFileSync(_path, "utf8"));
}

// Returns true when <name>@<version> already exists on the registry.
function _IsPublished(_name, _version) {
	const result = spawnSync("npm", ["view", `${_name}@${_version}`, "version"], {
		stdio: ["ignore", "pipe", "ignore"],
		shell: true,
		encoding: "utf8"
	});
	return result.status === 0 && result.stdout.trim() === _version;
}

// Returns true when `npm whoami` succeeds.
function _IsLoggedIn() {
	const result = spawnSync("npm", ["whoami"], {
		stdio: ["ignore", "pipe", "ignore"],
		shell: true,
		encoding: "utf8"
	});
	return result.status === 0 && !!result.stdout.trim();
}

// Opens the browser for npm web login (OAuth). Required for interactive 2FA accounts.
function _NpmLoginWeb() {
	console.log("npm: opening browser for login (--auth-type=web)...\n");
	const result = spawnSync("npm", ["login", "--auth-type=web"], {
		stdio: "inherit",
		shell: true
	});
	if (result.status !== 0) {
		console.error("npm login failed.");
		process.exit(1);
	}
	console.log();
}

function _EnsureNpmAuth() {
	if (options.dryRun) return;
	if (options.login || !_IsLoggedIn()) {
		_NpmLoginWeb();
		if (!_IsLoggedIn()) {
			console.error("npm login did not complete. Try again: MU_LOGIN=1 npx gulp publish");
			process.exit(1);
		}
	}
}

function _Publish(_bundleDir) {
	const args = ["publish"];
	if (options.tag && typeof options.tag === "string") args.push(`--tag=${options.tag}`);
	if (options.otp && typeof options.otp === "string") args.push(`--otp=${options.otp}`);
	const result = spawnSync("npm", args, { cwd: _bundleDir, stdio: "inherit", shell: true });
	return result.status === 0;
}

if (options.build) {
	console.log("Running prepare-publish to refresh build/ bundles...\n");
	const result = spawnSync("node", [join(rootDir, "tools", "prepare-publish.mjs")], {
		cwd: rootDir,
		stdio: "inherit",
		shell: true
	});
	if (result.status !== 0) {
		console.error("prepare-publish failed; aborting.");
		process.exit(1);
	}
	console.log();
}

_EnsureNpmAuth();

const summary = { published: [], skipped: [], missing: [], failed: [] };

for (const name of PUBLISH_ORDER) {
	if (onlyFilter && !onlyFilter.has(name)) continue;

	const bundleDir = join(buildDir, name);
	const packagePath = join(bundleDir, "package.json");
	if (!existsSync(packagePath)) {
		console.warn(`- ${name}: no bundle in build/ (run with --build or 'npx gulp build:publish' first) - skipping.`);
		summary.missing.push(name);
		continue;
	}

	const { version } = _ReadJson(packagePath);
	if (_IsPublished(name, version)) {
		console.log(`= ${name}@${version}: already on npm - skipping.`);
		summary.skipped.push(`${name}@${version}`);
		continue;
	}

	if (options.dryRun) {
		console.log(`~ ${name}@${version}: would publish (dry run).`);
		summary.published.push(`${name}@${version} (dry run)`);
		continue;
	}

	console.log(`+ ${name}@${version}: publishing...`);
	if (_Publish(bundleDir)) {
		summary.published.push(`${name}@${version}`);
	} else {
		console.error(`! ${name}@${version}: npm publish failed.`);
		console.error("  If 2FA blocked publish: MU_LOGIN=1 npx gulp publish  (browser login)");
		console.error("  Or pass a one-time code: MU_OTP=<code> npx gulp publish");
		summary.failed.push(`${name}@${version}`);
		break; // stop so a dependent package is never published before its dependency
	}
}

console.log("\n--- publish summary ---");
if (summary.published.length) console.log(`published: ${summary.published.join(", ")}`);
if (summary.skipped.length) console.log(`skipped (already on npm): ${summary.skipped.join(", ")}`);
if (summary.missing.length) console.log(`missing bundles: ${summary.missing.join(", ")}`);
if (summary.failed.length) console.log(`FAILED: ${summary.failed.join(", ")}`);

process.exit(summary.failed.length ? 1 : 0);

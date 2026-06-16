// Assembles publish-ready copies of the family modules (microCSS, microPS,
// microFT, microAU) under build/.
// Each output directory contains only the files that would be shipped to npm
// (according to package.json "files"), a cleaned package.json without
// devDependencies, and production node_modules.

import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = join(rootDir, "build");

const PROJECTS = [
	{ name: "gulp-mu-css", sourceDir: join(rootDir, "gulp-mu-css") },
	{ name: "gulp-mu-ps", sourceDir: join(rootDir, "gulp-mu-ps") },
	{ name: "gulp-mu-ft", sourceDir: join(rootDir, "gulp-mu-ft") },
	{ name: "gulp-mu-au", sourceDir: join(rootDir, "gulp-mu-au") }
];

// npm always includes these files in a package tarball when present.
const NPM_ALWAYS_INCLUDED = new Set([
	"package.json",
	"README.md",
	"README",
	"readme.md",
	"LICENSE",
	"LICENSE.md",
	"LICENSE.txt",
	"licence",
	"licence.md"
]);

function _ReadJson(_path) {
	return JSON.parse(readFileSync(_path, "utf8"));
}

function _PublishEntries(_packageJson) {
	const required = new Set(_packageJson.files ?? ["src"]);
	if (_packageJson.main) required.add(_packageJson.main);
	if (_packageJson.bin) {
		const bins = typeof _packageJson.bin === "string"
			? [_packageJson.bin]
			: Object.values(_packageJson.bin);
		for (const bin of bins) required.add(bin);
	}
	return [...required];
}

function _OptionalIncluded(_sourceDir) {
	const optional = [];
	for (const name of NPM_ALWAYS_INCLUDED) {
		if (name === "package.json") continue;
		if (existsSync(join(_sourceDir, name))) optional.push(name);
	}
	return optional;
}

function _UniqueEntries(_entries) {
	const seen = new Set();
	const unique = [];
	for (const entry of _entries) {
		const key = entry.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(entry);
	}
	return unique;
}

function _CopyEntry(_sourceDir, _targetDir, _entry) {
	const sourcePath = join(_sourceDir, _entry);
	if (!existsSync(sourcePath)) return false;
	const targetPath = join(_targetDir, _entry);
	mkdirSync(dirname(targetPath), { recursive: true });
	cpSync(sourcePath, targetPath, { recursive: true, force: true });
	return true;
}

// Removes README sections that only apply to the development repository
// (tests, internal tools), marked with publish:exclude comment pairs.
function _StripPublishExcludes(_markdown) {
	const stripped = _markdown.replace(
		/[ \t]*<!--\s*publish:exclude:start\s*-->[\s\S]*?<!--\s*publish:exclude:end\s*-->\s*\n?/g,
		""
	);
	return stripped.replace(/\n{3,}/g, "\n\n");
}

function _CleanReadme(_targetDir) {
	for (const name of ["README.md", "README", "readme.md"]) {
		const path = join(_targetDir, name);
		if (!existsSync(path)) continue;
		writeFileSync(path, _StripPublishExcludes(readFileSync(path, "utf8")));
	}
}

function _CleanPackageJson(_packageJson, _sourceDir) {
	const cleaned = { ..._packageJson };
	delete cleaned.devDependencies;
	delete cleaned.private;
	// The test suite (and its devDependencies) is not part of the bundle.
	if (cleaned.scripts) {
		delete cleaned.scripts.test;
		if (Object.keys(cleaned.scripts).length === 0) delete cleaned.scripts;
	}
	// Local "file:" links (e.g. gulp-mu-css -> ../gulp-mu-ps) become regular semver
	// ranges pointing at the published version of the linked package.
	if (cleaned.dependencies) {
		cleaned.dependencies = { ...cleaned.dependencies };
		for (const [name, spec] of Object.entries(cleaned.dependencies)) {
			if (!spec.startsWith("file:")) continue;
			const linkedPackage = join(_sourceDir, spec.slice("file:".length), "package.json");
			if (!existsSync(linkedPackage)) {
				throw new Error(`cannot resolve file: dependency "${name}" (${spec})`);
			}
			cleaned.dependencies[name] = `^${_ReadJson(linkedPackage).version}`;
		}
	}
	return cleaned;
}

// Variant used only for the production install inside build/: "file:" links
// are kept but made absolute (they are relative to the source dir, not to the
// build dir), so npm resolves them without a registry lookup.
function _InstallablePackageJson(_packageJson, _sourceDir) {
	const installable = { ..._packageJson };
	if (installable.dependencies) {
		installable.dependencies = { ...installable.dependencies };
		for (const [name, spec] of Object.entries(installable.dependencies)) {
			if (!spec.startsWith("file:")) continue;
			installable.dependencies[name] = `file:${join(_sourceDir, spec.slice("file:".length))}`;
		}
	}
	return installable;
}

function _InstallProductionDependencies(_targetDir) {
	// --loglevel=error hides transitive deprecation warnings (e.g. glob from
	// svgicons2svgfont / node-gyp); these node_modules are not published, so the
	// noise is irrelevant to the resulting tarballs.
	const result = spawnSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--loglevel=error"], {
		cwd: _targetDir,
		stdio: "inherit",
		shell: true
	});
	if (result.status !== 0) {
		throw new Error(`npm install failed in ${_targetDir}`);
	}
}

function _CountFiles(_dir) {
	let count = 0;
	for (const entry of readdirSync(_dir, { withFileTypes: true })) {
		const path = join(_dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "node_modules") continue;
			count += _CountFiles(path);
		} else {
			count++;
		}
	}
	return count;
}

function PrepareProject(_project) {
	const packagePath = join(_project.sourceDir, "package.json");
	if (!existsSync(packagePath)) {
		console.warn(`skip ${_project.name}: no package.json in ${_project.sourceDir}`);
		return null;
	}

	const packageJson = _ReadJson(packagePath);
	const targetDir = join(buildDir, _project.name);
	const required = _PublishEntries(packageJson);
	const entries = _UniqueEntries([...required, ..._OptionalIncluded(_project.sourceDir)]);

	rmSync(targetDir, { recursive: true, force: true });
	mkdirSync(targetDir, { recursive: true });

	const copied = [];
	const missing = [];
	for (const entry of entries) {
		if (entry === "package.json") continue;
		if (_CopyEntry(_project.sourceDir, targetDir, entry)) copied.push(entry);
	}
	for (const entry of required) {
		if (entry === "package.json") continue;
		if (!existsSync(join(_project.sourceDir, entry))) missing.push(entry);
	}
	_CleanReadme(targetDir);

	// Install with resolvable file: links first, then write the final
	// package.json with semver ranges for publishing.
	const cleaned = _CleanPackageJson(packageJson, _project.sourceDir);
	if (Object.keys(packageJson.dependencies ?? {}).length > 0) {
		writeFileSync(
			join(targetDir, "package.json"),
			`${JSON.stringify(_InstallablePackageJson(packageJson, _project.sourceDir), null, 2)}\n`
		);
		_InstallProductionDependencies(targetDir);
	}
	writeFileSync(
		join(targetDir, "package.json"),
		`${JSON.stringify(cleaned, null, 2)}\n`
	);

	const fileCount = _CountFiles(targetDir);
	console.log(`${_project.name} -> ${relative(rootDir, targetDir)} (${fileCount} files)`);
	if (copied.length) console.log(`  copied: ${copied.join(", ")}`);
	if (missing.length) console.warn(`  missing: ${missing.join(", ")}`);

	return { name: _project.name, targetDir, copied, missing, fileCount };
}

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

console.log(`Preparing npm publish bundles in ${buildDir}\n`);
const results = PROJECTS.map(PrepareProject).filter(Boolean);

if (results.length === 0) {
	console.error("No publish bundles were created.");
	process.exit(1);
}

console.log(`\nDone. Publish from each directory, e.g.:`);
for (const result of results) {
	console.log(`  cd ${relative(rootDir, result.targetDir)} && npm publish`);
}

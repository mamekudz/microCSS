import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { test } from "node:test";
import { AssertSeparateBackupPaths, GetNasBackupExcludedDirs } from "../nas-backup.mjs";

function _Fixture(_test) {
	const parent = realpathSync(tmpdir());
	const root = mkdtempSync(join(parent, "microcss-backup-"));
	_test.after(() => {
		const resolved = realpathSync(root);
		assert.ok(resolved.startsWith(`${parent}${sep}microcss-backup-`));
		rmSync(resolved, { recursive: true, force: true });
	});
	return root;
}

test("rejects identical, descendant and ancestor backup destinations", (_test) => {
	const root = _Fixture(_test);
	const source = join(root, "project");
	const child = join(source, "nested");
	const sibling = join(root, "project-backup");
	for (const dir of [child, sibling]) mkdirSync(dir, { recursive: true });
	for (const destination of [source, child, root]) {
		assert.throws(() => AssertSeparateBackupPaths(source, destination), /separate folders/);
	}
	assert.doesNotThrow(() => AssertSeparateBackupPaths(source, sibling));
});

test("rejects a junction pointing back into the source", { skip: process.platform !== "win32" }, (_test) => {
	const root = _Fixture(_test);
	const source = join(root, "project");
	const alias = join(root, "alias");
	mkdirSync(source);
	symlinkSync(source, alias, "junction");
	assert.throws(() => AssertSeparateBackupPaths(source, alias), /separate folders/);
});

test("robocopy keeps source build folders and recovery data, excluding only generated trees", { skip: process.platform !== "win32" }, (_test) => {
	const root = _Fixture(_test);
	const source = join(root, "project with spaces");
	const destination = join(root, "backup with spaces");
	const included = [
		"gulp-mu-css/src/build/SkinBuilder.mjs",
		"gulp-mu-ft/src/build/BuildCache.mjs",
		"gulp-mu-au/src/build/BuildCache.mjs",
		"oldsrcs/example/out/reference.png",
		"oldsrcs/example/build/source.js",
		"recovery/cursor-session/snapshot.txt",
		"CLAUDE.md",
		".git/HEAD",
	];
	const excluded = [
		"build/package/output.js",
		"dev/out/preview.png",
		"gulp-mu-ps/test/out/render.png",
		"gulp-mu-ps/examples-out/render.png",
		".microgulp/state.json",
		"node_modules/dependency/index.js",
		"gulp-mu-css/node_modules/dependency/index.js",
		"demos/glittery/.cache/build.json",
	];
	for (const path of [...included, ...excluded]) {
		const file = join(source, path);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, path);
	}
	mkdirSync(destination);
	AssertSeparateBackupPaths(source, destination);
	// Copy only inside this isolated fixture. No NAS access and no /MIR.
	const result = spawnSync("robocopy", [source, destination, "/E", "/R:0", "/W:0", "/XD", ...GetNasBackupExcludedDirs(source)], {
		encoding: "utf8",
		windowsHide: true,
	});
	assert.ifError(result.error);
	assert.ok(result.status !== null && result.status < 8, result.stdout + result.stderr);
	for (const path of included) assert.equal(readFileSync(join(destination, path), "utf8"), path);
	for (const path of excluded) assert.equal(existsSync(join(destination, path)), false, path);
});

//===============================================================
// µCSS / µPS root build gulp script
// © 2026 Meinolf Amekudzi
//
// Classic CLI:  gulp test | gulp docs:manual | gulp build:publish | gulp backup:nas
// µGulp:        open this repo in VS Code/Cursor — tasks appear in the dashboard
//               with µDisplayName, progress bars and structured log output.
//
// Versioning (gulp-mu-css): gulp-mu-css/RELEASES.json is the version source.
//===============================================================

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import gulp from "gulp";
import { GetNasBackupExcludedDirs, AssertSeparateBackupPaths } from "./tools/nas-backup.mjs";
import {
	Log,
	ReportProgress,
	InstallStringExtensions,
	IsMicroGulp,
	LogBuildDebugReport,
	RequestForm,
} from "gulp-mu-gulp-api";
import {
	GetVersionHistoryString,
	GetCurrentFullVersionString,
} from "./gulp-mu-css/src/api/Releases.mjs";

InstallStringExtensions();

export const µI18xContext = { project: 'microCSS' };

const rootDir = dirname(fileURLToPath(import.meta.url));
const CSS_PKG = join(rootDir, "gulp-mu-css");
const PS_PKG = join(rootDir, "gulp-mu-ps");
const FT_PKG = join(rootDir, "gulp-mu-ft");
const AU_PKG = join(rootDir, "gulp-mu-au");

/** @param {boolean} _inDashboard */
function _AssetDebugEnabled(_inDashboard) {
	if (_inDashboard) return true;
	const flag = String(process.env.MICROGULP_THEME_DEBUG ?? "").trim().toLowerCase();
	return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
}

function _RunCommand(_command, _args, _cwd, _env) {
	return new Promise((_resolve, _reject) => {
		const child = spawn(_command, _args, {
			cwd: _cwd,
			stdio: "inherit",
			shell: true,
			windowsHide: true,
			env: _env ?? process.env,
		});
		child.on("close", (_code) => {
			if (_code === 0) _resolve();
			else _reject(new Error(`${_command} ${_args.join(" ")} failed with exit code ${_code}`));
		});
	});
}

function _RunNpm(_args, _cwd) {
	return _RunCommand("npm", _args, _cwd);
}

function _RunNode(_args, _cwd, _env) {
	return _RunCommand("node", _args, _cwd, _env);
}

const NAS_BACKUP_DEFAULT = "Z:\\Projects\\microCSS";
const NAS_BACKUP_EXCLUDE_DIRS = Object.freeze(GetNasBackupExcludedDirs(rootDir));
const NAS_BACKUP_EXCLUDE_FILES = Object.freeze(["Thumbs.db", ".DS_Store", "desktop.ini"]);

function _NasBackupPath() {
	const override = String(process.env.MU_NAS_BACKUP ?? process.env.MICROGULP_NAS_BACKUP ?? "").trim();
	return override || NAS_BACKUP_DEFAULT;
}

/**
 * Robocopy uses 0–7 as success (copied / extra / mismatched). 8+ is a failure.
 * @param {string[]} _args
 * @returns {Promise<number>}
 */
function _RunRobocopy(_args) {
	return new Promise((_resolve, _reject) => {
		const child = spawn("robocopy", _args, {
			stdio: "inherit",
			cwd: rootDir,
			windowsHide: true,
		});
		child.on("exit", (_code) => {
			const exitCode = _code ?? 1;
			if (exitCode < 8) _resolve(exitCode);
			else _reject(new Error(`robocopy exited with code ${exitCode}`));
		});
		child.on("error", _reject);
	});
}

/** @returns {string|null} npm username when logged in */
function _NpmWhoami() {
	const result = spawnSync("npm", ["whoami"], {
		stdio: ["ignore", "pipe", "ignore"],
		shell: true,
			windowsHide: true,
		encoding: "utf8",
	});
	return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

/**
 * Prepares env for tools/publish.mjs — reuses an existing npm session, never
 * forces browser login from the µGulp worker (no TTY). Optional 2FA via form.
 * @returns {Promise<NodeJS.ProcessEnv>}
 */
async function _PublishEnv() {
	const publishEnv = { ...process.env };
	const npmUser = _NpmWhoami();

	if (npmUser) {
		publishEnv.MU_LOGIN = "0";
		Log("npm: logged in as <user/><context=\"task log\"/>", { user: npmUser });
	} else if (IsMicroGulp()) {
		throw new Error(
			"Not logged in to npm. Run once in a terminal: npm login --auth-type=web — then retry Publish from the dashboard."
		);
	}

	if (IsMicroGulp() && !publishEnv.MU_OTP) {
		const values = await RequestForm({
			title: "npm publish",
			fields: [{
				name: "otp",
				label: "2FA one-time code (optional — leave empty if not required)",
				type: "password",
			}],
		});
		const otp = values?.otp?.trim() ?? "";
		if (otp) {
			if (!/^\d{6,8}$/.test(otp)) {
				throw new Error("Invalid npm OTP — expected 6–8 digits.");
			}
			publishEnv.MU_OTP = otp;
		}
	}

	return publishEnv;
}

/**
 * Applies µGulp task metadata. Keeps optional gulp CLI displayName for npm scripts.
 * @param {Function} _task
 * @param {object} _meta
 */
function _Tag(_task, _meta) {
	if (_meta.gulpName) _task.displayName = _meta.gulpName;
	if (_meta.µDisplayName) _task.µDisplayName = _meta.µDisplayName.i18xRegister();
	if (_meta.µDescription) _task.µDescription = _meta.µDescription.i18xRegister();
	if (_meta.µTooltip) _task.µTooltip = _meta.µTooltip.i18xRegister();
	if (_meta.µGroup) _task.µGroup = _meta.µGroup.i18xRegister();
	if (_meta.µIcon != null) _task.µIcon = _meta.µIcon;
	if (_meta.µOrder != null) _task.µOrder = _meta.µOrder;
	if (_meta.µExecutionConcurrency != null) _task.µExecutionConcurrency = _meta.µExecutionConcurrency;
	if (_meta.µExecutionRestrictions) _task.µExecutionRestrictions = _meta.µExecutionRestrictions;
	return _task;
}

async function _RunPackageTests(_label, _cwd) {
	Log("Running <label/> tests\u2026<context=\"task log\"/>", { label: _label });
	ReportProgress(0, _label);
	await _RunNpm(["test"], _cwd);
	ReportProgress(1, _label);
	Log("<label/> tests passed.<context=\"task log\"/>", { label: _label });
}

// ---------------------------------------------------------------
// tests
// ---------------------------------------------------------------

export async function TEST_MICROCSS() {
	await _RunPackageTests("gulp-mu-css", CSS_PKG);
}
_Tag(TEST_MICROCSS, {
	gulpName: "test:microcss",
	µDisplayName: "Test µCSS<context=\"µDisplayName\"/>",
	µDescription: "Runs the gulp-mu-css unit tests (compiler, sprites, BuildSkin).<context=\"µDescription\"/>",
	µIcon: "\u2714",
	µGroup: "Quality<context=\"µGroup\"/>",
	µOrder: 10,
	µExecutionConcurrency: true,
});

export async function TEST_MICROPS() {
	await _RunPackageTests("gulp-mu-ps", PS_PKG);
}
_Tag(TEST_MICROPS, {
	gulpName: "test:microps",
	µDisplayName: "Test µPS<context=\"µDisplayName\"/>",
	µDescription: "Runs the gulp-mu-ps unit tests (PSD compositor against legacy reference images).<context=\"µDescription\"/>",
	µIcon: "\u2714",
	µGroup: "Quality<context=\"µGroup\"/>",
	µOrder: 11,
	µExecutionConcurrency: true,
});

export async function TEST_MICROFT() {
	await _RunPackageTests("gulp-mu-ft", FT_PKG);
}
_Tag(TEST_MICROFT, {
	gulpName: "test:microft",
	µDisplayName: "Test µFT<context=\"µDisplayName\"/>",
	µDescription: "Runs the gulp-mu-ft unit tests (icon font generation from SVG glyphs).<context=\"µDescription\"/>",
	µIcon: "\u2714",
	µGroup: "Quality<context=\"µGroup\"/>",
	µOrder: 12,
	µExecutionConcurrency: true,
});

export async function TEST_MICROAU() {
	await _RunPackageTests("gulp-mu-au", AU_PKG);
}
_Tag(TEST_MICROAU, {
	gulpName: "test:microau",
	µDisplayName: "Test µAU<context=\"µDisplayName\"/>",
	µDescription: "Runs the gulp-mu-au unit tests (sound atlas generation).<context=\"µDescription\"/>",
	µIcon: "\u2714",
	µGroup: "Quality<context=\"µGroup\"/>",
	µOrder: 13,
	µExecutionConcurrency: true,
});

export const TEST = gulp.series(TEST_MICROCSS, TEST_MICROPS, TEST_MICROFT, TEST_MICROAU);
_Tag(TEST, {
	gulpName: "test",
	µDisplayName: "Run All Tests<context=\"µDisplayName\"/>",
	µDescription: "Runs every package test suite (µCSS, µPS, µFT, µAU).<context=\"µDescription\"/>",
	µIcon: "\u2714",
	µGroup: "Quality<context=\"µGroup\"/>",
	µOrder: 5,
	µExecutionConcurrency: false,
});

// ---------------------------------------------------------------
// demos & examples
// ---------------------------------------------------------------

export async function BUILD_DEMOS() {
	const { BuildDemos } = await import("./tools/build-demos.mjs");
	const debug = { thumbnails: true, thumbnailSize: 160, maxThumbnails: 64 };
	Log("Building marketing demos (glittery, flyex, buttons)\u2026<context=\"task log\"/>");
	await BuildDemos({
		debug,
		onProgress: (_value, _label) => ReportProgress(_value, _label),
		onDemoBuilt: (_demoId, _report) => {
			if (_report.debug) {
				LogBuildDebugReport(_report, {
					columns: 3,
					table: false,
					title: `Demo <id/> assets<context=\"build log\"/>`.i18xTrans({ id: _demoId }),
				});
			}
		},
	});
	Log("Demo builds complete.<context=\"task log\"/>");
}
_Tag(BUILD_DEMOS, {
	gulpName: "demos:build",
	µDisplayName: "Build Demos<context=\"µDisplayName\"/>",
	µDescription: "Builds glittery, flyex and buttons demos via BuildSkin; shows asset thumbnails in µGulp.<context=\"µDescription\"/>",
	µTooltip: "Output lands in demos/*/dist/. Set MICROGULP_THEME_DEBUG=1 for CLI asset previews.<context=\"µTooltip\"/>",
	µIcon: "\u25A3",
	µGroup: "Build/Demos<context=\"µGroup\"/>",
	µOrder: 30,
	µExecutionConcurrency: false,
});

export async function RENDER_EXAMPLES() {
	Log("Rendering µPS examples\u2026<context=\"task log\"/>");
	ReportProgress(0, "examples");
	await _RunNode(["tools/render-examples.mjs"], PS_PKG);
	ReportProgress(1, "examples");
	Log("Examples rendered into gulp-mu-ps/examples-out/.<context=\"task log\"/>");
}
_Tag(RENDER_EXAMPLES, {
	gulpName: "examples:render",
	µDisplayName: "Render Examples<context=\"µDisplayName\"/>",
	µDescription: "Renders all µPS example outputs into gulp-mu-ps/examples-out/.<context=\"µDescription\"/>",
	µGroup: "Build/Examples<context=\"µGroup\"/>",
	µOrder: 40,
});

export async function RENDER_REFERENCE() {
	await _RunNode(["tools/render-reference.mjs"], PS_PKG);
}
_Tag(RENDER_REFERENCE, {
	gulpName: "reference:render",
	µDisplayName: "Render Reference<context=\"µDisplayName\"/>",
	µDescription: "Renders mups-reference.psd for Adobe PNG comparison.<context=\"µDescription\"/>",
	µGroup: "Build/Examples<context=\"µGroup\"/>",
	µOrder: 41,
});

export async function VERIFY_IMAGE_OPS() {
	const input = process.env.VERIFY_IMAGE ?? join(rootDir, "dev/Burosch_universaltestbild_avec-3840x2160_(3).jpg");
	const out = process.env.VERIFY_OUT ?? join(rootDir, "dev/out/image-ops");
	await _RunNode(["tools/verify-image-ops.mjs", input, out], PS_PKG);
}
_Tag(VERIFY_IMAGE_OPS, {
	gulpName: "verify:image-ops",
	µDisplayName: "Verify Image Ops<context=\"µDisplayName\"/>",
	µDescription: "Renders adjustment/transform samples from a reference photo (VERIFY_IMAGE, VERIFY_OUT).<context=\"µDescription\"/>",
	µGroup: "Build/Examples<context=\"µGroup\"/>",
	µOrder: 42,
});

// ---------------------------------------------------------------
// documentation
// ---------------------------------------------------------------

async function BUILD_MANUAL_DOCX() {
	await _RunNode(["tools/build-manual.mjs"], CSS_PKG);
}
_Tag(BUILD_MANUAL_DOCX, { gulpName: "docs:manual:docx" });

async function BUILD_MANUAL_PDF() {
	await _RunNode(["tools/export-pdf.mjs", "docs/microCSS-de.docx"], CSS_PKG);
}
_Tag(BUILD_MANUAL_PDF, { gulpName: "docs:manual:pdf" });

async function BUILD_MANUAL_DOCX_EN() {
	await _RunNode(["tools/build-manual.mjs", "--lang=en"], CSS_PKG);
}
_Tag(BUILD_MANUAL_DOCX_EN, { gulpName: "docs:manual:en:docx" });

async function BUILD_MANUAL_PDF_EN() {
	await _RunNode(["tools/export-pdf.mjs", "docs/microCSS-en.docx"], CSS_PKG);
}
_Tag(BUILD_MANUAL_PDF_EN, { gulpName: "docs:manual:en:pdf" });

export const BUILD_MANUAL_EN = gulp.series(BUILD_MANUAL_DOCX_EN, BUILD_MANUAL_PDF_EN);
_Tag(BUILD_MANUAL_EN, {
	gulpName: "docs:manual:en",
	µDisplayName: "Build Manual (EN)<context=\"µDisplayName\"/>",
	µDescription: "English manual: markdown \u2192 docx \u2192 PDF.<context=\"µDescription\"/>",
	µGroup: "Docs<context=\"µGroup\"/>",
	µOrder: 20,
	µExecutionConcurrency: false,
});

export const BUILD_MANUAL = gulp.series(BUILD_MANUAL_DOCX, BUILD_MANUAL_PDF, BUILD_MANUAL_DOCX_EN, BUILD_MANUAL_PDF_EN);
_Tag(BUILD_MANUAL, {
	gulpName: "docs:manual",
	µDisplayName: "Build Manual<context=\"µDisplayName\"/>",
	µDescription: "Rebuilds the µCSS manual in German and English (markdown \u2192 docx \u2192 PDF). Run before publish.<context=\"µDescription\"/>",
	µIcon: "\u2637",
	µGroup: "Docs<context=\"µGroup\"/>",
	µOrder: 10,
	µExecutionConcurrency: false,
});

// ---------------------------------------------------------------
// publish
// ---------------------------------------------------------------

export async function BUILD_PUBLISH() {
	Log("Preparing npm publish bundles under build/\u2026<context=\"task log\"/>");
	ReportProgress(0, "prepare-publish");
	await _RunNode(["tools/prepare-publish.mjs"], rootDir);
	ReportProgress(1, "prepare-publish");
	Log("Publish bundles ready in build/.<context=\"task log\"/>");
}
_Tag(BUILD_PUBLISH, {
	gulpName: "build:publish",
	µDisplayName: "Prepare Publish<context=\"µDisplayName\"/>",
	µDescription: "Copies publish-ready bundles (gulp-mu-css, gulp-mu-ps, gulp-mu-ft, gulp-mu-au) into build/.<context=\"µDescription\"/>",
	µIcon: "\u25C8",
	µGroup: "Publish<context=\"µGroup\"/>",
	µOrder: 10,
	µExecutionConcurrency: false,
	µExecutionRestrictions: { deny: ["PUBLISH", "BUILD_AND_PUBLISH"] },
});

export async function PUBLISH() {
	Log("Publishing to npm\u2026<context=\"task log\"/>");
	const publishEnv = await _PublishEnv();
	await _RunNode(["tools/publish.mjs"], rootDir, publishEnv);
	Log("Publish finished.<context=\"task log\"/>");
}
_Tag(PUBLISH, {
	gulpName: "publish",
	µDisplayName: "Publish to npm<context=\"µDisplayName\"/>",
	µDescription: "Publishes build/ bundles to npm. Reuses your npm session; 2FA code via dashboard form when needed.<context=\"µDescription\"/>",
	µTooltip: "Run Prepare Publish first (or MU_BUILD=1). One-time browser login in a terminal: npm login --auth-type=web<context=\"µTooltip\"/>",
	µIcon: "\u2191",
	µGroup: "Publish<context=\"µGroup\"/>",
	µOrder: 20,
	µExecutionConcurrency: false,
});

export const BUILD_AND_PUBLISH = gulp.series(BUILD_PUBLISH, PUBLISH);
_Tag(BUILD_AND_PUBLISH, {
	gulpName: "build:and:publish",
	µDisplayName: "Build and Publish<context=\"µDisplayName\"/>",
	µDescription: "Refreshes build/ bundles then publishes to npm.<context=\"µDescription\"/>",
	µGroup: "Publish<context=\"µGroup\"/>",
	µOrder: 5,
	µExecutionConcurrency: false,
});

// ---------------------------------------------------------------
// migration tools
// ---------------------------------------------------------------

async function LEGACY_CONVERT() {
	await _RunNode(["tools/convert-mucss.mjs"], CSS_PKG);
}
_Tag(LEGACY_CONVERT, { gulpName: "legacy:convert" });

async function LEGACY_COMPARE() {
	await _RunNode(["tools/compare-legacy-skin.mjs"], CSS_PKG);
}
_Tag(LEGACY_COMPARE, { gulpName: "legacy:compare" });

export const LEGACY_TEST = gulp.series(LEGACY_CONVERT, LEGACY_COMPARE);
_Tag(LEGACY_TEST, {
	gulpName: "test:legacy-migration",
	µDisplayName: "Legacy Migration Test<context=\"µDisplayName\"/>",
	µDescription: "Full µCSS 1 migration check (convert + compare). Requires a local project extract.<context=\"µDescription\"/>",
	µGroup: "Quality/Legacy<context=\"µGroup\"/>",
	µOrder: 50,
});

async function CONVERT_LESS() {
	const input = process.env.LESS_IN ?? "examples/less";
	const out = process.env.LESS_OUT;
	const args = ["tools/convert-less.mjs", input];
	if (out) args.push(out);
	await _RunNode(args, CSS_PKG);
}
_Tag(CONVERT_LESS, { gulpName: "convert:less" });

async function CONVERT_VUE() {
	const input = process.env.VUE_IN ?? "examples/vue";
	const out = process.env.VUE_OUT;
	const args = ["tools/convert-vue.mjs", input];
	if (out) args.push(out);
	await _RunNode(args, CSS_PKG);
}
_Tag(CONVERT_VUE, { gulpName: "convert:vue" });

// ---------------------------------------------------------------
// maintenance
// ---------------------------------------------------------------

export async function BACKUP_TO_NAS() {
	if (process.platform !== "win32") {
		throw new Error("BACKUP_TO_NAS requires Windows (robocopy) and the NAS drive letter.");
	}
	const destination = _NasBackupPath();
	if (!existsSync(destination)) {
		throw new Error(`BACKUP_TO_NAS: destination "${destination}" is missing. Create the folder on the NAS first.`);
	}
	const sourceResolved = resolve(rootDir);
	const destResolved = resolve(destination);
	AssertSeparateBackupPaths(sourceResolved, destResolved);
	Log("Mirroring project \u2192 <path/> (changes only)<context=\"build log\"/>", { path: destResolved });
	Log("Skipping <dirs/><context=\"build log\"/>", { dirs: NAS_BACKUP_EXCLUDE_DIRS.join(", ") });
	const exitCode = await _RunRobocopy([
		sourceResolved,
		destResolved,
		"/MIR",
		"/FFT",
		"/DST",
		"/R:2",
		"/W:2",
		"/MT:8",
		"/NFL",
		"/NDL",
		"/NP",
		"/XD",
		...NAS_BACKUP_EXCLUDE_DIRS,
		"/XF",
		...NAS_BACKUP_EXCLUDE_FILES,
	]);
	Log("NAS backup finished (robocopy <code format=\"int\"/>).<context=\"build log\"/>", { code: exitCode });
}
_Tag(BACKUP_TO_NAS, {
	gulpName: "backup:nas",
	µDisplayName: "Backup to NAS<context=\"µDisplayName\"/>",
	µDescription: "Mirrors the project to Z:\\Projects\\microCSS. Includes src/build and recovery; skips dependencies, caches and generated output.<context=\"µDescription\"/>",
	µTooltip: "Copies and deletes only differences. Override the destination with MU_NAS_BACKUP. Gitignored trees such as oldsrcs and CLAUDE.md are included.<context=\"µTooltip\"/>",
	µIcon: "\uE902",
	µGroup: "Build/Maintenance<context=\"µGroup\"/>",
	µOrder: 80,
	µExecutionConcurrency: false,
	µExecutionRestrictions: { deny: ["PUBLISH", "BUILD_AND_PUBLISH", "BUILD_PUBLISH"] },
});

// ---------------------------------------------------------------
// version history
// ---------------------------------------------------------------

export async function SHOW_VERSION_HISTORY() {
	Log(GetVersionHistoryString());
	Log("Current package version: <version/><context=\"build log\"/>", {
		version: GetCurrentFullVersionString(),
	});
}
_Tag(SHOW_VERSION_HISTORY, {
	µDisplayName: "Version History<context=\"µDisplayName\"/>",
	µDescription: "Prints the formatted µCSS release history from gulp-mu-css/RELEASES.json.<context=\"µDescription\"/>",
	µIcon: "\u2139",
	µGroup: "About<context=\"µGroup\"/>",
	µOrder: 90,
});

// backward-compatible export aliases (classic gulp CLI names)
export { TEST_MICROCSS as TestMicroCSS };
export { TEST_MICROPS as TestMicroPS };
export { TEST_MICROFT as TestMicroFT };
export { TEST_MICROAU as TestMicroAU };
export { TEST as Test };
export { BUILD_DEMOS as BuildDemos };
export { RENDER_EXAMPLES as RenderExamples };
export { RENDER_REFERENCE as RenderReference };
export { VERIFY_IMAGE_OPS as VerifyImageOps };
export { BUILD_MANUAL_EN as BuildManualEn };
export { BUILD_MANUAL as BuildManual };
export { BUILD_PUBLISH as BuildPublish };
export { PUBLISH as Publish };
export { BUILD_AND_PUBLISH as BuildAndPublish };
export { LEGACY_TEST as LegacyTest };
export { BACKUP_TO_NAS as BackupToNas };

export default TEST;

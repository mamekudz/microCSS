// Root build file for the microCSS / microPS project.
// All tests and future build steps are exposed as gulp tasks here.

import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import gulp from "gulp";

const rootDir = dirname(fileURLToPath(import.meta.url));

function _RunCommand(_command, _args, _cwd) {
	return new Promise((_resolve, _reject) => {
		const child = spawn(_command, _args, {
			cwd: _cwd,
			stdio: "inherit",
			shell: true
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

export function TestMicroPS() {
	return _RunNpm(["test"], join(rootDir, "gulp-mu-ps"));
}
TestMicroPS.displayName = "test:microps";
TestMicroPS.description = "Runs the microPS unit tests (rendering against legacy reference images).";

export function TestMicroCSS() {
	return _RunNpm(["test"], join(rootDir, "gulp-mu-css"));
}
TestMicroCSS.displayName = "test:microcss";
TestMicroCSS.description = "Runs the microCSS unit tests (compiler core and color API).";

export function TestMicroFT() {
	return _RunNpm(["test"], join(rootDir, "gulp-mu-ft"));
}
TestMicroFT.displayName = "test:microft";
TestMicroFT.description = "Runs the microFT unit tests (icon font generation from SVG glyphs).";

export function TestMicroAU() {
	return _RunNpm(["test"], join(rootDir, "gulp-mu-au"));
}
TestMicroAU.displayName = "test:microau";
TestMicroAU.description = "Runs the microAU unit tests (sound atlas generation from audio files).";

export function RenderExamples() {
	return _RunCommand("node", ["tools/render-examples.mjs"], join(rootDir, "gulp-mu-ps"));
}
RenderExamples.displayName = "examples:render";
RenderExamples.description = "Renders all microPS example outputs permanently into gulp-mu-ps/examples-out.";

export function RenderReference() {
	return _RunCommand("node", ["tools/render-reference.mjs"], join(rootDir, "gulp-mu-ps"));
}
RenderReference.displayName = "reference:render";
RenderReference.description = "Renders mups-reference.psd into test/.tmp-mups-reference for Adobe PNG comparison.";

export function VerifyImageOps() {
	const input = process.env.VERIFY_IMAGE ?? join(rootDir, "dev/Burosch_universaltestbild_avec-3840x2160_(3).jpg");
	const out = process.env.VERIFY_OUT ?? join(rootDir, "dev/out/image-ops");
	return _RunCommand("node", ["tools/verify-image-ops.mjs", input, out], join(rootDir, "gulp-mu-ps"));
}
VerifyImageOps.displayName = "verify:image-ops";
VerifyImageOps.description = "Renders adjustment/transform samples from a reference photo (VERIFY_IMAGE, VERIFY_OUT).";

export function BuildManualDocx() {
	return _RunCommand("node", ["tools/build-manual.mjs"], join(rootDir, "gulp-mu-css"));
}
BuildManualDocx.displayName = "docs:manual:docx";
BuildManualDocx.description = "Generates gulp-mu-css/docs/microCSS-de.docx from the German markdown manual.";

export function BuildManualPdf() {
	return _RunCommand("node", ["tools/export-pdf.mjs", "docs/microCSS-de.docx"], join(rootDir, "gulp-mu-css"));
}
BuildManualPdf.displayName = "docs:manual:pdf";
BuildManualPdf.description = "Exports gulp-mu-css/docs/microCSS-de.pdf from the German docx via LibreOffice (updates TOC/fields). Requires the GulpHelper macro deployed to LibreOffice.";

export function BuildManualDocxEn() {
	return _RunCommand("node", ["tools/build-manual.mjs", "--lang=en"], join(rootDir, "gulp-mu-css"));
}
BuildManualDocxEn.displayName = "docs:manual:en:docx";
BuildManualDocxEn.description = "Generates gulp-mu-css/docs/microCSS-en.docx from the English markdown manual.";

export function BuildManualPdfEn() {
	return _RunCommand("node", ["tools/export-pdf.mjs", "docs/microCSS-en.docx"], join(rootDir, "gulp-mu-css"));
}
BuildManualPdfEn.displayName = "docs:manual:en:pdf";
BuildManualPdfEn.description = "Exports gulp-mu-css/docs/microCSS-en.pdf from the English docx via LibreOffice (updates TOC/fields). Requires the GulpHelper macro deployed to LibreOffice.";

export const BuildManualEn = gulp.series(BuildManualDocxEn, BuildManualPdfEn);
BuildManualEn.displayName = "docs:manual:en";
BuildManualEn.description = "Rebuilds the English microCSS manual: markdown -> docx -> PDF (TOC updated).";

export const BuildManual = gulp.series(BuildManualDocx, BuildManualPdf, BuildManualDocxEn, BuildManualPdfEn);
BuildManual.displayName = "docs:manual";
BuildManual.description = "Rebuilds the microCSS manual in both languages (German + English): markdown -> docx -> PDF (TOC updated). Run before build:publish.";

export function BuildPublish() {
	return _RunCommand("node", ["tools/prepare-publish.mjs"], rootDir);
}
BuildPublish.displayName = "build:publish";
BuildPublish.description = "Copies publish-ready bundles (microCSS, microPS, microFT, microAU) into build/ (run docs:manual first to refresh the bundled PDF).";

export function Publish() {
	return _RunCommand("node", ["tools/publish.mjs"], rootDir);
}
Publish.displayName = "publish";
Publish.description = "Publishes build/ bundles to npm (browser login by default in tools/publish.mjs). Env: MU_OTP, MU_LOGIN=0, MU_ONLY, MU_TAG, MU_BUILD, MU_DRY_RUN.";

export const BuildAndPublish = gulp.series(BuildPublish, Publish);
BuildAndPublish.displayName = "build:and:publish";
BuildAndPublish.description = "Refreshes build/ bundles then publishes to npm (browser login via MU_LOGIN=1 before publish).";

export function LegacyConvert() {
	return _RunCommand("node", ["tools/convert-mucss.mjs"], join(rootDir, "gulp-mu-css"));
}
LegacyConvert.displayName = "legacy:convert";
LegacyConvert.description = "Converts a legacy µCSS 1 skin (project dir argument) to .mcss + manifest.";

export function ConvertLess() {
	const input = process.env.LESS_IN ?? "examples/less";
	const out = process.env.LESS_OUT;
	const args = ["tools/convert-less.mjs", input];
	if (out) args.push(out);
	return _RunCommand("node", args, join(rootDir, "gulp-mu-css"));
}
ConvertLess.displayName = "convert:less";
ConvertLess.description = "Converts LESS sources to .µ.css + a manifest skeleton (LESS_IN=<file|dir>, LESS_OUT=<dir>).";

export function ConvertVue() {
	const input = process.env.VUE_IN ?? "examples/vue";
	const out = process.env.VUE_OUT;
	const args = ["tools/convert-vue.mjs", input];
	if (out) args.push(out);
	return _RunCommand("node", args, join(rootDir, "gulp-mu-css"));
}
ConvertVue.displayName = "convert:vue";
ConvertVue.description = "Extracts Vue SFC <style> blocks into co-located *.π.css sidecars + manifest (VUE_IN=<file|dir>, VUE_OUT=<dir>).";

export function BuildDemos() {
	return _RunCommand("node", ["tools/build-demos.mjs"], rootDir);
}
BuildDemos.displayName = "demos:build";
BuildDemos.description = "Builds marketing demos (glittery, flyex) into demos/*/dist/.";

export function LegacyCompare() {
	return _RunCommand("node", ["tools/compare-legacy-skin.mjs"], join(rootDir, "gulp-mu-css"));
}
LegacyCompare.displayName = "legacy:compare";
LegacyCompare.description = "M5 acceptance test: builds a converted legacy skin and compares it against the legacy std.css.";

export const LegacyTest = gulp.series(LegacyConvert, LegacyCompare);
LegacyTest.displayName = "test:legacy-migration";
LegacyTest.description = "Runs the full legacy µCSS 1 migration check (convert + compare). Requires a local project extract.";

export const Test = gulp.series(TestMicroCSS, TestMicroPS, TestMicroFT, TestMicroAU);
Test.displayName = "test";
Test.description = "Runs all project tests.";

export default Test;

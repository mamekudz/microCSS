// Updates fields/table of contents in a DOCX and exports it to PDF via
// LibreOffice in headless mode, mirroring the eMP manual pipeline.
//
// It calls the LibreOffice Basic macro
//   GulpHelper.GulpHelper.API_UpdateAndPDFExport
// (deployed once per workstation in the LibreOffice user macros) which opens
// the document, refreshes all cross references, fields and the table of
// contents, exports the result as "<name>.pdf" next to the source and writes a
// "<name>.txt" sentinel - that is how we know the fire-and-forget soffice run
// is done. The leftover soffice processes are then hard-killed to free the
// file locks.
//
// Usage: node tools/export-pdf.mjs <docx> [<pdfOut>] [--soffice <path>]
//   docx     source document; defaults to docs/microCSS-de.docx
//   pdfOut   target PDF; defaults to "<docx without extension>.pdf"

import { existsSync, rmSync, copyFileSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const DEFAULT_SOFFICE = process.env.SOFFICE_PATH
	?? "C:/Program Files/LibreOffice/program/soffice.exe";
const MACRO = "macro:///GulpHelper.GulpHelper.API_UpdateAndPDFExport";
const SENTINEL_TIMEOUT_MS = 10 * 60 * 1000;

function _Sleep(_ms) {
	return new Promise((_resolve) => setTimeout(_resolve, _ms));
}

async function _WaitForFile(_path, _timeoutMs) {
	const deadline = Date.now() + _timeoutMs;
	while (Date.now() < deadline) {
		if (existsSync(_path)) return true;
		await _Sleep(500);
	}
	return false;
}

// Terminates leftover headless LibreOffice processes (Windows: taskkill). Must
// complete before the next run, otherwise the file locks survive.
async function _KillLibreOffice() {
	await _Sleep(500);
	if (process.platform !== "win32") return;
	for (const image of ["soffice.bin", "soffice.exe"]) {
		try {
			execSync(`taskkill /F /IM ${image} /T`, { stdio: "ignore" });
		} catch {
			// not running - ignore
		}
	}
}

function _StripExtension(_path) {
	return _path.replace(/\.[^.\\/]+$/, "");
}

export async function ExportDocxToPdf(_docxPath, _pdfOut, _sofficePath = DEFAULT_SOFFICE) {
	const docx = resolve(_docxPath);
	if (!existsSync(docx)) throw new Error(`export-pdf: source not found: ${docx}`);
	if (!existsSync(_sofficePath)) {
		throw new Error(`export-pdf: LibreOffice not found: ${_sofficePath} `
			+ "(set SOFFICE_PATH or pass --soffice <path>)");
	}

	const sentinel = `${_StripExtension(docx)}.txt`;
	const pdfBesideDocx = `${_StripExtension(docx)}.pdf`;
	const pdfOut = resolve(_pdfOut ?? pdfBesideDocx);

	if (existsSync(sentinel)) rmSync(sentinel);
	await _KillLibreOffice();

	console.log(`export-pdf: ${docx} -> ${pdfOut} (via LibreOffice macro)`);
	const child = spawn(_sofficePath, ["--headless", docx.replace(/\\/g, "/"), MACRO], { stdio: "pipe" });
	let stderr = "";
	child.stderr?.on("data", (_chunk) => { stderr += _chunk.toString(); });

	const done = await _WaitForFile(sentinel, SENTINEL_TIMEOUT_MS);
	try { child.kill("SIGKILL"); } catch { /* already gone */ }
	await _KillLibreOffice();

	if (!done) {
		if (stderr.trim()) console.error(`LibreOffice stderr:\n${stderr.trim()}`);
		throw new Error("export-pdf: GulpHelper macro did not finish. Is the macro "
			+ "deployed to LibreOffice (eMP: dev/copyto_ProgramFiles_LibreOffice_share_basic/GulpHelper)?");
	}
	if (existsSync(sentinel)) rmSync(sentinel);

	if (!existsSync(pdfBesideDocx)) {
		throw new Error(`export-pdf: macro finished but no PDF was produced at ${pdfBesideDocx}`);
	}
	if (resolve(pdfBesideDocx) !== pdfOut) {
		copyFileSync(pdfBesideDocx, pdfOut);
		rmSync(pdfBesideDocx);
	}
	console.log(`export-pdf: written ${pdfOut}`);
	return pdfOut;
}

// ---------------------------------------------------------------------- CLI

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2);
	let soffice = DEFAULT_SOFFICE;
	const positional = [];
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--soffice") { soffice = args[++i]; continue; }
		positional.push(args[i]);
	}
	const docx = positional[0] ?? join(here, "..", "docs", "microCSS-de.docx");
	const pdfOut = positional[1];
	await ExportDocxToPdf(docx, pdfOut, soffice);
}

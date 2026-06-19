// Opens draft files (PSD, PNG, …) in the OS default app or in Affinity Photo.

import { accessSync, constants } from "node:fs";
import { spawn } from "node:child_process";
import { platform } from "node:process";
import { resolve } from "node:path";

const AFFINITY_MAC_APP_NAMES = ["Affinity", "Affinity Photo 2", "Affinity Photo"];

const AFFINITY_WIN_CANDIDATES = [
	"Affinity/Photo.exe",
	"Affinity Photo 2/Photo.exe",
	"Serif/Affinity Photo 2/AffinityPhoto.exe"
];

function _FileExists(_path) {
	try {
		accessSync(_path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

function _WindowsProgramFiles() {
	const roots = [process.env["ProgramFiles"], process.env["ProgramFiles(x86)"]].filter(Boolean);
	return roots;
}

/** @returns {string | null} Absolute path to Affinity, or null if not found. */
export function ResolveAffinityExecutable() {
	if (process.env.MU_AFFINITY_EXE) {
		const configured = resolve(process.env.MU_AFFINITY_EXE);
		if (!_FileExists(configured)) {
			throw new Error(`MU_AFFINITY_EXE points to a missing file: ${configured}`);
		}
		return configured;
	}

	if (platform() === "win32") {
		for (const root of _WindowsProgramFiles()) {
			for (const relative of AFFINITY_WIN_CANDIDATES) {
				const candidate = resolve(root, relative);
				if (_FileExists(candidate)) return candidate;
			}
		}
		return null;
	}

	if (platform() === "darwin") {
		for (const name of AFFINITY_MAC_APP_NAMES) {
			const candidate = `/Applications/${name}.app`;
			if (_FileExists(candidate)) return candidate;
		}
		return null;
	}

	return null;
}

function _ResolveAppTarget(_app) {
	const app = _app ?? process.env.MU_DRAFT_APP ?? "default";
	if (app === "photopea") {
		throw new Error(
			'app "photopea" is async — use await OpenPhotopeaDrafts(paths, options) instead. '
			+ "CLI: node tools/open-drafts.mjs --app photopea [--wait] <file.psd>"
		);
	}
	if (app === "default") return { mode: "default" };
	if (app === "affinity") {
		const exe = ResolveAffinityExecutable();
		if (!exe) {
			throw new Error(
				"Affinity executable not found. Set MU_AFFINITY_EXE or install Affinity."
			);
		}
		return platform() === "darwin" ? { mode: "mac-app", target: exe } : { mode: "exe", target: exe };
	}
	const custom = resolve(app);
	if (!_FileExists(custom)) {
		throw new Error(`Draft editor executable not found: ${custom}`);
	}
	return { mode: "exe", target: custom };
}

function _OpenOne(_path, _appTarget) {
	const absPath = resolve(_path);
	if (!_FileExists(absPath)) {
		throw new Error(`Draft file not found: ${absPath}`);
	}

	let child;
	if (platform() === "win32") {
		if (_appTarget.mode === "default") {
			child = spawn("cmd.exe", ["/c", "start", "", absPath], {
				detached: true,
				stdio: "ignore",
				windowsHide: true
			});
		} else {
			child = spawn(_appTarget.target, [absPath], {
				detached: true,
				stdio: "ignore",
				windowsHide: true
			});
		}
	} else if (platform() === "darwin") {
		if (_appTarget.mode === "default") {
			child = spawn("open", [absPath], { detached: true, stdio: "ignore" });
		} else if (_appTarget.mode === "mac-app") {
			child = spawn("open", ["-a", _appTarget.target, absPath], { detached: true, stdio: "ignore" });
		} else {
			child = spawn("open", ["-a", _appTarget.target, absPath], { detached: true, stdio: "ignore" });
		}
	} else {
		child = spawn("xdg-open", [absPath], { detached: true, stdio: "ignore" });
	}

	child.unref();
	return absPath;
}

/**
 * Opens one or more draft files in the default app or Affinity.
 * @param {string | string[]} _paths File or directory paths (directories are skipped).
 * @param {{ app?: "default" | "affinity" | "photopea" | string }} [_options]
 *   `app`: `"default"` (OS association), `"affinity"`, absolute path to an executable,
 *   or `"photopea"` (use `OpenPhotopeaDrafts` instead — async).
 *   Override via env `MU_DRAFT_APP` / `MU_AFFINITY_EXE`.
 * @returns {string[]} Absolute paths that were opened.
 */
export function OpenDrafts(_paths, _options = {}) {
	const list = Array.isArray(_paths) ? _paths : [_paths];
	const appTarget = _ResolveAppTarget(_options.app);
	const opened = [];
	for (const path of list) {
		opened.push(_OpenOne(path, appTarget));
	}
	return opened;
}

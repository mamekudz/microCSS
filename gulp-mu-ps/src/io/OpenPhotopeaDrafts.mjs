// Opens draft PSDs in Photopea via the URL/API (local CORS server + browser).

import { accessSync, constants } from "node:fs";
import { spawn } from "node:child_process";
import { platform } from "node:process";
import { resolve } from "node:path";
import {
	BuildPhotopeaUrl,
	CreatePhotopeaDraftServer,
	WritePhotopeaSaveBack
} from "./PhotopeaDraftServer.mjs";

/** @type {{ server: object, close: Function } | null} */
let _activeServer = null;

function _FileExists(_path) {
	try {
		accessSync(_path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

function _OpenBrowser(_url) {
	if (process.env.MU_PHOTOPEA_NO_BROWSER === "1") return;
	let child;
	if (platform() === "win32") {
		child = spawn("cmd.exe", ["/c", "start", "", _url], {
			detached: true,
			stdio: "ignore",
			windowsHide: true
		});
	} else if (platform() === "darwin") {
		child = spawn("open", [_url], { detached: true, stdio: "ignore" });
	} else {
		child = spawn("xdg-open", [_url], { detached: true, stdio: "ignore" });
	}
	child.unref();
}

/**
 * Returns the last Photopea draft server started by OpenPhotopeaDrafts (for CLI --wait).
 * @returns {{ baseUrl: string, saveUrl: string | null, close: Function } | null}
 */
export function GetActivePhotopeaDraftServer() {
	return _activeServer;
}

/**
 * Opens one or more draft files in Photopea (browser). Starts a local HTTP server with
 * CORS so Photopea can load the PSDs; optionally accepts save-back POSTs to overwrite
 * the original files (pair with WatchDrafts for rebuild).
 *
 * @param {string | string[]} _paths Draft file paths
 * @param {{
 *   saveBack?: boolean,
 *   script?: string,
 *   formats?: string[],
 *   port?: number,
 *   host?: string,
 *   onSave?: (_event: { path: string, meta: object, data: Buffer }) => void
 * }} [_options]
 * @returns {Promise<{ paths: string[], url: string, server: object, close: Function }>}
 */
export async function OpenPhotopeaDrafts(_paths, _options = {}) {
	const list = (Array.isArray(_paths) ? _paths : [_paths]).map((_p) => resolve(_p));
	for (const path of list) {
		if (!_FileExists(path)) throw new Error(`Draft file not found: ${path}`);
	}

	const saveBack = _options.saveBack !== false;
	const script = _options.script ?? process.env.MU_PHOTOPEA_SCRIPT;

	/** @type {Awaited<ReturnType<typeof CreatePhotopeaDraftServer>>} */
	let draftServer;
	draftServer = await CreatePhotopeaDraftServer({
		port: _options.port,
		host: _options.host,
		onSave: saveBack
			? (_event) => {
				const written = WritePhotopeaSaveBack(_event, draftServer);
				_options.onSave?.({ path: written, meta: _event.meta, data: _event.data });
				return { message: `Saved ${written}` };
			}
			: undefined
	});

	const fileUrls = list.map((_path) => draftServer.registerFile(_path));
	const url = BuildPhotopeaUrl({
		files: fileUrls,
		script,
		serverUrl: saveBack ? draftServer.saveUrl : undefined,
		formats: _options.formats
	});

	_OpenBrowser(url);

	const handle = {
		server: draftServer,
		close: () => draftServer.close()
	};
	_activeServer = handle;

	return { paths: list, url, server: draftServer, close: handle.close };
}

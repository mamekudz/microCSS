// Local HTTP server for Photopea draft workflow: serve PSDs with CORS and accept
// save-back POSTs (Photopea API: https://www.photopea.com/api/).

import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

export const PHOTOPEA_ORIGIN = "https://www.photopea.com";

const JSON_HEADER_BYTES = 2000;

/**
 * Builds a Photopea URL with hash JSON config.
 * @param {{ files?: string[], script?: string, serverUrl?: string, formats?: string[] }} _config
 * @returns {string}
 */
export function BuildPhotopeaUrl(_config) {
	const payload = {};
	if (_config.files?.length) payload.files = _config.files;
	if (_config.script) payload.script = _config.script;
	if (_config.serverUrl) {
		payload.server = {
			version: 1,
			url: _config.serverUrl,
			formats: _config.formats ?? ["psd:true"]
		};
	}
	return `${PHOTOPEA_ORIGIN}#${encodeURIComponent(JSON.stringify(payload))}`;
}

/**
 * Starts a local draft server (CORS-enabled). GET serves registered files; POST /save
 * accepts Photopea save-back when onSave is set.
 * @param {{ port?: number, host?: string, onSave?: (_event: { meta: object, data: Buffer }) => object | void }} [_options]
 * @returns {Promise<{ baseUrl: string, saveUrl: string | null, registerFile: Function, close: Function }>}
 */
export function CreatePhotopeaDraftServer(_options = {}) {
	const host = _options.host ?? "127.0.0.1";
	const port = _options.port ?? 0;
	/** @type {Map<string, string>} urlPath -> absolute file path */
	const pathByUrl = new Map();
	/** @type {Map<string, string>} full file URL -> absolute path (for save-back) */
	const absByFileUrl = new Map();

	return new Promise((_resolve, _reject) => {
		const server = createServer((_req, _res) => {
			_res.setHeader("Access-Control-Allow-Origin", "*");
			_res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			_res.setHeader("Access-Control-Allow-Headers", "Content-Type");

			if (_req.method === "OPTIONS") {
				_res.writeHead(204);
				_res.end();
				return;
			}

			const url = new URL(_req.url ?? "/", `http://${host}`);

			if (_req.method === "GET") {
				const abs = pathByUrl.get(url.pathname);
				if (!abs) {
					_res.writeHead(404);
					_res.end("Not found");
					return;
				}
				const body = readFileSync(abs);
				_res.writeHead(200, { "Content-Type": "application/octet-stream" });
				_res.end(body);
				return;
			}

			if (_req.method === "POST" && url.pathname === "/save" && _options.onSave) {
				const chunks = [];
				_req.on("data", (_chunk) => chunks.push(_chunk));
				_req.on("end", () => {
					try {
						const body = Buffer.concat(chunks);
						const jsonText = body.subarray(0, JSON_HEADER_BYTES).toString("utf8").replace(/\0/g, "").trim();
						const meta = JSON.parse(jsonText);
						const data = body.subarray(JSON_HEADER_BYTES);
						const response = _options.onSave({ meta, data }) ?? { message: "Saved" };
						_res.writeHead(200, { "Content-Type": "application/json" });
						_res.end(JSON.stringify(response));
					} catch (error) {
						_res.writeHead(400);
						_res.end(error?.message ?? String(error));
					}
				});
				return;
			}

			_res.writeHead(405);
			_res.end("Method not allowed");
		});

		server.on("error", _reject);
		server.listen(port, host, () => {
			const address = server.address();
			const actualPort = typeof address === "object" && address ? address.port : port;
			const baseUrl = `http://${host}:${actualPort}`;
			const saveUrl = _options.onSave ? `${baseUrl}/save` : null;

			_resolve({
				baseUrl,
				saveUrl,
				registerFile(_absPath) {
					const abs = resolve(_absPath);
					const name = basename(abs);
					const urlPath = `/${encodeURIComponent(name)}`;
					const fileUrl = `${baseUrl}${urlPath}`;
					pathByUrl.set(urlPath, abs);
					absByFileUrl.set(fileUrl, abs);
					return fileUrl;
				},
				resolveSource(_sourceUrl) {
					if (absByFileUrl.has(_sourceUrl)) return absByFileUrl.get(_sourceUrl);
					try {
						const parsed = new URL(_sourceUrl);
						return pathByUrl.get(parsed.pathname) ?? null;
					} catch {
						return null;
					}
				},
				close() {
					return new Promise((_done) => server.close(() => _done()));
				}
			});
		});
	});
}

/**
 * Writes Photopea save-back data to the mapped draft file.
 * @param {{ meta: { source?: string }, data: Buffer }} _event
 * @param {{ resolveSource: Function }} _server
 * @returns {string} Absolute path written
 */
export function WritePhotopeaSaveBack(_event, _server) {
	const source = _event.meta?.source;
	if (!source) throw new Error("Photopea save-back missing meta.source");
	const abs = _server.resolveSource(source);
	if (!abs) throw new Error(`Photopea save-back: unknown source ${source}`);
	writeFileSync(abs, _event.data);
	return abs;
}

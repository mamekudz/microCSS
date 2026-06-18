// microAU - sound atlas maker. A microPS-style async wrapper around the
// gulp-mu-sound-atlas engine: from a set of short audio files it produces one
// combined audio blob plus a JSON timing map ({ sounds: { name: [start,
// duration, loopStart, loopEnd] }, ... }) consumed by the browser runtime.

import fs from "node:fs";
import path from "node:path";
import Vinyl from "vinyl";
import SoundAtlas, { BuildQuickCacheKey, IsSoundAtlasCacheCurrent } from "gulp-mu-sound-atlas";

// Conversion constants (mirror the engine values) for a clean, named API.
// "*_HIGHEST"/"*_LOWEST" derive the target from the inputs.
export const CONVERT = {
	SAMPLERATE_LOWEST: -1,
	SAMPLERATE_HIGHEST: 0,
	SAMPLESIZE_LOWEST: -1,
	SAMPLESIZE_HIGHEST: 0,
	NOOFCHANNELS_LOWEST: -1,
	NOOFCHANNELS_HIGHEST: 0,
	STEREO_KEEP: 0,
	STEREO_SPLIT: 1,
	STEREO_MONO: 2
};

const AUDIO_EXTENSIONS = new Set([".wav", ".mp3"]);

/**
 * Recursively lists audio source files (*.wav, *.mp3) below a directory,
 * sorted by path for a deterministic atlas order.
 *
 * @param {string} _dir source root directory
 * @returns {string[]}
 */
export function ListAudioFiles(_dir) {
	const out = [];
	const walk = (_current) => {
		for (const entry of fs.readdirSync(_current, { withFileTypes: true })) {
			const full = path.join(_current, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(full);
		}
	};
	if (fs.existsSync(_dir)) walk(_dir);
	return out.sort();
}

function _MTime(_file) {
	try {
		return fs.statSync(_file).mtimeMs;
	} catch {
		return null;
	}
}

function _EnsureDir(_file) {
	fs.mkdirSync(path.dirname(path.resolve(_file)), { recursive: true });
}

export class SoundAtlasMaker {
	/**
	 * Builds a sound atlas (combined audio blob + JSON timing map).
	 *
	 * @param {object} _options
	 * @param {string[]} [_options.sounds]   explicit list of audio source files
	 * @param {string} [_options.src]        source directory scanned recursively (wav/mp3); merged with `sounds`
	 * @param {string} _options.dataFile     output audio blob path (.wav or .mp3) (required)
	 * @param {string} _options.jsonFile     output JSON timing map path (required)
	 * @param {string} [_options.format]     "wav" | "mp3"; default derived from dataFile extension
	 * @param {number} [_options.mp3KBitRate=128]
	 * @param {number} [_options.sampleRate=CONVERT.SAMPLERATE_HIGHEST]
	 * @param {number} [_options.sampleSize=CONVERT.SAMPLESIZE_HIGHEST]
	 * @param {number} [_options.channels=CONVERT.NOOFCHANNELS_HIGHEST]
	 * @param {number} [_options.stereo=CONVERT.STEREO_KEEP]
	 * @param {string|false} [_options.cacheFile] cache marker path, or false to disable (default: <dataFile>.cache.json)
	 * @param {boolean} [_options.force=false]    force a rebuild even if the cache is up to date
	 * @param {boolean|function|false} [_options.log]     logging: `false` silent; `true` → engine + wrapper use `console.log`; function routes engine messages; default — engine quiet, wrapper summary on `console.log`
	 * @returns {Promise<{skipped: boolean, sounds: string[], dataFile: string, jsonFile: string}>}
	 */
	static async Create(_options = {}) {
		const dataFile = _options.dataFile;
		const jsonFile = _options.jsonFile;
		if (!dataFile) throw new Error("SoundAtlasMaker.Create: 'dataFile' is required.");
		if (!jsonFile) throw new Error("SoundAtlasMaker.Create: 'jsonFile' is required.");

		const silent = _options.log === false;
		const routedLog = _options.log === true ? console.log
			: (typeof _options.log === "function" ? _options.log : null);
		const wrapperLog = silent ? () => {} : (routedLog ?? console.log);
		const engineLog = silent ? false : (routedLog ?? false);

		const fileSet = new Set();
		if (_options.src) for (const f of ListAudioFiles(_options.src)) fileSet.add(path.resolve(f));
		if (Array.isArray(_options.sounds)) for (const f of _options.sounds) fileSet.add(path.resolve(f));
		const files = [...fileSet].sort();
		if (files.length === 0) throw new Error("SoundAtlasMaker.Create: no audio sources (provide 'sounds' and/or 'src').");

		const format = _options.format ?? (path.extname(dataFile).toLowerCase() === ".mp3" ? "mp3" : "wav");
		const cacheFile = _options.cacheFile === false
			? false
			: (_options.cacheFile ?? `${dataFile}.cache.json`);

		_EnsureDir(dataFile);
		_EnsureDir(jsonFile);
		if (cacheFile) _EnsureDir(cacheFile);

		// Force a rebuild by dropping the cache marker, so a fresh one is written.
		if (_options.force && cacheFile && fs.existsSync(cacheFile)) fs.rmSync(cacheFile);

		const engineOptions = {
			dataPath: dataFile,
			jsonPath: jsonFile,
			doMp3: format === "mp3",
			mp3KBitRate: _options.mp3KBitRate ?? 128,
			cnvSampleRate: _options.sampleRate ?? CONVERT.SAMPLERATE_HIGHEST,
			cnvSampleSize: _options.sampleSize ?? CONVERT.SAMPLESIZE_HIGHEST,
			cnvNoOfChannels: _options.channels ?? CONVERT.NOOFCHANNELS_HIGHEST,
			cnvStereo: _options.stereo ?? CONVERT.STEREO_KEEP,
			cacheFile: cacheFile === false ? "" : cacheFile,
			log: engineLog
		};

		if (!_options.force && cacheFile && IsSoundAtlasCacheCurrent(engineOptions, files)) {
			wrapperLog("gulp-mu-sound-atlas: atlas '" + dataFile + "' is up to date - skipping rebuild.");
			return {
				skipped: true,
				sounds: Object.keys(_ReadJsonSounds(jsonFile)),
				dataFile,
				jsonFile
			};
		}

		engineOptions.quickKey = cacheFile ? BuildQuickCacheKey(engineOptions, files) : null;

		const beforeMTime = _MTime(dataFile);

		const engine = new SoundAtlas();
		const stream = engine.Create(engineOptions);

		await new Promise((_resolve, _reject) => {
			stream.on("error", _reject);
			stream.on("data", () => {});
			stream.on("end", _resolve);
			stream.on("finish", _resolve);
			(async () => {
				try {
					for (const file of files) {
						const vinyl = new Vinyl({ path: path.resolve(file), contents: fs.readFileSync(file) });
						if (!stream.write(vinyl)) await new Promise((_drain) => stream.once("drain", _drain));
					}
					stream.end();
				} catch (_error) {
					_reject(_error);
				}
			})();
		});

		const skipped = beforeMTime != null && _MTime(dataFile) === beforeMTime;
		const sounds = Object.keys(_ReadJsonSounds(jsonFile));
		wrapperLog(`gulp-mu-au: ${skipped ? "atlas up to date" : "built atlas"} '${dataFile}' (${sounds.length} sounds).`);
		return { skipped, sounds, dataFile, jsonFile };
	}
}

function _ReadJsonSounds(_jsonFile) {
	try {
		return JSON.parse(fs.readFileSync(_jsonFile, "utf8")).sounds ?? {};
	} catch {
		return {};
	}
}

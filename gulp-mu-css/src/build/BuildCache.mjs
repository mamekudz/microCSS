// Incremental build cache (CONCEPT.md, D7): one JSON file per skin in
// <outputDir>/.cache/build.json that stores mtime/size fingerprints and
// result data (atlas positions, generated file lists) of the last successful
// run. Replaces the legacy *.css.cache files and the sprite MD5 log.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const CACHE_SCHEMA = 1;

// [mtimeMs, size] of a file, or null when it does not exist.
export function FileFingerprint(_path) {
	try {
		const stats = statSync(_path);
		return [Math.round(stats.mtimeMs), stats.size];
	} catch {
		return null;
	}
}

// { path: [mtimeMs, size] } for a list of files (missing files map to null).
export function FingerprintFiles(_paths) {
	const result = {};
	for (const path of _paths) result[path] = FileFingerprint(path);
	return result;
}

// Compares two fingerprint maps (order-insensitive, exact values).
export function FingerprintsMatch(_a, _b) {
	if (!_a || !_b) return false;
	const keysA = Object.keys(_a);
	if (keysA.length !== Object.keys(_b).length) return false;
	for (const key of keysA) {
		const a = _a[key], b = _b[key];
		if (a === null || b === null) {
			if (a !== b) return false;
		} else if (a[0] !== b[0] || a[1] !== b[1]) {
			return false;
		}
	}
	return true;
}

export class BuildCache {
	constructor(_file, _meta) {
		this.file = _file;
		this.data = { meta: _meta, steps: {} };
	}

	// Loads the cache file; mismatching meta data (schema version, tool
	// version) discards the content, which forces a full rebuild.
	static Load(_file, _meta) {
		const cache = new BuildCache(_file, _meta);
		if (existsSync(_file)) {
			try {
				const stored = JSON.parse(readFileSync(_file, "utf8"));
				if (JSON.stringify(stored.meta) === JSON.stringify(_meta)) cache.data = stored;
			} catch {
				// Corrupt cache file: keep the empty cache (full rebuild).
			}
		}
		return cache;
	}

	Clear() {
		this.data.steps = {};
	}

	Get(_key) {
		return this.data.steps[_key] ?? null;
	}

	Set(_key, _entry) {
		this.data.steps[_key] = _entry;
	}

	Save() {
		mkdirSync(dirname(this.file), { recursive: true });
		writeFileSync(this.file, JSON.stringify(this.data, null, "\t"));
	}
}

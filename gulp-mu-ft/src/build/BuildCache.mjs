// microFT - incremental build cache. A content-based signature (hash over every
// SVG source plus the relevant build options) is stored next to the output. On
// the next run the font is only rebuilt when the signature changed, an output
// file is missing, or the cache schema/version differs. The hash is timestamp
// independent, so it stays reliable across a git checkout.

import fs from "node:fs";
import crypto from "node:crypto";
import { ListSvgFiles } from "../font/GlyphScanner.mjs";

// Bump when the output format or build logic changes so old caches invalidate.
export const CACHE_SCHEMA = 1;

/**
 * Computes a content signature for a build.
 *
 * @param {string} _srcDir source root directory
 * @param {object} _fingerprintOptions options that influence the output
 * @returns {{ count: number, hash: string }}
 */
export function ComputeSourceSignature(_srcDir, _fingerprintOptions = {}) {
	const files = ListSvgFiles(_srcDir);
	const hash = crypto.createHash("sha1");
	hash.update(`schema:${CACHE_SCHEMA}\0`);
	hash.update(`options:${JSON.stringify(_fingerprintOptions)}\0`);
	for (const file of files) {
		hash.update(file.replace(/\\/g, "/"));
		hash.update("\0");
		hash.update(fs.readFileSync(file));
		hash.update("\0");
	}
	return { count: files.length, hash: hash.digest("hex") };
}

export function ReadCache(_cacheFile) {
	try {
		return JSON.parse(fs.readFileSync(_cacheFile, "utf8"));
	} catch {
		return null;
	}
}

export function WriteCache(_cacheFile, _signature) {
	fs.writeFileSync(
		_cacheFile,
		JSON.stringify({ schema: CACHE_SCHEMA, ..._signature, generatedAt: new Date().toISOString() }, null, 2),
		"utf8"
	);
}

export function OutputsExist(_files) {
	return _files.every((_file) => fs.existsSync(_file));
}

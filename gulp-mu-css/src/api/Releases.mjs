// Version history API backed by RELEASES.json (package root). Each entry is
// { main, minor, revision, date, beta, info: [] } — newest release first
// (a convention originating from the Oxyd projects).
// Info strings carry i18x context markup (<context="release info"/>) so
// consuming apps can register them for translation (e.g. via an i18x
// String.prototype.i18xRegister runtime); console output strips the markup.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RELEASES_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "RELEASES.json");

let releasesCache = null;

// Removes i18x tags (e.g. <context="release info"/>) for plain-text display.
export function StripI18xMarkup(_text) {
	return String(_text).replace(/<[^<>]*\/?>/g, "").trim();
}

// Parsed RELEASES.json, newest first (cached after the first call).
export function GetReleases() {
	if (!releasesCache) {
		releasesCache = JSON.parse(readFileSync(RELEASES_FILE, "utf8"));
	}
	return releasesCache;
}

// "V2.5.8" (+ "β" for beta releases).
export function GetCurrentVersionString() {
	const r = GetReleases()[0];
	return `V${r.main}.${r.minor}.${r.revision}${r.beta ? "\u03B2" : ""}`;
}

// "V2.5.8 · 2026-07-02 15:00".
export function GetCurrentFullVersionString() {
	const r = GetReleases()[0];
	return `${GetCurrentVersionString()} \u00B7 ${r.date}`;
}

// Formatted version history for console output. _options:
//   limit = Infinity   number of releases (newest first)
//   stripMarkup = true remove i18x tags from the info strings
//   indent = "  "      prefix for info lines
export function GetVersionHistoryString(_options = {}) {
	const limit = _options.limit ?? Infinity;
	const stripMarkup = _options.stripMarkup !== false;
	const indent = _options.indent ?? "  ";
	const lines = [];
	for (const r of GetReleases().slice(0, limit)) {
		lines.push(`V${r.main}.${r.minor}.${r.revision}${r.beta ? "\u03B2" : ""} \u00B7 ${r.date}`);
		for (const info of r.info ?? []) {
			lines.push(`${indent}- ${stripMarkup ? StripI18xMarkup(info) : info}`);
		}
	}
	return lines.join("\n");
}

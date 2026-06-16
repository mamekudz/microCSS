// Preload registry: collects image URLs (cursor images, explicit
// PreloadImage calls) and writes them into a single "div.csspreload" rule so
// the browser fetches them ahead of first use (legacy createPreLoadRule).

import { existsSync } from "node:fs";
import { join } from "node:path";

export const PRELOAD_SELECTOR = "div.csspreload";

export class PreloadRegistry {
	// _baseDir: directory the image URLs are relative to (skin output dir).
	// URLs pointing to files that do not exist (yet) are skipped at rule
	// creation time, like in the legacy implementation.
	constructor(_baseDir = ".") {
		this.baseDir = _baseDir;
		this.images = [];
	}

	Add(_url) {
		if (_url && !this.images.includes(_url)) this.images.push(_url);
	}

	// Creates (or replaces the content of) the preload rule in the document.
	CreateRule(_document) {
		const urls = this.images
			.filter((_url) => existsSync(join(this.baseDir, _url)))
			.map((_url) => `url("${_url}")`);
		let rule = _document.FindRule(PRELOAD_SELECTOR);
		if (!rule) rule = _document.AddRule(PRELOAD_SELECTOR);
		rule.node.removeAll();
		if (urls.length) rule.AddProperty("background-image", urls.join(","));
		rule.AddProperty("display", "none");
		return rule;
	}
}

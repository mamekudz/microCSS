// Cursor directive support (legacy µ.DefCursor / µ.Cursor): named cursor
// definitions with image, hotspot and standard-cursor fallback. The directive
// form writes a url() declaration plus an unprefixed image-set() variant when
// a @2x source exists (vendor prefixes dropped per CONCEPT.md, D6).

import { existsSync } from "node:fs";
import { join } from "node:path";

// "imgs/cursors/zoom.png" -> "imgs/cursors/zoom@2x.png"
function _RetinaUrl(_url) {
	const dot = _url.lastIndexOf(".");
	return dot < 0 ? `${_url}@2x` : `${_url.slice(0, dot)}@2x${_url.slice(dot)}`;
}

export class CursorManager {
	// _definitions: array of { name, fallback, image, hotspot: [x, y],
	// forceFallback } - fallback defaults to the name, image is optional
	// (definition then only maps to the fallback).
	// _options: { baseDir, preload } - baseDir resolves image URLs for the
	// @2x existence check; preload is an optional PreloadRegistry.
	constructor(_definitions = [], _options = {}) {
		this.baseDir = _options.baseDir ?? ".";
		this.preload = _options.preload ?? null;
		this.cursors = new Map();
		this.warned = new Set();
		_definitions.forEach((_def) => this.Define(_def));
	}

	Define(_def) {
		if (!_def?.name) throw new Error("CursorManager.Define: a cursor needs a name.");
		const def = {
			name: _def.name,
			fallback: _def.fallback ?? _def.name,
			image: _def.image ?? "",
			hotspot: _def.hotspot ?? [0, 0],
			forceFallback: !!_def.forceFallback
		};
		this.cursors.set(def.name, def);
		if (def.image && this.preload) this.preload.Add(def.image);
		return def;
	}

	_Hotspot(_def) {
		const [x, y] = _def.hotspot;
		return (x === 0 && y === 0) ? "" : ` ${x} ${y}`;
	}

	_HasRetina(_def) {
		return existsSync(join(this.baseDir, _RetinaUrl(_def.image)));
	}

	// Value form, used as cursor: µ(Cursor("zoom")) - single url() value
	// (matches the legacy output format, e.g.
	// "url(imgs/general/gui/cursors/wait.png) 12 12, wait").
	Value(_name) {
		const def = this.cursors.get(_name);
		if (!def) return _name;
		if (!def.image) return def.fallback;
		this._WarnIfImageMissing(def);
		return `url(${def.image})${this._Hotspot(def)}, ${def.fallback}`;
	}

	// The CSS still works via the fallback cursor when the image is missing,
	// so this is a warning (once per cursor), not a hard error.
	_WarnIfImageMissing(_def) {
		if (!_def.image || this.warned.has(_def.name)) return;
		if (!existsSync(join(this.baseDir, _def.image))) {
			this.warned.add(_def.name);
			console.warn(`microCSS: cursor image not found: "${_def.image}" (cursor "${_def.name}", baseDir ${this.baseDir})`);
		}
	}

	// Directive form, used as -µ: Cursor("zoom") - rewrites the cursor
	// property of the rule, adding an image-set() variant when @2x exists.
	Apply(_rule, _name) {
		const def = this.cursors.get(_name);
		if (!def || !def.image) {
			_rule.ChangeProperty("cursor", def ? def.fallback : _name);
			return;
		}
		this._WarnIfImageMissing(def);
		_rule.RemoveProperty("cursor");
		_rule.AddProperty("cursor", this.Value(_name));
		if (this._HasRetina(def)) {
			_rule.AddProperty("cursor",
				`image-set(url(${def.image})1x, url(${_RetinaUrl(def.image)})2x)${this._Hotspot(def)}, ${def.fallback}`);
		}
		if (def.forceFallback) _rule.AddProperty("cursor", def.fallback);
	}
}

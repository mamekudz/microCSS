// Lightweight wrapper around an ag-psd document with helpers for layer
// lookup and programmatic visibility control.

import { readFileSync, writeFileSync } from "node:fs";
import { readPsd, writePsdBuffer } from "ag-psd";
import { EnsureAgPsdInitialized } from "./InitAgPsd.mjs";

export class PsDocument {
	constructor(_psd, _fileName) {
		this.psd = _psd;
		this.fileName = _fileName;
	}

	static Load(_fileName) {
		EnsureAgPsdInitialized();
		const buffer = readFileSync(_fileName);
		const psd = readPsd(buffer, {
			skipCompositeImageData: true,
			skipThumbnail: true,
			useImageData: true
		});
		return new PsDocument(psd, _fileName);
	}

	get width() { return this.psd.width; }
	get height() { return this.psd.height; }
	get children() { return this.psd.children ?? []; }

	// Depth-first walk over all layers and groups.
	Walk(_callback) {
		const visit = (_node, _parent) => {
			_callback(_node, _parent);
			for (const child of _node.children ?? []) visit(child, _node);
		};
		for (const child of this.children) visit(child, null);
	}

	// Finds the first node matching a path of names, e.g. ["layouts", "aqua", "normal"].
	FindByPath(_path) {
		let nodes = this.children;
		let found = null;
		for (const name of _path) {
			found = nodes.find((n) => n.name === name) ?? null;
			if (!found) return null;
			nodes = found.children ?? [];
		}
		return found;
	}

	// Finds the first descendant of a node with the given name (the node itself included).
	static FindDescendant(_node, _name) {
		if (_node.name === _name) return _node;
		for (const child of _node.children ?? []) {
			const found = PsDocument.FindDescendant(child, _name);
			if (found) return found;
		}
		return null;
	}

	SetAllHidden(_hidden) {
		this.Walk((_node) => { _node.hidden = _hidden; });
	}

	// Makes a node visible including all of its ancestors.
	static ShowNode(_node) {
		_node.hidden = false;
	}

	Save(_fileName, _options = {}) {
		EnsureAgPsdInitialized();
		const buffer = writePsdBuffer(this.psd, {
			generateThumbnail: false,
			trimImageData: _options.trimImageData ?? false,
			..._options
		});
		writeFileSync(_fileName, buffer);
	}
}

// PSD write helpers: insert image layers and save (ag-psd, imageData — no node-canvas).

import sharp from "sharp";
import { basename, parse } from "node:path";
import { PsDocument } from "./PsDocument.mjs";

/**
 * Inserts one pixel layer per image into a group (appends to group.children).
 *
 * @param {PsDocument} _doc
 * @param {string[]} _groupPath e.g. ["layouts", "icons"]
 * @param {string[]} _images
 * @param {{
 *   left?: number,
 *   top?: number,
 *   gap?: number,
 *   direction?: "horizontal" | "vertical",
 *   namePattern?: (index: number, file: string) => string
 * }} [_options]
 */
export async function InsertSequenceIntoGroup(_doc, _groupPath, _images, _options = {}) {
	const group = _doc.FindByPath(_groupPath);
	if (!group) {
		throw new Error(`InsertSequenceIntoGroup: group not found (${_groupPath.join("/")}).`);
	}
	if (!group.children) group.children = [];

	let left = _options.left ?? 0;
	let top = _options.top ?? 0;
	const gap = _options.gap ?? 0;
	const horizontal = (_options.direction ?? "horizontal") === "horizontal";

	for (let i = 0; i < _images.length; i++) {
		const file = _images[i];
		const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		const name = _options.namePattern
			? _options.namePattern(i, file)
			: parse(file).name || basename(file);

		group.children.push({
			name,
			top,
			left,
			imageData: {
				width: info.width,
				height: info.height,
				data: new Uint8ClampedArray(data)
			}
		});

		if (horizontal) left += info.width + gap;
		else top += info.height + gap;
	}

	return _images.length;
}

/**
 * Creates a new PSD with one group containing the sequence as pixel layers.
 *
 * @param {string[]} _images
 * @param {string} _outputFile
 * @param {{ width?: number, height?: number, groupName?: string, insert?: object }} [_options]
 */
export async function CreatePsdWithSequence(_images, _outputFile, _options = {}) {
	let width = _options.width ?? 0;
	let height = _options.height ?? 0;
	for (const file of _images) {
		const meta = await sharp(file).metadata();
		width = Math.max(width, meta.width ?? 0);
		height = Math.max(height, meta.height ?? 0);
	}
	if (width <= 0 || height <= 0) throw new Error("CreatePsdWithSequence: could not determine document size.");

	const groupName = _options.groupName ?? "sequence";
	const psd = {
		width,
		height,
		children: [{ name: groupName, children: [] }]
	};
	const doc = new PsDocument(psd, _outputFile);
	await InsertSequenceIntoGroup(doc, [groupName], _images, _options.insert);
	doc.Save(_outputFile);
	return { outputFile: _outputFile, width, height, layerCount: _images.length };
}

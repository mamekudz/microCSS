// ExtendScript-flavoured document wrapper for flat rasters (Phase 1).
// Maps familiar JSX/Oxyd names onto the µPS raster engine — approximation, not a PS DOM.

import { LoadRasterFromImage } from "../io/LoadImage.mjs";
import { SaveRasterAsImage, SaveRasterAsImageHalfSize } from "../io/SaveImage.mjs";
import {
	ApplyGamma,
	ApplyBrightnessContrast,
	ApplyHueSaturation,
	ApplyAdjustmentStack
} from "../render/Adjustments.mjs";
import { MaskFromRects } from "../render/Mask.mjs";
import { CloneRaster, CreateRaster } from "../render/Raster.mjs";
import {
	MaskFromAlpha,
	MagicWand,
	ColorRange,
	FeatherMask,
	InvertMask,
	SelectionBounds,
	CopySelection
} from "../render/Selection.mjs";
import {
	ScaleRaster,
	CropRaster,
	FlipRaster,
	RotateRaster,
	RotateRasterAround,
	ResizeCanvas
} from "../render/Transforms.mjs";

/** @typedef {"nearest" | "linear" | "cubic" | "lanczos2" | "lanczos3"} ScaleKernel */

const RESAMPLE_TO_KERNEL = {
	NEARESTNEIGHBOR: "nearest",
	BILINEAR: "linear",
	BICUBIC: "cubic",
	BICUBICSHARPER: "lanczos3",
	BICUBICSMOOTHER: "lanczos3",
	AUTOMATIC: "lanczos3"
};

class MuPsSelection {
	constructor(_doc) {
		this._doc = _doc;
		this._rects = null;
		this._weightMap = null;
	}

	/** @param {import("../render/Mask.mjs").RectMask | import("../render/Mask.mjs").RectMask[]} _rects */
	Select(_rects) {
		this._rects = Array.isArray(_rects) ? _rects : [_rects];
		this._weightMap = null;
		return this;
	}

	SelectAll() {
		this._rects = [{ x: 0, y: 0, w: this._doc.width, h: this._doc.height }];
		this._weightMap = null;
		return this;
	}

	Deselect() {
		this._rects = null;
		this._weightMap = null;
		return this;
	}

	SelectAlpha(_options = {}) {
		this._weightMap = MaskFromAlpha(this._doc._raster, _options);
		this._rects = null;
		return this;
	}

	MagicWand(_x, _y, _options = {}) {
		this._weightMap = MagicWand(this._doc._raster, _x, _y, _options);
		this._rects = null;
		return this;
	}

	ColorRange(_options) {
		this._weightMap = ColorRange(this._doc._raster, _options);
		this._rects = null;
		return this;
	}

	Feather(_radius) {
		const mask = this._WeightMap();
		if (mask) {
			this._weightMap = FeatherMask(mask, this._doc.width, this._doc.height, _radius);
			this._rects = null;
		}
		return this;
	}

	Invert() {
		const mask = this._WeightMap();
		if (mask) {
			this._weightMap = InvertMask(mask);
			this._rects = null;
		} else {
			this.SelectAll();
			this._weightMap = InvertMask(
				MaskFromRects(this._doc.width, this._doc.height, this._rects)
			);
			this._rects = null;
		}
		return this;
	}

	Bounds() {
		const mask = this._WeightMap();
		if (!mask) {
			return { x: 0, y: 0, w: this._doc.width, h: this._doc.height };
		}
		return SelectionBounds(mask, this._doc.width, this._doc.height);
	}

	_WeightMap() {
		if (this._weightMap) return this._weightMap;
		if (!this._rects || this._rects.length === 0) return undefined;
		if (this._rects.length === 1
			&& this._rects[0].w === this._doc.width
			&& this._rects[0].h === this._doc.height) {
			return undefined;
		}
		return MaskFromRects(this._doc.width, this._doc.height, this._rects);
	}

	_Mask() {
		return this._WeightMap();
	}
}

export class MuPsDoc {
	constructor(_raster, _sourcePath = null) {
		this._raster = _raster;
		this._sourcePath = _sourcePath;
		this.selection = new MuPsSelection(this);
	}

	get width() { return this._raster.width; }
	get height() { return this._raster.height; }

	/** @returns {Promise<MuPsDoc>} */
	static async Open(_fileName) {
		const raster = await LoadRasterFromImage(_fileName);
		return new MuPsDoc(raster, _fileName);
	}

	/** Returns the underlying µPS raster (Float32 RGBA, non-premultiplied). */
	ToRaster() {
		return this._raster;
	}

	_Options() {
		return { mask: this.selection._Mask() };
	}

	/** Oxyd/JSX-style name for PS Exposure gamma correction. */
	GammaCorrection(_gamma, _options = {}) {
		ApplyGamma(this._raster, _gamma, { ...this._Options(), ..._options });
		return this;
	}

	BrightnessContrast(_brightness = 0, _contrast = 0, _options = {}) {
		ApplyBrightnessContrast(this._raster, {
			brightness: _brightness,
			contrast: _contrast,
			useLegacy: _options.useLegacy
		}, this._Options());
		return this;
	}

	HueSaturation(_params = {}) {
		ApplyHueSaturation(this._raster, _params, this._Options());
		return this;
	}

	/** @param {Array<{ type: string, [key: string]: unknown }>} _steps */
	AdjustmentStack(_steps) {
		ApplyAdjustmentStack(this._raster, _steps, this._Options());
		return this;
	}

	/**
	 * Approximates `Document.resizeImage` (flat raster only).
	 * @param {{
	 *   width?: number,
	 *   height?: number,
	 *   scale?: number,
	 *   scalePercent?: number,
	 *   method?: keyof typeof RESAMPLE_TO_KERNEL | ScaleKernel,
	 *   kernel?: ScaleKernel
	 * }} _options
	 */
	async ResizeImage(_options = {}) {
		const method = _options.method ?? _options.kernel ?? "lanczos3";
		const kernel = RESAMPLE_TO_KERNEL[method] ?? method;
		let scale = _options.scale;
		if (_options.scalePercent != null) scale = _options.scalePercent / 100;
		this._raster = await ScaleRaster(this._raster, {
			scale,
			width: _options.width,
			height: _options.height,
			kernel
		});
		return this;
	}

	/**
	 * Approximates PS *Image → Canvas Size* (expand/shrink document bounds).
	 * @param {{
	 *   width: number,
	 *   height: number,
	 *   anchor?: import("../render/Transforms.mjs").CanvasAnchor,
	 *   fill?: [number, number, number, number]
	 * }} _options
	 */
	CanvasSize(_options) {
		this._raster = ResizeCanvas(this._raster, _options);
		return this;
	}

	Crop(_rect) {
		this._raster = CropRaster(this._raster, _rect);
		return this;
	}

	FlipHorizontal() {
		this._raster = FlipRaster(this._raster, "horizontal");
		return this;
	}

	FlipVertical() {
		this._raster = FlipRaster(this._raster, "vertical");
		return this;
	}

	/** @param {90 | 180 | 270} _degrees */
	Rotate(_degrees) {
		this._raster = RotateRaster(this._raster, _degrees);
		return this;
	}

	RotateAround(_degrees, _pivot = { x: 0, y: 0 }) {
		this._raster = RotateRasterAround(this._raster, _degrees, _pivot);
		return this;
	}

	/** Selection (or full image) into a new document. */
	Copy() {
		return new MuPsDoc(CopySelection(this._raster, this.selection._Mask()));
	}

	/** Shallow duplicate of the whole document. */
	Duplicate() {
		return new MuPsDoc(CloneRaster(this._raster), this._sourcePath);
	}

	/**
	 * Pastes another document onto this one (alpha-overwrite, no PS smart-object semantics).
	 * @param {MuPsDoc} _other
	 * @param {{ x?: number, y?: number }} [_offset]
	 */
	Paste(_other, _offset = {}) {
		const src = _other._raster;
		const ox = Math.floor(_offset.x ?? 0);
		const oy = Math.floor(_offset.y ?? 0);
		const needW = Math.max(this._raster.width, ox + src.width);
		const needH = Math.max(this._raster.height, oy + src.height);
		if (needW > this._raster.width || needH > this._raster.height) {
			this._raster = ResizeCanvas(this._raster, {
				width: needW,
				height: needH,
				anchor: "topLeft"
			});
		}
		const { width, height, data } = this._raster;
		for (let y = 0; y < src.height; y++) {
			const dy = y + oy;
			if (dy < 0 || dy >= height) continue;
			for (let x = 0; x < src.width; x++) {
				const dx = x + ox;
				if (dx < 0 || dx >= width) continue;
				const si = (y * src.width + x) * 4;
				if (src.data[si + 3] <= 0) continue;
				const di = (dy * width + dx) * 4;
				data[di] = src.data[si];
				data[di + 1] = src.data[si + 1];
				data[di + 2] = src.data[si + 2];
				data[di + 3] = src.data[si + 3];
			}
		}
		return this;
	}

	async SaveAs(_fileName, _options = {}) {
		if (_options.retinaHalf) {
			await SaveRasterAsImageHalfSize(this._raster, _fileName);
		} else {
			await SaveRasterAsImage(this._raster, _fileName);
		}
		return this;
	}

	/** Saves @2x then 50 % downscale — like legacy ButtonAndIconCreator._Save with retina. */
	async SaveAsRetinaPair(_dir, _baseName, _options = {}) {
		const ext = _options.ext ?? "png";
		await SaveRasterAsImage(this._raster, `${_dir}/${_baseName}@2x.${ext}`);
		const half = CloneRaster(this._raster);
		const scaled = await ScaleRaster(half, { scale: 0.5, kernel: "lanczos3" });
		await SaveRasterAsImage(scaled, `${_dir}/${_baseName}.${ext}`);
		return this;
	}

	/** Empty document — counterpart to `app.documents.add(width, height)`. */
	static Create(_width, _height) {
		return new MuPsDoc(CreateRaster(_width, _height));
	}
}

// Bin packers for sprite atlas and texture generation.
// Ported from the legacy SpriteTools.js (SpriteToolsBitGrowingPacker and
// SpriteToolsBitGrowingPackerStrictSquare), cleaned up and made deterministic.

// Growing packer: starts with the largest rectangle and grows right or down
// as needed, trying to keep the result square-ish.
class GrowingPacker {
	Fit(_blocks, _doSquare) {
		let maxW = 0, maxH = 0;
		for (const block of _blocks) {
			if (block.w > maxW) maxW = block.w;
			if (block.h > maxH) maxH = block.h;
		}
		this.root = { x: 0, y: 0, w: maxW, h: maxH };
		for (const block of _blocks) {
			const node = this._FindNode(this.root, block.w, block.h);
			block.fit = node ? this._SplitNode(node, block.w, block.h) : this._GrowNode(block.w, block.h, _doSquare);
		}
	}

	_FindNode(_root, _w, _h) {
		if (_root.used) {
			return this._FindNode(_root.right, _w, _h) || this._FindNode(_root.down, _w, _h);
		}
		if (_w <= _root.w && _h <= _root.h) return _root;
		return null;
	}

	_SplitNode(_node, _w, _h) {
		_node.used = true;
		_node.down = { x: _node.x, y: _node.y + _h, w: _node.w, h: _node.h - _h };
		_node.right = { x: _node.x + _w, y: _node.y, w: _node.w - _w, h: _h };
		return _node;
	}

	_GrowNode(_w, _h, _doSquare) {
		const canGrowDown = (_w <= this.root.w);
		const canGrowRight = (_h <= this.root.h);
		let shouldGrowRight = false, shouldGrowDown = false;
		if (!_doSquare && canGrowRight && canGrowDown) {
			shouldGrowRight = (this.root.h >= (this.root.w + _w));
			shouldGrowDown = (this.root.w >= (this.root.h + _h));
		} else {
			// Deterministic square-ish growth: grow along the currently shorter edge.
			shouldGrowRight = canGrowRight && (this.root.w <= this.root.h);
			shouldGrowDown = !shouldGrowRight && canGrowDown;
		}
		if (shouldGrowRight) return this._GrowRight(_w, _h);
		if (shouldGrowDown) return this._GrowDown(_w, _h);
		if (canGrowRight) return this._GrowRight(_w, _h);
		if (canGrowDown) return this._GrowDown(_w, _h);
		return null;
	}

	_GrowRight(_w, _h) {
		this.root = {
			used: true,
			x: 0, y: 0,
			w: this.root.w + _w,
			h: this.root.h,
			down: this.root,
			right: { x: this.root.w, y: 0, w: _w, h: this.root.h }
		};
		const node = this._FindNode(this.root, _w, _h);
		return node ? this._SplitNode(node, _w, _h) : null;
	}

	_GrowDown(_w, _h) {
		this.root = {
			used: true,
			x: 0, y: 0,
			w: this.root.w,
			h: this.root.h + _h,
			down: { x: 0, y: this.root.h, w: this.root.w, h: _h },
			right: this.root
		};
		const node = this._FindNode(this.root, _w, _h);
		return node ? this._SplitNode(node, _w, _h) : null;
	}
}

// Strict square packer: keeps the result within _maxSize x _maxSize.
// Blocks that do not fit anymore keep fit = null.
class StrictSquarePacker extends GrowingPacker {
	Fit(_blocks, _maxSize) {
		this.maxSize = _maxSize;
		let maxW = 0, maxH = 0;
		for (const block of _blocks) {
			if (block.w > maxW) maxW = block.w;
			if (block.h > maxH) maxH = block.h;
		}
		this.root = { x: 0, y: 0, w: maxW, h: maxH };
		for (const block of _blocks) {
			const node = this._FindNode(this.root, block.w, block.h);
			block.fit = node ? this._SplitNode(node, block.w, block.h) : this._GrowNode(block.w, block.h);
			if (!block.fit) return;
		}
	}

	_GrowNode(_w, _h) {
		const canGrowDown = (_w <= this.root.w) && ((this.root.h + _h) <= this.maxSize);
		const canGrowRight = (_h <= this.root.h) && ((this.root.w + _w) <= this.maxSize);
		const shouldGrowRight = canGrowRight && (this.root.h >= (this.root.w + _w));
		const shouldGrowDown = canGrowDown && (this.root.w >= (this.root.h + _h));
		if (shouldGrowRight) return this._GrowRight(_w, _h);
		if (shouldGrowDown) return this._GrowDown(_w, _h);
		if (canGrowRight) return this._GrowRight(_w, _h);
		if (canGrowDown) return this._GrowDown(_w, _h);
		return null;
	}
}

// Packs rectangles ({ w, h }) into a minimal area. Rectangles are sorted by
// their longest edge (descending) before packing; x/y are written back onto
// the original objects. Returns [width, height] of the packed area.
export function PackRects(_rects, _options = {}) {
	if (_rects.length === 0) return [0, 0];
	const doSquare = _options.doSquare ?? true;
	const sorted = [..._rects].sort((_a, _b) => Math.max(_b.w, _b.h) - Math.max(_a.w, _a.h));
	const packer = new GrowingPacker();
	packer.Fit(sorted, doSquare);
	let maxX = 0, maxY = 0;
	for (const rect of sorted) {
		if (!rect.fit) continue;
		rect.x = rect.fit.x;
		rect.y = rect.fit.y;
		delete rect.fit;
		if (rect.x + rect.w > maxX) maxX = rect.x + rect.w;
		if (rect.y + rect.h > maxY) maxY = rect.y + rect.h;
	}
	return [maxX, maxY];
}

// Packs rectangles into a strict square of at most _maxSize x _maxSize.
// Throws when not all rectangles fit.
export function PackRectsStrictSquare(_rects, _maxSize) {
	if (_rects.length === 0) return [0, 0];
	const sorted = [..._rects].sort((_a, _b) => Math.max(_b.w, _b.h) - Math.max(_a.w, _a.h));
	const packer = new StrictSquarePacker();
	packer.Fit(sorted, _maxSize);
	let maxX = 0, maxY = 0;
	for (const rect of sorted) {
		if (!rect.fit) throw new Error(`PackRectsStrictSquare: rectangles do not fit into ${_maxSize}x${_maxSize}.`);
		rect.x = rect.fit.x;
		rect.y = rect.fit.y;
		delete rect.fit;
		if (rect.x + rect.w > maxX) maxX = rect.x + rect.w;
		if (rect.y + rect.h > maxY) maxY = rect.y + rect.h;
	}
	return [maxX, maxY];
}

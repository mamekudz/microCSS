// Builds a multi-resolution ICO file from PNG image buffers (PNG-in-ICO, Vista+).

export function EncodeIco(_images) {
	if (!_images.length) throw new Error("EncodeIco: at least one image is required.");
	const count = _images.length;
	const headerSize = 6;
	const entrySize = 16;
	let offset = headerSize + count * entrySize;
	const header = Buffer.alloc(headerSize);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(count, 4);
	const entries = [];
	const payloads = [];
	for (const { size, data } of _images) {
		const entry = Buffer.alloc(entrySize);
		entry.writeUInt8(size >= 256 ? 0 : size, 0);
		entry.writeUInt8(size >= 256 ? 0 : size, 1);
		entry.writeUInt8(0, 2);
		entry.writeUInt8(0, 3);
		entry.writeUInt16LE(1, 4);
		entry.writeUInt16LE(32, 6);
		entry.writeUInt32LE(data.length, 8);
		entry.writeUInt32LE(offset, 12);
		offset += data.length;
		entries.push(entry);
		payloads.push(data);
	}
	return Buffer.concat([header, ...entries, ...payloads]);
}

export function ReadIcoImageCount(_buffer) {
	if (_buffer.length < 6) return 0;
	if (_buffer.readUInt16LE(0) !== 0 || _buffer.readUInt16LE(2) !== 1) return 0;
	return _buffer.readUInt16LE(4);
}

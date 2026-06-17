import { expect } from "chai";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CreateDsdFromImages } from "../src/strips/CreateDsd.mjs";
import { DSD_SIGN_ORIGINAL } from "../src/strips/DsdFormat.mjs";
import { SequenceStrip } from "../src/strips/SequenceStrip.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(here, ".tmp-dsd");
const flyexPng = join(here, "../../demos/flyex/dev/media/raw/flyex/imgs/flyex.png");

async function _WriteFrame(_file, _r, _g, _b, _a = 255) {
	const w = 16, h = 16;
	const buf = Buffer.alloc(w * h * 4);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const inside = x >= 3 && x < 13 && y >= 3 && y < 13;
			buf[i] = inside ? _r : 20;
			buf[i + 1] = inside ? _g : 20;
			buf[i + 2] = inside ? _b : 20;
			buf[i + 3] = _a;
		}
	}
	await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(_file);
}

describe("CreateDsdFromImages", function () {
	this.timeout(60000);

	beforeEach(function () {
		rmSync(tmpDir, { recursive: true, force: true });
		mkdirSync(tmpDir, { recursive: true });
	});

	it("round-trips a small sequence with pivot 0,0", async function () {
		const f0 = join(tmpDir, "f0.png");
		const f1 = join(tmpDir, "f1.png");
		await _WriteFrame(f0, 200, 50, 50);
		await _WriteFrame(f1, 50, 200, 50);

		const out = join(tmpDir, "out.png");
		const result = await CreateDsdFromImages([f0, f1], {
			outputFile: out,
			pivot: { x: 0, y: 0 },
			signType: DSD_SIGN_ORIGINAL
		});

		expect(result.scannedCount).to.equal(2);
		expect(result.frames[0].ox).to.equal(0);
		expect(result.frames[0].oy).to.equal(0);

		const strip = await SequenceStrip.Create({
			dsdImage: out,
			outputFile: join(tmpDir, "strip.png"),
			retina: false,
			writeMapFile: true
		});
		expect(strip.frameCount).to.equal(2);
	});

	it("maps pivotPercent 50,50 to frame center", async function () {
		const f0 = join(tmpDir, "f0.png");
		await _WriteFrame(f0, 200, 50, 50);

		const out = join(tmpDir, "out-center.png");
		const result = await CreateDsdFromImages([f0], {
			outputFile: out,
			pivotPercent: { x: 50, y: 50 },
			signType: DSD_SIGN_ORIGINAL
		});

		expect(result.scannedCount).to.equal(1);
		expect(result.frames[0].ox).to.equal(-5);
		expect(result.frames[0].oy).to.equal(-5);
	});

	it("rebuilds flyex frame count when source is available", async function () {
		if (!existsSync(flyexPng)) this.skip();
		const framesDir = join(tmpDir, "frames");
		mkdirSync(framesDir, { recursive: true });
		const { data, info } = await sharp(flyexPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		const { ScanDsdImage } = await import("../src/strips/DsdFormat.mjs");
		const scanned = ScanDsdImage({ data, width: info.width, height: info.height })
			.filter((f) => f.type === DSD_SIGN_ORIGINAL);
		const paths = [];
		for (const frame of scanned.slice(0, 5)) {
			const file = join(framesDir, `f${frame.no}.png`);
			const crop = Buffer.alloc(frame.w * frame.h * 4);
			for (let y = 0; y < frame.h; y++) {
				for (let x = 0; x < frame.w; x++) {
					const si = ((frame.ys + y) * info.width + (frame.xs + x)) * 4;
					const di = (y * frame.w + x) * 4;
					crop[di] = data[si];
					crop[di + 1] = data[si + 1];
					crop[di + 2] = data[si + 2];
					crop[di + 3] = data[si + 3];
				}
			}
			await sharp(crop, { raw: { width: frame.w, height: frame.h, channels: 4 } }).png().toFile(file);
			paths.push(file);
		}
		const rebuilt = join(tmpDir, "rebuilt.png");
		const result = await CreateDsdFromImages(paths, {
			outputFile: rebuilt,
			frameNumbers: scanned.slice(0, 5).map((f) => f.no),
			pivot: { x: 0, y: 0 }
		});
		expect(result.scannedCount).to.equal(5);
	});
});

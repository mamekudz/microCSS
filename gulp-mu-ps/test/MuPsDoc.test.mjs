import { expect } from "chai";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CreateRaster } from "../src/render/Raster.mjs";
import { ResizeCanvas } from "../src/render/Transforms.mjs";
import { MuPsDoc } from "../src/compat/MuPsDoc.mjs";
import { LoadRasterFromImage } from "../src/io/LoadImage.mjs";

describe("ResizeCanvas", function () {
	it("expands with middleCenter anchor", function () {
		const raster = CreateRaster(4, 4);
		raster.data.fill(0.5);
		raster.data[3] = 1;
		const out = ResizeCanvas(raster, { width: 8, height: 8, anchor: "middleCenter" });
		expect(out.width).to.equal(8);
		expect(out.height).to.equal(8);
		expect(out.data[(4 * 8 + 4) * 4]).to.equal(0.5);
		expect(out.data[3]).to.equal(0);
	});
});

describe("MuPsDoc", function () {
	it("gammaCorrection respects selection", async function () {
		const raster = CreateRaster(8, 8);
		for (let i = 0; i < raster.data.length; i += 4) {
			raster.data[i] = raster.data[i + 1] = raster.data[i + 2] = 0.4;
			raster.data[i + 3] = 1;
		}
		const doc = new MuPsDoc(raster);
		doc.selection.Select([{ x: 0, y: 0, w: 4, h: 8 }]);
		doc.GammaCorrection(0.5);
		expect(raster.data[0]).to.be.lessThan(0.4);
		expect(raster.data[(0 * 8 + 6) * 4]).to.be.closeTo(0.4, 0.001);
	});

	it("saveAs and saveAsRetinaPair write files", async function () {
		const dir = mkdtempSync(join(tmpdir(), "mupsdoc-"));
		try {
			const doc = MuPsDoc.Create(16, 16);
			doc.ToRaster().data.fill(0.25);
			for (let i = 3; i < doc.ToRaster().data.length; i += 4) doc.ToRaster().data[i] = 1;
			await doc.SaveAs(join(dir, "flat.png"));
			const loaded = await LoadRasterFromImage(join(dir, "flat.png"));
			expect(loaded.width).to.equal(16);
			await doc.SaveAsRetinaPair(dir, "pair");
			const half = await LoadRasterFromImage(join(dir, "pair.png"));
			expect(half.width).to.equal(8);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("selection magic wand, copy, paste, duplicate", function () {
		const doc = MuPsDoc.Create(8, 8);
		const data = doc.ToRaster().data;
		for (let i = 0; i < data.length; i += 4) {
			data[i] = data[i + 1] = data[i + 2] = 0.5;
			data[i + 3] = 1;
		}
		data[0] = data[1] = data[2] = 1;
		doc.selection.MagicWand(0, 0, { tolerance: 0.05 });
		const bounds = doc.selection.Bounds();
		expect(bounds.w).to.be.greaterThan(0);

		const dup = doc.Duplicate();
		expect(dup.width).to.equal(8);

		const patch = MuPsDoc.Create(2, 2);
		const patchData = patch.ToRaster().data;
		for (let i = 0; i < patchData.length; i += 4) {
			patchData[i] = 1;
			patchData[i + 3] = 1;
		}
		doc.Paste(patch, { x: 6, y: 6 });
		expect(doc.ToRaster().data[(6 * 8 + 6) * 4]).to.equal(1);

		const copied = doc.Copy();
		expect(copied.width).to.be.greaterThan(0);
	});
});

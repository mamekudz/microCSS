import { expect } from "chai";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PsDocument } from "../src/psd/PsDocument.mjs";
import { CreatePsdWithSequence, InsertSequenceIntoGroup } from "../src/psd/WritePsd.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(here, ".tmp-psd-write");

async function _WriteDot(_file, _size = 8) {
	const buf = Buffer.alloc(_size * _size * 4, 0);
	buf[0] = 255;
	buf[3] = 255;
	await sharp(buf, { raw: { width: _size, height: _size, channels: 4 } }).png().toFile(_file);
}

describe("WritePsd", function () {
	this.timeout(60000);

	beforeEach(function () {
		rmSync(tmpDir, { recursive: true, force: true });
		mkdirSync(tmpDir, { recursive: true });
	});

	it("CreatePsdWithSequence writes a readable PSD", async function () {
		const f0 = join(tmpDir, "a.png");
		const f1 = join(tmpDir, "b.png");
		await _WriteDot(f0);
		await _WriteDot(f1, 10);
		const psdFile = join(tmpDir, "seq.psd");
		await CreatePsdWithSequence([f0, f1], psdFile, { groupName: "frames" });

		expect(existsSync(psdFile)).to.equal(true);
		const doc = PsDocument.Load(psdFile);
		const group = doc.FindByPath(["frames"]);
		expect(group?.children?.length).to.equal(2);
	});

	it("InsertSequenceIntoGroup appends to an existing PSD group", async function () {
		const f0 = join(tmpDir, "a.png");
		await _WriteDot(f0);
		const psdFile = join(tmpDir, "base.psd");
		await CreatePsdWithSequence([f0], psdFile, { groupName: "seq" });

		const doc = PsDocument.Load(psdFile);
		const f1 = join(tmpDir, "b.png");
		await _WriteDot(f1, 12);
		await InsertSequenceIntoGroup(doc, ["seq"], [f1], { left: 20 });
		doc.Save(join(tmpDir, "updated.psd"));

		const reloaded = PsDocument.Load(join(tmpDir, "updated.psd"));
		expect(reloaded.FindByPath(["seq"])?.children?.length).to.equal(2);
	});
});

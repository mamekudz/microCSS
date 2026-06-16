import { expect } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SoundAtlasMaker, ListAudioFiles, CONVERT } from "../src/index.mjs";

const SAMPLE_RATE = 8000;

// Builds an 8-bit unsigned PCM mono WAV (0x80 = zero line) from a sample array.
function _MakeWav(_samples) {
	const dataLen = _samples.length;
	const buffer = Buffer.alloc(44 + dataLen);
	buffer.write("RIFF", 0, "ascii");
	buffer.writeUInt32LE(36 + dataLen, 4);
	buffer.write("WAVE", 8, "ascii");
	buffer.write("fmt ", 12, "ascii");
	buffer.writeUInt32LE(16, 16);
	buffer.writeUInt16LE(1, 20); // PCM
	buffer.writeUInt16LE(1, 22); // mono
	buffer.writeUInt32LE(SAMPLE_RATE, 24);
	buffer.writeUInt32LE(SAMPLE_RATE, 28); // bytes/sec (8-bit mono)
	buffer.writeUInt16LE(1, 32); // block align
	buffer.writeUInt16LE(8, 34); // bits/sample
	buffer.write("data", 36, "ascii");
	buffer.writeUInt32LE(dataLen, 40);
	for (let i = 0; i < dataLen; i++) buffer[44 + i] = _samples[i] & 0xff;
	return buffer;
}

// Distinct, deterministic 8-bit waveforms (around the 0x80 zero line).
function _Wave(_length, _step, _amp) {
	const out = new Uint8Array(_length);
	for (let i = 0; i < _length; i++) out[i] = 0x80 + Math.round(_amp * Math.sin((i * _step) / 10));
	return out;
}

function _SetupSources() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mu-au-src-"));
	fs.writeFileSync(path.join(dir, "click.wav"), _MakeWav(_Wave(800, 3, 60)));
	fs.writeFileSync(path.join(dir, "beep.wav"), _MakeWav(_Wave(1200, 7, 90)));
	fs.writeFileSync(path.join(dir, "engine.ls.100.le.400.wav"), _MakeWav(_Wave(1600, 2, 50)));
	return dir;
}

describe("ListAudioFiles", () => {
	it("lists wav sources recursively", () => {
		const dir = _SetupSources();
		const files = ListAudioFiles(dir);
		expect(files).to.have.lengthOf(3);
		fs.rmSync(dir, { recursive: true, force: true });
	});
});

describe("SoundAtlasMaker.Create", () => {
	it("builds the audio blob and a JSON timing map (with loop points from the file name)", async () => {
		const srcDir = _SetupSources();
		const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "mu-au-out-"));
		const dataFile = path.join(outDir, "app.sounds.wav");
		const jsonFile = path.join(outDir, "app.sounds.json");

		const result = await SoundAtlasMaker.Create({
			src: srcDir,
			dataFile,
			jsonFile,
			sampleRate: CONVERT.SAMPLERATE_HIGHEST,
			log: false
		});

		expect(result.skipped).to.equal(false);
		expect(fs.existsSync(dataFile)).to.equal(true);
		expect(fs.statSync(dataFile).size).to.be.greaterThan(44);

		const json = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
		expect(json.sounds).to.have.all.keys("click", "beep", "engine");
		// [start, duration, loopStart, loopEnd]; engine carries a loop -> loopStart >= 0.
		expect(json.sounds.click[2]).to.equal(-1);
		expect(json.sounds.engine[2]).to.be.greaterThan(-1);
		expect(json.sounds.engine[1]).to.be.greaterThan(0);

		fs.rmSync(srcDir, { recursive: true, force: true });
		fs.rmSync(outDir, { recursive: true, force: true });
	});

	it("skips an unchanged rebuild and rebuilds with force", async () => {
		const srcDir = _SetupSources();
		const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "mu-au-out-"));
		const base = {
			src: srcDir,
			dataFile: path.join(outDir, "app.sounds.wav"),
			jsonFile: path.join(outDir, "app.sounds.json"),
			log: false
		};

		const first = await SoundAtlasMaker.Create(base);
		expect(first.skipped).to.equal(false);

		await new Promise((_r) => setTimeout(_r, 25));
		const second = await SoundAtlasMaker.Create(base);
		expect(second.skipped).to.equal(true);

		await new Promise((_r) => setTimeout(_r, 25));
		const forced = await SoundAtlasMaker.Create({ ...base, force: true });
		expect(forced.skipped).to.equal(false);

		fs.rmSync(srcDir, { recursive: true, force: true });
		fs.rmSync(outDir, { recursive: true, force: true });
	});
});

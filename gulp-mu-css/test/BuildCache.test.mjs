// Tests for incremental-build fingerprints (CONCEPT.md, D7).

import { expect } from "chai";
import { FingerprintsMatch } from "../src/index.mjs";

describe("FingerprintsMatch", function () {
	it("matches identical [mtime, size] maps", function () {
		const a = { "a.png": [100, 20], "b.png": [200, 40] };
		const b = { "b.png": [200, 40], "a.png": [100, 20] };
		expect(FingerprintsMatch(a, b)).to.equal(true);
	});

	it("treats missing or malformed entries as a mismatch instead of throwing", function () {
		expect(FingerprintsMatch({ "a.png": [1, 2] }, { "a.png": undefined })).to.equal(false);
		expect(FingerprintsMatch({ "a.png": undefined }, { "a.png": [1, 2] })).to.equal(false);
		expect(FingerprintsMatch({ "a.png": { mtime: 1, size: 2 } }, { "a.png": [1, 2] })).to.equal(false);
		expect(FingerprintsMatch({ "a.png": null }, { "a.png": [1, 2] })).to.equal(false);
		expect(FingerprintsMatch(null, { "a.png": [1, 2] })).to.equal(false);
	});
});

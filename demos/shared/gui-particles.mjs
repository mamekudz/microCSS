// Minimal port of AiDPix GUIParticles (GUI.js) for demo sparkle effects.

const PI2 = Math.PI * 2;

function _MinMaxFloatRandom(_min, _max) {
	return Math.random() * (_max - _min) + _min;
}

export class GUIParticles {
	static RUNMODE_POINT = 0;
	static RUNMODE_RNDRADIAL = 1;

	constructor(_className, _layer, _params = {}) {
		this._className = _className;
		this._layer = _layer;
		this._runMode = _params.runMode ?? GUIParticles.RUNMODE_RNDRADIAL;
		this._maxNoOfParticles = _params.maxNoOfParticles ?? 60;
		this._minDuration = _params.minDuration ?? -1;
		this._maxDuration = _params.maxDuration ?? -1;
		this._minRadius = Math.sqrt(_params.minRadius ?? 10);
		this._maxRadius = Math.sqrt(_params.maxRadius ?? 80);
		this._divs = [];

		for (let i = 0; i < this._maxNoOfParticles; i++) {
			const div = document.createElement("div");
			div.className = `${_className} hidden`;
			div.dataset.used = "0";
			div.addEventListener("animationend", () => {
				div.className = `${this._className} hidden`;
				div.dataset.used = "0";
				div.style.animationDuration = "";
			}, { passive: true });
			this._layer.appendChild(div);
			this._divs.push(div);
		}
	}

	Run(_clientX, _clientY) {
		let div = null;
		for (const candidate of this._divs) {
			if (candidate.dataset.used === "0") {
				div = candidate;
				break;
			}
		}
		if (!div) return;

		const rect = this._layer.getBoundingClientRect();
		div.dataset.used = "1";

		if (this._runMode === GUIParticles.RUNMODE_POINT) {
			div.style.left = `${_clientX - rect.left}px`;
			div.style.top = `${_clientY - rect.top}px`;
		} else {
			const angle = _MinMaxFloatRandom(0, PI2);
			let radius = _MinMaxFloatRandom(this._minRadius, this._maxRadius);
			radius = radius * radius;
			div.style.left = `${_clientX - rect.left + Math.cos(angle) * radius}px`;
			div.style.top = `${_clientY - rect.top + Math.sin(angle) * radius}px`;
		}

		if (this._minDuration !== -1) {
			div.style.animationDuration = `${_MinMaxFloatRandom(this._minDuration, this._maxDuration)}s`;
		}

		div.style.animation = "none";
		void div.offsetWidth;
		div.className = this._className;
		div.style.animation = "";
	}
}

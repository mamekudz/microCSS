import { SoundAtlasPlayer } from "../shared/sound-atlas-player.mjs";

const SOUND_WAV = new URL("./dist/snds/fly.sounds.wav", import.meta.url);
const SOUND_JSON = new URL("./dist/snds/fly.sounds.json", import.meta.url);

// Movement vectors aligned with FlyEx CSS directions (d0 = east, then clockwise).
const VECTORS = [
	[2.4, 0],
	[1.9, 1.3],
	[0, 2.4],
	[-1.9, 1.3],
	[-2.4, 0],
	[-1.9, -1.3],
	[0, -2.4],
	[1.9, -1.3]
];

const FRAME_EVERY = 3;
const TICK_MS = 16;

class FlyDemo {
	constructor(_root, _sounds) {
		this._root = _root;
		this._sounds = _sounds;
		this._fly = null;
		this._alive = false;
		this._frame = 0;
		this._tickCount = 0;
		this._dir = 0;
		this._x = 0;
		this._y = 0;
		this._timer = 0;
	}

	spawn() {
		if (this._alive) return;
		this._alive = true;
		this._dir = Math.floor(Math.random() * 8);
		this._frame = 0;
		this._tickCount = 0;
		const w = this._root.clientWidth;
		const h = this._root.clientHeight;
		const pad = 40;
		if (this._dir < 2) {
			this._x = -pad;
			this._y = Math.random() * h;
		} else if (this._dir < 4) {
			this._x = Math.random() * w;
			this._y = -pad;
		} else if (this._dir < 6) {
			this._x = w + pad;
			this._y = Math.random() * h;
		} else {
			this._x = Math.random() * w;
			this._y = h + pad;
		}

		this._fly = document.createElement("div");
		this._fly.className = `fly n0 d${this._dir}`;
		this._syncPos();
		this._root.appendChild(this._fly);
		this._sounds?.Play("fly1", { loop: true });
		this._scheduleTick();
	}

	_scheduleTick() {
		this._timer = window.setTimeout(() => this._tick(), TICK_MS);
	}

	_tick() {
		if (!this._alive) return;
		this._tickCount++;
		if (this._tickCount % FRAME_EVERY === 0) {
			this._frame = (this._frame + 1) % 10;
			this._fly.className = `fly n${this._frame} d${this._dir}`;
		}
		const [vx, vy] = VECTORS[this._dir];
		this._x += vx;
		this._y += vy;
		const w = this._root.clientWidth;
		const h = this._root.clientHeight;
		if (this._x < -80 || this._x > w + 80 || this._y < -80 || this._y > h + 80) {
			this._despawn(false);
			window.setTimeout(() => this.spawn(), 1200);
			return;
		}
		this._syncPos();
		this._scheduleTick();
	}

	_syncPos() {
		if (!this._fly) return;
		this._fly.style.left = `${this._x}px`;
		this._fly.style.top = `${this._y}px`;
	}

	_hitTest(_x, _y) {
		if (!this._alive || !this._fly) return false;
		const rect = this._fly.getBoundingClientRect();
		const pad = 14;
		return _x >= rect.left - pad && _x <= rect.right + pad
			&& _y >= rect.top - pad && _y <= rect.bottom + pad;
	}

	swat(_x, _y) {
		if (!this._alive) return false;
		if (!this._hitTest(_x, _y)) return false;
		this._alive = false;
		clearTimeout(this._timer);
		this._sounds?.Stop("fly1");
		this._sounds?.Play("swatter");
		this._sounds?.Play("crush");

		const canvasRect = this._root.getBoundingClientRect();
		const localX = _x - canvasRect.left;
		const localY = _y - canvasRect.top;

		const swatter = document.createElement("div");
		swatter.className = "flySwatter clap";
		swatter.style.left = `${localX - 21}px`;
		swatter.style.top = `${localY - 21}px`;
		this._root.appendChild(swatter);

		this._fly.className = "fly dead";
		this._syncPos();

		window.setTimeout(() => swatter.remove(), 520);
		window.setTimeout(() => {
			this._fly?.remove();
			this._fly = null;
			window.setTimeout(() => this.spawn(), 2500);
		}, 1400);
		return true;
	}

	_despawn(_stopSound = true) {
		this._alive = false;
		clearTimeout(this._timer);
		if (_stopSound) this._sounds?.Stop("fly1");
		this._fly?.remove();
		this._fly = null;
	}
}

async function _Boot() {
	const root = document.getElementById("fx-root");
	const audio = new AudioContext();
	const sounds = new SoundAtlasPlayer(audio);
	await sounds.Load(SOUND_WAV.href, SOUND_JSON.href);

	const demo = new FlyDemo(root, sounds);
	let started = false;

	async function _StartDemo() {
		if (audio.state === "suspended") await audio.resume();
		root.classList.remove("is-idle");
		if (!started) {
			started = true;
			demo.spawn();
		}
	}

	root.addEventListener("pointerdown", async (_event) => {
		await _StartDemo();
		const rect = root.getBoundingClientRect();
		demo.swat(_event.clientX, _event.clientY);
		_event.preventDefault();
	});
}

_Boot().catch((_error) => {
	console.error(_error);
	document.body.insertAdjacentHTML("beforeend",
		`<p style="color:#f88;padding:1rem">Demo failed to load sounds. Run <code>npx gulp demos:build</code> first.</p>`);
});

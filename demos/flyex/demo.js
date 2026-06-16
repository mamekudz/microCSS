import { SoundAtlasPlayer } from "../shared/sound-atlas-player.mjs";

const VECTORS = [
	[2.2, 0], [1.8, -1.2], [0, -2.2], [-1.8, -1.2],
	[-2.2, 0], [-1.8, 1.2], [0, 2.2], [1.8, 1.2]
];

class FlyDemo {
	constructor(_root, _sounds) {
		this._root = _root;
		this._sounds = _sounds;
		this._fly = null;
		this._alive = false;
		this._frame = 0;
		this._dir = 0;
		this._x = 0;
		this._y = 0;
		this._raf = 0;
	}

	spawn() {
		if (this._alive) return;
		this._alive = true;
		this._dir = Math.floor(Math.random() * 8);
		this._frame = 0;
		const w = window.innerWidth;
		const h = window.innerHeight;
		if (this._dir < 2) { this._x = -20; this._y = Math.random() * h; }
		else if (this._dir < 4) { this._x = Math.random() * w; this._y = -20; }
		else if (this._dir < 6) { this._x = w + 20; this._y = Math.random() * h; }
		else { this._x = Math.random() * w; this._y = h + 20; }

		this._fly = document.createElement("div");
		this._fly.className = `fly n0 d${this._dir}`;
		this._syncPos();
		this._root.appendChild(this._fly);
		this._sounds?.Play("fly1", { loop: true });
		this._tick();
	}

	_tick() {
		if (!this._alive) return;
		this._frame = (this._frame + 1) % 10;
		this._fly.className = `fly n${this._frame} d${this._dir}`;
		const [vx, vy] = VECTORS[this._dir];
		this._x += vx;
		this._y += vy;
		const w = window.innerWidth;
		const h = window.innerHeight;
		if (this._x < -60 || this._x > w + 60 || this._y < -60 || this._y > h + 60) {
			this._despawn(false);
			window.setTimeout(() => this.spawn(), 1200);
			return;
		}
		this._syncPos();
		this._raf = requestAnimationFrame(() => this._tick());
	}

	_syncPos() {
		if (!this._fly) return;
		this._fly.style.left = `${this._x}px`;
		this._fly.style.top = `${this._y}px`;
	}

	_hitTest(_x, _y) {
		if (!this._alive || !this._fly) return false;
		const rect = this._fly.getBoundingClientRect();
		const pad = 12;
		return _x >= rect.left - pad && _x <= rect.right + pad
			&& _y >= rect.top - pad && _y <= rect.bottom + pad;
	}

	swat(_x, _y) {
		if (!this._alive) return false;
		if (!this._hitTest(_x, _y)) return false;
		this._alive = false;
		cancelAnimationFrame(this._raf);
		this._sounds?.Stop("fly1");
		this._sounds?.Play("swatter");
		this._sounds?.Play("crush");

		const swatter = document.createElement("div");
		swatter.className = "flySwatter clap";
		swatter.style.left = `${_x - 21}px`;
		swatter.style.top = `${_y - 21}px`;
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

	_despawn(_playSound = true) {
		this._alive = false;
		cancelAnimationFrame(this._raf);
		if (_playSound) this._sounds?.Stop("fly1");
		this._fly?.remove();
		this._fly = null;
	}
}

async function _Boot() {
	const root = document.getElementById("fx-root");
	const audio = new AudioContext();
	const sounds = new SoundAtlasPlayer(audio);
	await sounds.Load("dist/snds/fly.sounds.wav", "dist/snds/fly.sounds.json");

	const demo = new FlyDemo(root, sounds);
	let started = false;

	async function _EnsureAudio() {
		if (audio.state === "suspended") await audio.resume();
		if (!started) {
			started = true;
			demo.spawn();
		}
	}

	document.addEventListener("pointerdown", async (_event) => {
		await _EnsureAudio();
		if (!demo.swat(_event.clientX, _event.clientY)) {
			// Missed — optional fly2 buzz on miss (subtle)
		}
	});

	document.querySelector(".demo-hint")?.addEventListener("click", _EnsureAudio);
}

_Boot().catch((_error) => {
	console.error(_error);
	document.body.insertAdjacentHTML("beforeend",
		`<p style="color:#800;padding:1rem">Demo failed to load sounds. Run <code>npx gulp demos:build</code> first.</p>`);
});

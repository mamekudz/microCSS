const canvas = document.getElementById("fx-root");
const POOL_SIZE = 48;
const MIN_DIST_SQ = 12 * 12;
const pool = [];

let lastX = null;
let lastY = null;

function _CreateSparkle() {
	const sparkle = document.createElement("div");
	sparkle.className = "glittery hidden";
	canvas.appendChild(sparkle);
	sparkle.addEventListener("animationend", () => {
		sparkle.classList.add("hidden");
		sparkle.style.animation = "none";
	}, { passive: true });
	return sparkle;
}

function _TakeSparkle() {
	for (const sparkle of pool) {
		if (sparkle.classList.contains("hidden")) return sparkle;
	}
	return _CreateSparkle();
}

function _SpawnSparkle(_x, _y) {
	const rect = canvas.getBoundingClientRect();
	const sparkle = _TakeSparkle();
	sparkle.style.left = `${_x - rect.left}px`;
	sparkle.style.top = `${_y - rect.top}px`;
	sparkle.classList.remove("hidden");
	// Restart the CSS steps() animation on reuse (AiDPix-style pool).
	sparkle.style.animation = "none";
	void sparkle.offsetWidth;
	sparkle.style.animation = "";
}

function _OnMove(_clientX, _clientY) {
	if (lastX === null) {
		lastX = _clientX;
		lastY = _clientY;
		return;
	}
	const dx = _clientX - lastX;
	const dy = _clientY - lastY;
	if (dx * dx + dy * dy < MIN_DIST_SQ) return;
	lastX = _clientX;
	lastY = _clientY;
	_SpawnSparkle(_clientX, _clientY);
}

for (let i = 0; i < POOL_SIZE; i++) pool.push(_CreateSparkle());

canvas.addEventListener("pointermove", (_event) => {
	_OnMove(_event.clientX, _event.clientY);
});

canvas.addEventListener("pointerleave", () => {
	lastX = null;
	lastY = null;
});

canvas.addEventListener("pointerenter", (_event) => {
	lastX = _event.clientX;
	lastY = _event.clientY;
});

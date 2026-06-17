import { InitDemoLightbox } from "../shared/demo-lightbox.mjs";
import { GUIParticles } from "../shared/gui-particles.mjs";

InitDemoLightbox();

const canvas = document.getElementById("fx-root");
const glittery = new GUIParticles("glittery", canvas, {
	runMode: GUIParticles.RUNMODE_RNDRADIAL,
	minDuration: 0.4,
	maxDuration: 0.8,
	maxNoOfParticles: 60,
	minRadius: 10,
	maxRadius: 80
});

canvas.addEventListener("pointermove", (_event) => {
	glittery.Run(_event.clientX, _event.clientY);
});

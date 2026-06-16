import { DefineSkin } from "../../gulp-mu-css/src/index.mjs";
import { FlyEx, FlyExUtils } from "../shared/effect-helpers.mjs";

export default DefineSkin({
	vars: {
		FlySuckZIndex: 11940,
		FlyDirtZIndex: 11950,
		FlyDeadZIndex: 11960,
		FlyGoingZIndex: 11970,
		FlyFlyingZIndex: 11980,
		FlySwatterZIndex: 11990
	},

	helpers: { FlyEx, FlyExUtils },

	media: [
		{
			sequenceStrip: "dev/media/raw/flyex/imgs/flyex.png",
			outputFile: "dev/media/final/flyex/flyex.png",
			outputBase: "project"
		},
		{
			sequenceStrip: "dev/media/raw/flyex/imgs/flyexutils.png",
			outputFile: "dev/media/final/flyex/flyexutils.png",
			outputBase: "project"
		},
		{
			copyFolder: "dev/media/final/flyex",
			to: "imgs/flyex",
			filter: ".*\\.(png|json)"
		}
	],

	sounds: {
		src: "dev/media/sounds",
		dataFile: "snds/fly.sounds.wav",
		jsonFile: "snds/fly.sounds.json"
	},

	files: [{ source: "demo.µ.css", target: "demo.css" }]
});

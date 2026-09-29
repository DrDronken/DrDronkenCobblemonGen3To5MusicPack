const fs = require("fs");
const path = require("path");
const { ZipArchive } = require("archiver");

// ============================================================
// PATHS
// ============================================================

// Existing folder containing:
//   pack.mcmeta
//   pack.png
//   sounds.json
//   music/              <-- your existing source music
const packDir = path.join(
	__dirname,
	"pokemon-music-datapack"
);

const soundsJsonPath = path.join(
	packDir,
	"sounds.json"
);

const musicDir = path.join(
	packDir,
	"music"
);

const outputZip = path.join(
	__dirname,
	"DrDronkenCobbleTunesMusicPack.zip"
);

// ============================================================
// READ SOUNDS.JSON
// ============================================================

const soundsConfig = JSON.parse(
	fs.readFileSync(soundsJsonPath, "utf8")
);

// Find every unique sound referenced by sounds.json
const referencedSounds = new Set();

for (const event of Object.values(soundsConfig)) {
	if (!event || !Array.isArray(event.sounds)) continue;

	for (const sound of event.sounds) {
		let soundName;

		// Supports:
		// "cobbletunes:music/song"
		//
		// and:
		// {
		//     "name": "cobbletunes:music/song",
		//     "stream": true
		// }
		if (typeof sound === "string") {
			soundName = sound;
		} else if (
			typeof sound === "object" &&
			typeof sound.name === "string"
		) {
			soundName = sound.name;
		}

		if (!soundName) continue;

		const prefix = "cobbletunes:";

		if (!soundName.startsWith(prefix)) {
			console.warn(
				`Ignoring non-CobbleTunes sound: ${soundName}`
			);
			continue;
		}

		// Example:
		// cobbletunes:music/rse_route_111
		// ->
		// music/rse_route_111
		const relativeSoundPath =
			soundName.substring(prefix.length);

		referencedSounds.add(relativeSoundPath);
	}
}

console.log(
	`Found ${referencedSounds.size} unique referenced music files`
);

// ============================================================
// CREATE ZIP
// ============================================================

const output = fs.createWriteStream(outputZip);

const archive = new ZipArchive({
	zlib: { level: 9 }
});

output.on("close", () => {
	console.log(`\nCreated: ${outputZip}`);
	console.log(
		`ZIP size: ${archive.pointer()} bytes`
	);
});

archive.on("error", err => {
	throw err;
});

archive.pipe(output);

// ============================================================
// ROOT RESOURCE PACK FILES
// ============================================================

const packMcmeta = path.join(
	packDir,
	"pack.mcmeta"
);

const packPng = path.join(
	packDir,
	"pack.png"
);

if (!fs.existsSync(packMcmeta)) {
	throw new Error(
		`pack.mcmeta not found: ${packMcmeta}`
	);
}

archive.file(packMcmeta, {
	name: "pack.mcmeta"
});

if (fs.existsSync(packPng)) {
	archive.file(packPng, {
		name: "pack.png"
	});
} else {
	console.warn("pack.png not found - continuing without it");
}

// ============================================================
// SOUNDS.JSON
// ============================================================

archive.file(soundsJsonPath, {
	name: "assets/cobbletunes/sounds.json"
});

// ============================================================
// MUSIC
// ============================================================

let added = 0;
let missing = 0;

for (const relativeSoundPath of referencedSounds) {

	/*
		CobbleTunes reference:

		cobbletunes:music/rse_route_111

		Resource pack destination:

		assets/cobbletunes/sounds/music/rse_route_111.ogg

		Existing source:

		pokemon-music-datapack/music/rse_route_111.mp3
	*/

	const filename = path.basename(relativeSoundPath) + ".mp3";

	const sourcePath = path.join(musicDir, filename);

	const destinationPath = path.posix.join(
		"assets",
		"cobbletunes",
		"sounds",
		relativeSoundPath + ".mp3"
	);

	if (!fs.existsSync(sourcePath)) {
		console.warn(`Missing: ${filename}`);
		missing++;
		continue;
	}

	archive.file(sourcePath, {
		name: destinationPath
	});

	added++;
}

// ============================================================
// FINISH
// ============================================================

console.log(`Added ${added} music files`);
console.log(`Missing ${missing} music files`);

archive.finalize();
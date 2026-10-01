const fs = require("fs");
const path = require("path");
const { ZipArchive } = require("archiver");
const YAML = require("yaml");

const yaml = fs.readFileSync(
	"./pokemon-music-datapack/ReactiveMusic.yaml",
	"utf8"
);

// Parse YAML properly
const config = YAML.parse(yaml);

// Collect all songs from every entry
const unique_files = [];

for (const entry of config.entries ?? []) {
	if (!entry.songs) continue;

	if (Array.isArray(entry.songs)) {
		unique_files.push(...entry.songs);
	} else if (typeof entry.songs === "string") {
		unique_files.push(entry.songs);
	}
}

// Remove duplicates
const uniqueFiles = [...new Set(unique_files)];

console.log(`Found ${uniqueFiles.length} unique files`);

// ============================================================
// PATHS
// ============================================================

const packDir = path.join(
	__dirname,
	"pokemon-music-datapack"
);

const musicDir = path.join(
	packDir,
	"music"
);

const reactiveMusicYaml = path.join(
	packDir,
	"ReactiveMusic.yaml"
);

const packPng = path.join(
	packDir,
	"pack.png"
);

const packMcmeta = path.join(
	packDir,
	"pack.mcmeta"
);

const outputZip = path.join(
	__dirname,
	"DrDrunkCobblemonGeneration3to5MusicPack.zip"
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
	console.log(`ZIP size: ${archive.pointer()} bytes`);
});

archive.on("error", err => {
	throw err;
});

archive.pipe(output);

// ============================================================
// ADD PACK METADATA
// ============================================================

if (!fs.existsSync(reactiveMusicYaml)) {
	throw new Error(
		`ReactiveMusic.yaml not found: ${reactiveMusicYaml}`
	);
}

archive.file(reactiveMusicYaml, {
	name: "ReactiveMusic.yaml"
});

if (fs.existsSync(packPng)) {
	archive.file(packPng, {
		name: "pack.png"
	});
} else {
	console.warn("pack.png not found - continuing without it");
}

if (fs.existsSync(packMcmeta)) {
	archive.file(packMcmeta, {
		name: "pack.mcmeta"
	});
} else {
	console.warn("pack.mcmeta not found - continuing without it");
}

// ============================================================
// ADD ONLY REFERENCED MUSIC FILES
// ============================================================

let added = 0;
let missing = 0;

for (const file of uniqueFiles) {

	const filename = `${file}.mp3`;

	const fullPath = path.join(
		musicDir,
		filename
	);

	if (fs.existsSync(fullPath)) {

		archive.file(fullPath, {
			name: path.join(
				"music",
				filename
			)
		});

		added++;

	} else {

		console.warn(
			`Missing: ${filename}`
		);

		missing++;
	}
}

console.log(`Added ${added} music files`);
console.log(`Missing ${missing} music files`);

// ============================================================
// FINISH
// ============================================================

archive.finalize();
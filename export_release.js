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
		// Handles a single song written as:
		// songs: "song_name"
		unique_files.push(entry.songs);
	}
}

// Remove duplicates
const uniqueFiles = [...new Set(unique_files)];

console.log(`Found ${uniqueFiles.length} unique files`);

// Paths
const packDir = path.join(
	__dirname,
	"pokemon-music-datapack"
);

const musicDir = path.join(packDir, "music");

const outputZip = path.join(
	__dirname,
	"DrDronkenCobblemonMusicPack.zip"
);

// Create ZIP
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

// Add everything from pokemon-music-datapack EXCEPT music/
for (const entry of fs.readdirSync(packDir, { withFileTypes: true })) {
	if (entry.name === "music") continue;

	const fullPath = path.join(packDir, entry.name);

	if (entry.isDirectory()) {
		archive.directory(fullPath, entry.name);
	} else {
		archive.file(fullPath, {
			name: entry.name
		});
	}
}

// Add only the referenced music files
let added = 0;
let missing = 0;

for (const file of uniqueFiles) {
	const filename = `${file}.mp3`;
	const fullPath = path.join(musicDir, filename);

	if (fs.existsSync(fullPath)) {
		archive.file(fullPath, {
			name: path.join("music", filename)
		});

		added++;
	} else {
		console.warn(`Missing: ${filename}`);
		missing++;
	}
}

console.log(`Added ${added} music files`);
console.log(`Missing ${missing} music files`);

archive.finalize();
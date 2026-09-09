const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const yaml = fs.readFileSync("ReactiveMusic.yaml", "utf8");

// Extract songs from YAML
const songsRegex = /^[ \t]+songs:\s*\n((?:[ \t]+(?:-\s*)?"[^"\n]+"\s*\n?)+)/gm;

const unique_files = [];

for (const match of yaml.matchAll(songsRegex)) {
	const block = match[1];

	const entries = [...block.matchAll(/"([^"\n]+)"/g)]
		.map(m => m[1]);

	unique_files.push(...entries);
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
const archive = archiver("zip", {
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

// Add everything from pokemon-music-datapack EXCEPT music
for (const entry of fs.readdirSync(packDir)) {
	if (entry === "music") continue;

	const fullPath = path.join(packDir, entry);

	archive.directory(fullPath, entry);
}

// Add only the referenced music files
let added = 0;
let missing = 0;

for (const file of uniqueFiles) {
	// YAML entries may or may not contain .mp3
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
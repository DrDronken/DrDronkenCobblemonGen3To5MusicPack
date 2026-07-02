const fs = require("fs-extra");
const path = require("path");
const mm = require("music-metadata");

const RAW_DIR = "./raw";
const OUT_DIR = "./music";

// Album → prefix mapping
const ALBUM_PREFIX_MAP = {
	"Pokémon HeartGold & Pokémon SoulSilver Super Music Collection": "HGSS",
	"Pokémon Ruby & Pokémon Sapphire Super Music Collection": "RSE",
	"Pokémon Black & Pokémon White Super Music Collection": "BW",
	"Pokémon Black 2 & Pokémon White 2 Super Music Collection": "BW2",
	"Pokémon Diamond & Pokémon Pearl Super Music Collection": "DPPt",
};

// Fallback prefix
const UNKNOWN_PREFIX = "UNKNOWN";

function sanitizeFileName(name) {
	return name
		.replace(/[<>:"/\\|?*\x00-\x1F]/g, "") // illegal characters
		.replace(/\s+/g, " ")
		.trim();
}

async function processFile(file) {
	const filePath = path.join(RAW_DIR, file);

	try {
		const metadata = await mm.parseFile(filePath);
		const album = metadata.common.album || null;
		const title =
			metadata.common.title ||
			path.parse(file).name;

		const prefix = ALBUM_PREFIX_MAP[album] || UNKNOWN_PREFIX;

		const cleanTitle = sanitizeFileName(title);
		const newFileName = `${prefix} - ${cleanTitle}.mp3`;

		const outPath = path.join(OUT_DIR, newFileName);

		await fs.copy(filePath, outPath, { overwrite: true });

		console.log(`✔ ${file} → ${newFileName}`);

		return {
			original: file,
			album,
			title,
			prefix,
			output: newFileName,
		};
	} catch (err) {
		console.error(`✖ Failed: ${file}`, err.message);
		return null;
	}
}

async function run() {
	await fs.ensureDir(OUT_DIR);

	const files = await fs.readdir(RAW_DIR);
	const mp3Files = files.filter((f) => f.toLowerCase().endsWith(".mp3"));

	const log = [];

	for (const file of mp3Files) {
		const result = await processFile(file);
		if (result) log.push(result);
	}

	await fs.writeJson("./music-log.json", log, { spaces: 2 });

	console.log("\nDone.");
	console.log(`Processed: ${log.length} files`);
	console.log("Log saved to music-log.json");
}

run();
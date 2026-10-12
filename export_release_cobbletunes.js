const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { ZipArchive } = require("archiver");

// ============================================================
// SETTINGS
// ============================================================

// Number of simultaneous FFmpeg processes.
// 8 is a good starting point for a Ryzen 9 7900.
const MAX_CONCURRENT = 8;

// OGG Vorbis quality.
// 5 is roughly ~160 kbps VBR.
const OGG_QUALITY = "5";

// ============================================================
// PATHS
// ============================================================

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

// FFmpeg must be available in PATH.
const ffmpeg = "ffmpeg";

// Temporary directory for converted OGG files
const tempDir = fs.mkdtempSync(
	path.join(os.tmpdir(), "cobbletunes-")
);

// ============================================================
// READ SOUNDS.JSON
// ============================================================

const soundsConfig = JSON.parse(
	fs.readFileSync(soundsJsonPath, "utf8")
);

const referencedSounds = new Set();

for (const event of Object.values(soundsConfig)) {
	if (!event || !Array.isArray(event.sounds)) continue;

	for (const sound of event.sounds) {
		let soundName;

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

		const relativeSoundPath =
			soundName.substring(prefix.length);

		referencedSounds.add(relativeSoundPath);
	}
}

console.log(
	`Found ${referencedSounds.size} unique referenced music files`
);

// ============================================================
// CONVERSION STATE
// ============================================================

const convertedFiles = [];

let converted = 0;
let missing = 0;
let failed = 0;

// ============================================================
// CONVERT ONE FILE
// ============================================================

function convertFile(relativeSoundPath) {
	return new Promise(resolve => {

		const baseName = path.basename(relativeSoundPath);

		const inputFilename = `${baseName}.mp3`;
		const outputFilename = `${baseName}.ogg`;

		const inputPath = path.join(
			musicDir,
			inputFilename
		);

		const outputPath = path.join(
			tempDir,
			outputFilename
		);

		if (!fs.existsSync(inputPath)) {
			console.warn(`Missing: ${inputFilename}`);
			missing++;

			resolve();
			return;
		}

		console.log(
			`[START] ${inputFilename}`
		);

		execFile(
			ffmpeg,
			[
				"-y",

				// Input
				"-i",
				inputPath,

				// Ignore cover art / video streams
				"-vn",

				// OGG Vorbis
				"-c:a",
				"libvorbis",

				// VBR quality
				"-q:a",
				OGG_QUALITY,

				outputPath
			],
			{
				// FFmpeg can produce quite a lot of stderr output.
				// We don't need to capture it unless conversion fails.
				maxBuffer: 10 * 1024 * 1024
			},
			(error, stdout, stderr) => {

				if (error) {
					console.error(
						`[FAILED] ${inputFilename}`
					);

					console.error(
						error.message
					);

					if (stderr) {
						console.error(
							stderr.slice(-2000)
						);
					}

					failed++;
					resolve();
					return;
				}

				convertedFiles.push({
					source: outputPath,
					relativeSoundPath
				});

				converted++;

				console.log(
					`[DONE ${converted}/${referencedSounds.size}] ${outputFilename}`
				);

				resolve();
			}
		);
	});
}

// ============================================================
// WORKER
// ============================================================

async function worker(queue, workerNumber) {

	while (true) {

		const relativeSoundPath = queue.shift();

		if (relativeSoundPath === undefined) {
			return;
		}

		await convertFile(relativeSoundPath);
	}
}

// ============================================================
// CONVERT ALL FILES
// ============================================================

async function convertAll() {

	const queue = [...referencedSounds];

	console.log("\nConverting music to OGG...");
	console.log(
		`Running up to ${MAX_CONCURRENT} FFmpeg processes simultaneously.\n`
	);

	const workers = [];

	const workerCount = Math.min(
		MAX_CONCURRENT,
		queue.length
	);

	for (let i = 0; i < workerCount; i++) {
		workers.push(
			worker(queue, i + 1)
		);
	}

	await Promise.all(workers);
}

// ============================================================
// CREATE ZIP
// ============================================================

function createZip() {

	console.log("\nConversion finished.");
	console.log(`Converted: ${converted}`);
	console.log(`Missing:   ${missing}`);
	console.log(`Failed:    ${failed}`);

	// Abort if an actual FFmpeg conversion failed.
	if (failed > 0) {

		fs.rmSync(tempDir, {
			recursive: true,
			force: true
		});

		throw new Error(
			`${failed} music file(s) failed to convert. ZIP not created.`
		);
	}

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

	if (!fs.existsSync(soundsJsonPath)) {
		throw new Error(
			`sounds.json not found: ${soundsJsonPath}`
		);
	}

	console.log("\nCreating resource pack ZIP...");

	const output = fs.createWriteStream(outputZip);

	const archive = new ZipArchive({
		zlib: { level: 9 }
	});

	archive.on("error", err => {
		throw err;
	});

	archive.pipe(output);

	// ========================================================
	// ROOT FILES
	// ========================================================

	archive.file(packMcmeta, {
		name: "pack.mcmeta"
	});

	if (fs.existsSync(packPng)) {
		archive.file(packPng, {
			name: "pack.png"
		});
	} else {
		console.warn(
			"pack.png not found - continuing without it"
		);
	}

	// ========================================================
	// SOUNDS.JSON
	// ========================================================

	archive.file(soundsJsonPath, {
		name: "assets/cobbletunes/sounds.json"
	});

	// ========================================================
	// OGG MUSIC
	// ========================================================

	let added = 0;

	for (const file of convertedFiles) {

		const destinationPath = path.posix.join(
			"assets",
			"cobbletunes",
			"sounds",
			file.relativeSoundPath + ".ogg"
		);

		archive.file(file.source, {
			name: destinationPath
		});

		added++;
	}

	// ========================================================
	// FINISH
	// ========================================================

	output.on("close", () => {

		console.log(`\nCreated: ${outputZip}`);
		console.log(
			`ZIP size: ${archive.pointer()} bytes`
		);

		console.log("\nSummary:");
		console.log(
			`Referenced: ${referencedSounds.size}`
		);
		console.log(
			`Converted:  ${converted}`
		);
		console.log(
			`Added:      ${added}`
		);
		console.log(
			`Missing:    ${missing}`
		);
		console.log(
			`Failed:     ${failed}`
		);

		// Remove temporary OGG files only after
		// Archiver has finished reading them.
		fs.rmSync(tempDir, {
			recursive: true,
			force: true
		});

		console.log(
			"\nTemporary OGG files removed."
		);
	});

	archive.finalize();
}

// ============================================================
// MAIN
// ============================================================

async function main() {

	try {

		await convertAll();

		createZip();

	} catch (err) {

		console.error("\nExport failed:");
		console.error(err);

		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, {
				recursive: true,
				force: true
			});
		}

		process.exitCode = 1;
	}
}

main();

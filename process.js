const fs = require("fs");
const path = require("path");

const RAW_DIR = "./raw";
const OUT_DIR = "./music";

const includeKeywords = [
	"route",
	"city",
	"town",
	"battle",
	"path",
	"mountain",
	"cave",
	"lake",
	"mine",
	"falls",
	"mt.",
	"ocean",
	"forest",
	"woods",
	"pillar",
	"hall",
	"island",
	"chateau",
	"meadows",
	"drought",
	"heavy_rain",
	"tower",
	"distortion_world",
	"bridge",
	"village",
	"temple",
	"snow",
	"ice",
	"castle",
	"plaza",
	"desert",
	"road",
	"s.s.",
	"resort",
	"port",
	"sewer",
	"ruin",
	"dppt_pok",
	"lighthouse",
	"ranch",
	"ship",
	"surf",
	"dreamyard",
	"cold_storage",
	"league",
	"deep_within_team_galactic_hq"
];

const excludeKeywords = [
	"night",
	"autumn",
	"spring",
	"winter",
	"received",
	"radio",
	"bonus_track",
	"tight_spot_during_battle",
	"wi-fi",
	"eyes_meet",
	"hall_of_fame",
	"healed"
];

function normalize(str) {
	return str
		.toLowerCase()                   // Convert to lowercase
		.replace(/[\!\(\)]/g, '')        // Remove special characters (!, (, ))
		.replace(/\s-\s/g, '_')          // Replace " - " with a single underscore
		.replace(/\s+/g, '_')           // Replace any remaining spaces with underscores
		.replace(/é/g, 'e');				// Replace the és from pokémon
}

if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

const files = fs.readdirSync(RAW_DIR);

let copied = 0;

for (const file of files) {
	const lower = normalize(file);

	// INCLUSION filter
	const includesMatches = includeKeywords.filter(k => lower.includes(k));
	const included = includesMatches.length > 0;

	// EXCLUSION FIRST (hard filter)
	const excludeMatches = excludeKeywords.filter(k => lower.includes(k));
	const excluded = excludeMatches.length > 0;
	if (excluded === true || included === false) {
		console.log(`Track ${file} is EXCLUDED because it matches ${excludeMatches.length ? JSON.stringify(excludeMatches) : 'nothing'}`);
		continue;
	};

	const src = path.join(RAW_DIR, file);
	const dest = path.join(OUT_DIR, lower);

	console.log(`Track ${file} is INCLUDED because it matches ${includesMatches.length ? JSON.stringify(includesMatches) : 'nothing'}`);
	fs.copyFileSync(src, dest);
	copied++;
}

console.log(`Done. Copied ${copied} files to ${OUT_DIR}`);
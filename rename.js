const fs = require('fs');
const path = require('path');

// Target the current directory where the script is placed
const dirPath = __dirname + '/music';

fs.readdir(dirPath, (err, files) => {
	if (err) {
		return console.error('Could not list the directory.', err);
	}

	files.forEach((file) => {
		// Only target .mp3 files and skip the script itself
		if (path.extname(file).toLowerCase() === '.mp3') {

			let newName = file
				.toLowerCase()                   // Convert to lowercase
				.replace(/[\!\(\)]/g, '')        // Remove special characters (!, (, ))
				.replace(/\s-\s/g, '_')          // Replace " - " with a single underscore
				.replace(/\s+/g, '_');           // Replace any remaining spaces with underscores

			const oldFilePath = path.join(dirPath, file);
			const newFilePath = path.join(dirPath, newName);

			// Only rename if the name actually changed
			if (file !== newName) {
				fs.rename(oldFilePath, newFilePath, (renameErr) => {
					if (renameErr) {
						console.error(`Error renaming ${file}:`, renameErr);
					} else {
						console.log(`Renamed: "${file}" -> "${newName}"`);
					}
				});
			}
		}
	});
});
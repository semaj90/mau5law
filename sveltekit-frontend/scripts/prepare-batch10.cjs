const fs = require('fs');

try {
    const summary = JSON.parse(fs.readFileSync('reports/tsc-summary.json', 'utf8'));
    const fileCounts = {};

    summary.errors.forEach(err => {
        // Extract filename: "src/..." until "("
        const match = err.match(/^(src\/[^:(]+)/);
        if (match) {
            const file = match[1];
            fileCounts[file] = (fileCounts[file] || 0) + 1;
        }
    });

    const sortedFiles = Object.entries(fileCounts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

    console.log(`Total files with errors: ${sortedFiles.length}`);

    // Batch 10: 451-500 (indices 450-499)
    const batch10 = sortedFiles.slice(450, 500);
    console.log(`Batch 10 size: ${batch10.length}`);

    fs.writeFileSync('reports/hot-files-10.txt', batch10.join('\n'));

    // Investigate webgpu-som-error-fixer.ts
    const targetFile = 'src/lib/services/webgpu-som-error-fixer.ts';
    const targetErrors = summary.errors.filter(e => e.includes(targetFile));
    console.log(`\nErrors for ${targetFile}: ${targetErrors.length}`);
    console.log('Sample errors:');
    targetErrors.slice(0, 5).forEach(e => console.log(e));

} catch (e) {
    console.error(e);
}

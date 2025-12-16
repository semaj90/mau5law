import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = process.argv[2] || path.join(__dirname, '../reports/svelte_raw.log');
const OUTPUT_FILE = path.join(__dirname, '../reports/error-analysis.json');

console.log(\🚀 Starting Advanced Error Analysis on \\);

async function analyzeErrors() {
    if (!fs.existsSync(LOG_FILE)) {
        console.error(\❌ Log file not found: \\);
        process.exit(1);
    }

    const stats = fs.statSync(LOG_FILE);
    const fileSize = stats.size;
    let bytesRead = 0;

    const fileStream = fs.createReadStream(LOG_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const data = {
        totalErrors: 0,
        byType: {},
        byFile: {},
        simdCandidates: []
    };

    console.log('📊 Streaming and parsing log...');
    let lastPercent = 0;

    for await (const line of rl) {
        bytesRead += Buffer.byteLength(line) + 1; // +1 for newline
        const percent = Math.floor((bytesRead / fileSize) * 100);
        
        if (percent > lastPercent && percent % 10 === 0) {
            process.stdout.write(\\rProgress: \%\);
            lastPercent = percent;
        }

        if (line.includes('Error:')) {
            data.totalErrors++;

            // Extract file path
            const match = line.match(/^([^:]+):(\d+):(\d+):/);
            if (match) {
                const filePath = match[1];
                data.byFile[filePath] = (data.byFile[filePath] || 0) + 1;

                // Check for SIMD candidates
                if (filePath.includes('simd') || filePath.includes('json')) {
                    data.simdCandidates.push(filePath);
                }
            }
            
            // Extract Error Type
            const typeMatch = line.match(/Error: ([^(]+)/);
            if (typeMatch) {
                const type = typeMatch[1].trim();
                data.byType[type] = (data.byType[type] || 0) + 1;
            }
        }
    }
    
    process.stdout.write('\rProgress: 100%\n');

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log(\✅ Analysis written to \\);
    console.log(\Total Errors: \\);
    console.log(\Top Error Types:\, Object.entries(data.byType).sort((a, b) => b[1] - a[1]).slice(0, 5));
}

analyzeErrors().catch(console.error);

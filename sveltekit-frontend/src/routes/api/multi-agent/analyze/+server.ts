
import { json } from "@sveltejs/kit";

import { promisify } from "util";
import { exec } from "child_process";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import type { RequestHandler } from "@sveltejs/kit";
import { URL } from "url";


const execAsync = promisify(exec);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const {
      caseId,
      evidenceContent,
      evidenceTitle,
      evidenceType = "document",
    } = await request.json();

    if (!caseId || !evidenceContent || !evidenceTitle) {
      return json(
        {
          error:
            "Missing required fields: caseId, evidenceContent, evidenceTitle",
        },
        { status: 400 }
      );
    }

    // Create temp directory if it doesn't exist
    const tempDir = "./temp";
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Create evidence file
    const timestamp = Date.now();
    const evidenceFile = `${tempDir}/evidence_${caseId}_${timestamp}.txt`;
    await writeFile(evidenceFile, evidenceContent, "utf8");

    console.log(`Starting multi-agent analysis for case ${caseId}`);
    console.log(`Evidence file: ${evidenceFile}`);

    // Execute the multi-agent analysis script
    const scriptPath =
      process.platform === "win32"
        ? "./scripts/analyze-evidence.bat"
        : "./scripts/analyze-evidence.sh";

    const { stdout, stderr } = await execAsync(
      `${scriptPath} ${caseId} "${evidenceFile}"`
    );

    if (stderr) {
      console.warn("Analysis stderr:", stderr);
    }

    console.log("Analysis stdout:", stdout);

    // Read analysis results
    const analysisDir = `${tempDir}/analysis_${caseId}_${timestamp}`;

    let evidenceAnalysis = {};
    let personsData = {};
    let caseSynthesis = {};
    let neo4jUpdates = {};

    try {
      // Try to read each result file
      if (existsSync(`${analysisDir}/evidence_analysis.json`)) {
        const data = await readFile(
          `${analysisDir}/evidence_analysis.json`,
          "utf8"
        );
        evidenceAnalysis = JSON.parse(data);
      }

      if (existsSync(`${analysisDir}/persons_extracted.json`)) {
        const data = await readFile(
          `${analysisDir}/persons_extracted.json`,
          "utf8"
        );
        personsData = JSON.parse(data);
      }

      if (existsSync(`${analysisDir}/case_synthesis.json`)) {
        const data = await readFile(
          `${analysisDir}/case_synthesis.json`,
          "utf8"
        );
        caseSynthesis = JSON.parse(data);
      }

      if (existsSync(`${analysisDir}/neo4j_updates.json`)) {
        const data = await readFile(
          `${analysisDir}/neo4j_updates.json`,
          "utf8"
        );
        neo4jUpdates = JSON.parse(data);
      }
    } catch (parseError) {
      console.warn("Error parsing analysis results:", parseError);
    }

    // Compile final analysis result
    const analysisResult = {
      id: `analysis_${caseId}_${timestamp}`,
      caseId,
      evidenceAnalysis,
      personsData,
      caseSynthesis,
      neo4jUpdates,
      timestamp: new Date().toISOString(),
      // Remove confidence property (not in schema)
      metadata: {
        evidenceTitle,
        evidenceType,
        analysisDir,
        scriptOutput: stdout,
      },
    };

    return json({
      success: true,
      analysis: analysisResult,
      message: "Multi-agent analysis completed successfully",
    });
  } catch (error: any) {
    console.error("Multi-agent analysis error:", error);

    return json(
      {
        success: false,
        error: error.message,
        message: "Multi-agent analysis failed",
      },
      { status: 500 }
    );
  }
};

// GET endpoint to retrieve analysis results
export const GET: RequestHandler = async ({ url }) => {
  try {
    const caseId = url.searchParams.get("caseId");
    const analysisId = url.searchParams.get("analysisId");

    if (!caseId) {
      return json({ error: "Missing caseId parameter" }, { status: 400 });
    }

    // Production-ready retrieval: read analysis directories from a configurable storage directory,
    // validate inputs to prevent path traversal, and return either a single analysis or a list.
    try {
      // Basic validation
      if (!caseId) {
        return json({ error: "Missing caseId parameter" }, { status: 400 });
      }
      // Allow only safe characters in caseId to avoid traversal injection
      if (!/^[A-Za-z0-9_-]+$/.test(caseId)) {
        return json({ error: "Invalid caseId" }, { status: 400 });
      }

      // Use configurable storage dir (defaults to ./temp to remain compatible with POST)
      const storageDir =
        import.meta.env.ANALYSIS_STORAGE_DIR?.trim() || "./temp";

      const path = await import("path");
      const fs = await import("fs/promises");
      const nodeFs = await import("fs");
      const baseDir = path.resolve(storageDir);

      // If storage directory doesn't exist, return empty result (no analyses yet)
      if (!nodeFs.existsSync(baseDir)) {
        return json({
          success: true,
          analyses: [],
          caseId,
        });
      }

      // Read entries under the storage directory
      const dirents = await fs.readdir(baseDir, { withFileTypes: true });

      // Match directories whose name follows the pattern analysis_{caseId}_{timestamp}
      const prefix = `analysis_${caseId}_`;
      const matchingDirs = dirents.filter(
        (d) => d.isDirectory() && d.name.startsWith(prefix)
      );

      // Helper to safely read JSON file if present
      const safeReadJson = async (dir: string, filename: string) => {
        try {
          const p = path.join(dir, filename);
          if (!nodeFs.existsSync(p)) return undefined;
          const txt = await fs.readFile(p, "utf8");
          return JSON.parse(txt);
        } catch {
          return undefined;
        }
      };

      const analyses: Array<any> = [];

      for (const d of matchingDirs) {
        const analysisDir = path.join(baseDir, d.name);

        // Build a summary of available results without throwing on missing/corrupt files
        const evidenceAnalysis = await safeReadJson(analysisDir, "evidence_analysis.json");
        const personsData = await safeReadJson(analysisDir, "persons_extracted.json");
        const caseSynthesis = await safeReadJson(analysisDir, "case_synthesis.json");
        const neo4jUpdates = await safeReadJson(analysisDir, "neo4j_updates.json");

        // Attempt to extract timestamp from directory name; fallback to file mtime
        let timestamp: string | undefined;
        const parts = d.name.split("_");
        if (parts.length >= 3) {
          // last part(s) after prefix are treated as timestamp
          timestamp = parts.slice(2).join("_");
          // try to normalize to ISO if it's numeric
          if (/^\d+$/.test(timestamp)) {
            timestamp = new Date(Number(timestamp)).toISOString();
          }
        }
        if (!timestamp) {
          try {
            const stats = await fs.stat(analysisDir);
            timestamp = stats.mtime.toISOString();
          } catch {
            timestamp = undefined;
          }
        }

        analyses.push({
          id: d.name,
          caseId,
          evidenceAnalysis,
          personsData,
          caseSynthesis,
          neo4jUpdates,
          analysisDir,
          timestamp,
        });
      }

      // If a specific analysisId was requested, return that one or 404
      if (analysisId) {
        const found = analyses.find((a) => a.id === analysisId);
        if (!found) {
          return json({ success: false, error: "Analysis not found" }, { status: 404 });
        }
        return json({ success: true, analysis: found });
      }

      // Return list (sorted by timestamp desc if available)
      analyses.sort((a, b) => {
        const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
        const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
        return tb - ta;
      });

      return json({
        success: true,
        analyses,
        caseId,
      });
    } catch (error: any) {
      console.error("Error retrieving analyses:", error);

      return json(
        {
          success: false,
              error: error?.message ?? String(error),
            },
            { status: 500 }
          );
    }

  } catch (error: any) {
    console.error("GET handler error:", error);

    return json(
      {
        success: false,
        error: error?.message ?? String(error),
        message: "Failed to retrieve analyses",
      },
      { status: 500 }
    );
  }
};

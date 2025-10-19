// Optional GPU-assisted JSON parsing helper with safe CPU fallback.
// Works with Node 18+; no external deps required. If gpu.js/tfjs are present,
// it warms the GPU but still parses JSON on CPU for correctness.

import fs from "fs";

async function tryWarmGpu(lengths) {
  try {
    const { GPU } = await import("gpu.js");
    const gpu = new GPU();
    const kernel = gpu
      .createKernel(function (lens) {
        return lens[this.thread.x];
      })
      .setOutput([lengths.length]);
    kernel(lengths);
  } catch (_) {
    // gpu.js not installed; ignore.
  }
}

export async function parseJsonLines(path) {
  const raw = fs.readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  // Warm GPU if available (optional, non-blocking)
  tryWarmGpu(lines.map((l) => l.length)).catch(() => {});

  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // Not a JSON line; skip
    }
  }
  return out;
}

export function parseJsonWhole(path) {
  const raw = fs.readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}


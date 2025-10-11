// TypeScript wrapper for tensorrt native addon
// Usage: after building the node addon (node-gyp), copy or point require to the built .node file
const path = require('path');

const addonPath = path.resolve(__dirname, '..', 'cpp', 'build', 'Release', 'tensorrt_bridge.node');
// Fallback location used by node-gyp
const fallback = path.resolve(__dirname, '..', 'cpp', 'build', 'tensorrt_bridge.node');

let addon: any;
try {
  addon = require(addonPath);
} catch (err) {
  try { addon = require(fallback); } catch (err2) { throw new Error(`Failed to load native addon from ${addonPath} or ${fallback}: ${err2}`); }
}

export function bridgeSIMD(json: string): number {
  if (!addon || !addon.bridgeSIMD) throw new Error('Native addon not loaded');
  return addon.bridgeSIMD(json);
}

export default { bridgeSIMD };

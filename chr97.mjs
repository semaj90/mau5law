#!/usr/bin/env node

/**
 * CH-ROM97 Cartridge Format Implementation
 * GPU-native multimodal memory blocks for Legal AI
 *
 * Tensor-Core Optimized:
 * - FP16 embeddings for RAG (768/1024 dims)
 * - Float32[4] manifold for reasoning
 * - Float16[4] manifold for GPU math
 * - Quant4 uint8[4] as spatial hash/tile index
 */

import fs from 'fs/promises';
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// CH-ROM97 Constants
const CHR97_MAGIC = Buffer.from('CHR97\x00\x00\x00');
const HEADER_SIZE = 4096;
const TILE_SIZE = 32 * 32; // 32x32 grayscale tiles
const TENSOR_DIM = 1024; // FP16 embedding dimension
const LATENT_DIM = 512; // INT4 latent dimension
const MANIFOLD_DIM = 4; // 4D UMAP manifold

// CH-ROM97 Header Structure
class CHR97Header {
  constructor() {
    this.magic = CHR97_MAGIC;
    this.version = Buffer.alloc(2);
    this.version.writeUInt16LE(0x0100); // v1.0
    this.flags = Buffer.alloc(2);
    this.runeCount = Buffer.alloc(2);
    this.tileCount = Buffer.alloc(2);
    this.tensorSize = Buffer.alloc(4);
    this.latentSize = Buffer.alloc(4);
    this.graphNodeCount = Buffer.alloc(4);
    this.manifoldDim = Buffer.alloc(1);
    this.manifoldDim.writeUInt8(MANIFOLD_DIM);
    this.reserved = Buffer.alloc(64);
  }

  setFlags(compressed = false, quantized = true, encrypted = false, hasVision = true) {
    let flags = 0;
    if (compressed) flags |= 1;
    if (quantized) flags |= 2;
    if (encrypted) flags |= 4;
    if (hasVision) flags |= 8;
    this.flags.writeUInt16LE(flags);
  }

  setCounts(runes, tiles, tensors, latents, nodes) {
    this.runeCount.writeUInt16LE(runes);
    this.tileCount.writeUInt16LE(tiles);
    this.tensorSize.writeUInt32LE(tensors);
    this.latentSize.writeUInt32LE(latents);
    this.graphNodeCount.writeUInt32LE(nodes);
  }

  toBuffer() {
    const headerData = Buffer.concat([
      this.magic,
      this.version,
      this.flags,
      this.runeCount,
      this.tileCount,
      this.tensorSize,
      this.latentSize,
      this.graphNodeCount,
      this.manifoldDim,
      this.reserved
    ]);
    // Pad to HEADER_SIZE
    const padding = Buffer.alloc(HEADER_SIZE - headerData.length);
    return Buffer.concat([headerData, padding]);
  }
}

// Rune Block Structure (matches C struct)
class CHR97RuneBlock {
  constructor(runeId, tileIndex, clusterId, manifold, quant4, graphDegree, tensorUuid) {
    this.runeId = runeId;
    this.tileIndex = tileIndex;
    this.clusterId = clusterId;
    this.manifold = manifold; // [x,y,z,w] 4D position
    this.quant4 = quant4; // [u8,u8,u8,u8] quantized coords
    this.graphDegree = graphDegree;
    this.tensorUuid = tensorUuid; // 64-bit UUID
  }

  toBuffer() {
    const buf = Buffer.alloc(2 + 2 + 2 + (4 * 4) + 4 + 2 + 8); // 36 bytes
    let offset = 0;

    buf.writeUInt16LE(this.runeId, offset); offset += 2;
    buf.writeUInt16LE(this.tileIndex, offset); offset += 2;
    buf.writeUInt16LE(this.clusterId, offset); offset += 2;

    // float32 manifold
    for (let i = 0; i < 4; i++) {
      buf.writeFloatLE(this.manifold[i], offset);
      offset += 4;
    }

    // quantized 4 bytes
    for (let i = 0; i < 4; i++) {
      buf.writeUInt8(this.quant4[i], offset);
      offset += 1;
    }

    buf.writeUInt16LE(this.graphDegree, offset); offset += 2;
    buf.writeBigUInt64LE(BigInt(this.tensorUuid), offset);

    return buf;
  }

  static fromBuffer(buf) {
    let offset = 0;
    const runeId = buf.readUInt16LE(offset); offset += 2;
    const tileIndex = buf.readUInt16LE(offset); offset += 2;
    const clusterId = buf.readUInt16LE(offset); offset += 2;

    const manifold = [];
    for (let i = 0; i < 4; i++) {
      manifold.push(buf.readFloatLE(offset)); offset += 4;
    }

    const quant4 = [];
    for (let i = 0; i < 4; i++) {
      quant4.push(buf.readUInt8(offset)); offset += 1;
    }

    const graphDegree = buf.readUInt16LE(offset); offset += 2;
    const tensorUuid = buf.readBigUInt64LE(offset);

    return new CHR97RuneBlock(runeId, tileIndex, clusterId, manifold, quant4, graphDegree, tensorUuid);
  }

  // Convert float32[4] manifold to float16[4] for GPU
  getManifoldFP16() {
    return this.manifold.map(v => {
      // Simplified FP16 conversion (same as tensor conversion)
      const sign = v < 0 ? 1 : 0;
      const abs = Math.abs(v);
      const exp = Math.floor(Math.log2(abs)) + 15;
      const mant = Math.round((abs / Math.pow(2, exp - 15)) * 1024);
      const fp16 = (sign << 15) | ((exp & 0x1F) << 10) | (mant & 0x3FF);
      return fp16;
    });
  }

  // Get quant4 as spatial hash key for GPU indexing
  getSpatialHash() {
    return this.quant4; // uint8[4] for fast tile lookup
  }
}
class CHR97Builder {
  constructor() {
    this.header = new CHR97Header();
    this.runeBlocks = [];
    this.tileAtlas = Buffer.alloc(0);
    this.tensorBank = Buffer.alloc(0);
    this.latentBank = Buffer.alloc(0);
    this.graphLinks = { offsets: [], edges: [] };
    this.metadata = {};
    this.visualCard = Buffer.alloc(0);
  }

  // Add a rune with all its data
  addRune(runeData) {
    const {
      id,
      tileIndex,
      clusterId,
      manifold,
      quant4,
      graphDegree,
      tensorUuid,
      tileData, // 32x32 grayscale buffer
      tensor, // 1024-dim FP16 array
      latent // 512-dim INT4 array
    } = runeData;

    // Add rune block
    const runeBlock = new CHR97RuneBlock(id, tileIndex, clusterId, manifold, quant4, graphDegree, tensorUuid);
    this.runeBlocks.push(runeBlock);

    // Append to tile atlas
    this.tileAtlas = Buffer.concat([this.tileAtlas, tileData]);

    // Append to tensor bank (convert to FP16)
    const fp16Tensor = this.float32ToFp16(tensor);
    this.tensorBank = Buffer.concat([this.tensorBank, fp16Tensor]);

    // Append to latent bank (pack INT4)
    const int4Latent = this.packInt4(latent);
    this.latentBank = Buffer.concat([this.latentBank, int4Latent]);
  }

  // Add graph edge
  addGraphEdge(fromNode, toNode) {
    this.graphLinks.edges.push(toNode);
    // Update offsets when building
  }

  // Set metadata
  setMetadata(metadata) {
    this.metadata = metadata;
  }

  // Set visual card (base64 PNG/WebP)
  setVisualCard(cardBuffer) {
    this.visualCard = cardBuffer;
  }

  // Add image topology data from CH-ROM97 Image Processor
  addImageTopology(imageTopology) {
    // Store topology information in metadata
    this.metadata.image_topology = imageTopology;

    // Add topology points as special runes
    for (let i = 0; i < imageTopology.topology_4d.length; i++) {
      const topoPoint = imageTopology.topology_4d[i];
      const quantPoint = imageTopology.quantized_topology[i];

      // Create a special topology rune
      this.addRune({
        id: 1000 + i, // Special ID range for topology
        tileIndex: i,
        clusterId: i, // Each topology point is its own cluster
        manifold: topoPoint,
        quant4: quantPoint,
        graphDegree: imageTopology.clusters.filter(c => c === i).length,
        tensorUuid: BigInt(crypto.randomBytes(8).readBigUInt64LE()),
        tileData: Buffer.alloc(TILE_SIZE), // Empty tile for topology
        tensor: new Array(TENSOR_DIM).fill(0), // Placeholder
        latent: new Array(LATENT_DIM).fill(0) // Placeholder
      });
    }
  }

  // Build final cartridge
  async build(outputPath) {
    // Finalize header
    this.header.setCounts(
      this.runeBlocks.length,
      this.runeBlocks.length, // tiles = runes for now
      this.tensorBank.length,
      this.latentBank.length,
      this.runeBlocks.length
    );
    this.header.setFlags(true, true, false, true); // compressed, quantized, no encrypt, has vision

    const headerBuffer = this.header.toBuffer();

    // Build graph CSR
    const graphBuffer = this.buildGraphCSR();

    // Serialize metadata
    const metadataBuffer = Buffer.from(JSON.stringify(this.metadata), 'utf8');

    // Combine all sections
    const runeBlocksBuffer = Buffer.concat(this.runeBlocks.map(rb => rb.toBuffer()));

    const cartridge = Buffer.concat([
      this.header.toBuffer(),
      runeBlocksBuffer,
      this.tileAtlas,
      this.tensorBank,
      this.latentBank,
      graphBuffer,
      metadataBuffer,
      this.visualCard
    ]);

    // Pad to 4096-byte alignment
    const padding = (4096 - (cartridge.length % 4096)) % 4096;
    const paddedCartridge = Buffer.concat([cartridge, Buffer.alloc(padding)]);

    await fs.writeFile(outputPath, paddedCartridge);
    console.log(`✅ CH-ROM97 cartridge built: ${outputPath}`);
    console.log(`   Size: ${paddedCartridge.length} bytes`);
    console.log(`   Runes: ${this.runeBlocks.length}`);
    console.log(`   Tiles: ${this.tileAtlas.length / TILE_SIZE}`);
  }

  // Helper: Convert Float32 to FP16 (simplified)
  float32ToFp16(floatArray) {
    const buf = Buffer.alloc(floatArray.length * 2);
    for (let i = 0; i < floatArray.length; i++) {
      // Simplified FP16 conversion (IEEE 754 half precision)
      const f32 = floatArray[i];
      const sign = f32 < 0 ? 1 : 0;
      const abs = Math.abs(f32);
      const exp = Math.floor(Math.log2(abs)) + 15;
      const mant = Math.round((abs / Math.pow(2, exp - 15)) * 1024);

      const fp16 = (sign << 15) | ((exp & 0x1F) << 10) | (mant & 0x3FF);
      buf.writeUInt16LE(fp16, i * 2);
    }
    return buf;
  }

  // Helper: Pack INT4 array (2 values per byte)
  packInt4(intArray) {
    const buf = Buffer.alloc(Math.ceil(intArray.length / 2));
    for (let i = 0; i < intArray.length; i += 2) {
      const val1 = intArray[i] & 0xF;
      const val2 = (intArray[i + 1] || 0) & 0xF;
      buf[Math.floor(i / 2)] = (val2 << 4) | val1;
    }
    return buf;
  }

  // Build CSR graph representation
  buildGraphCSR() {
    // Simple implementation - each node connects to next (for demo)
    const offsets = [];
    const edges = [];

    let offset = 0;
    for (let i = 0; i < this.runeBlocks.length; i++) {
      offsets.push(offset);
      // Connect to next node (circular)
      edges.push((i + 1) % this.runeBlocks.length);
      offset++;
    }
    offsets.push(offset); // Final offset

    const offsetsBuf = Buffer.alloc(offsets.length * 4);
    const edgesBuf = Buffer.alloc(edges.length * 4);

    for (let i = 0; i < offsets.length; i++) {
      offsetsBuf.writeUInt32LE(offsets[i], i * 4);
    }
    for (let i = 0; i < edges.length; i++) {
      edgesBuf.writeUInt32LE(edges[i], i * 4);
    }

    return Buffer.concat([offsetsBuf, edgesBuf]);
  }
}

// CH-ROM97 Cartridge Reader
class CHR97Reader {
  constructor(cartridgePath) {
    this.path = cartridgePath;
    this.header = null;
    this.data = null;
  }

  async load() {
    this.data = await fs.readFile(this.path);
    this.header = this.parseHeader();
    return this.header;
  }

  parseHeader() {
    if (this.data.length < HEADER_SIZE) {
      throw new Error('Invalid CH-ROM97 cartridge: too small');
    }

    const magic = this.data.subarray(0, 8);
    if (!magic.equals(CHR97_MAGIC)) {
      throw new Error('Invalid CH-ROM97 magic header');
    }

    return {
      version: this.data.readUInt16LE(8),
      flags: this.data.readUInt16LE(10),
      runeCount: this.data.readUInt16LE(12),
      tileCount: this.data.readUInt16LE(14),
      tensorSize: this.data.readUInt32LE(16),
      latentSize: this.data.readUInt32LE(20),
      graphNodeCount: this.data.readUInt32LE(24),
      manifoldDim: this.data.readUInt8(28)
    };
  }

  getRuneBlocks() {
    const start = HEADER_SIZE;
    const blockSize = 36; // Size of CHR97RuneBlock
    const blocks = [];

    for (let i = 0; i < this.header.runeCount; i++) {
      const offset = start + (i * blockSize);
      const blockBuf = this.data.subarray(offset, offset + blockSize);
      blocks.push(CHR97RuneBlock.fromBuffer(blockBuf));
    }

    return blocks;
  }

  getTileAtlas() {
    const start = HEADER_SIZE + (this.header.runeCount * 36);
    const size = this.header.tileCount * TILE_SIZE;
    return this.data.subarray(start, start + size);
  }

  getTensorBank() {
    const start = HEADER_SIZE + (this.header.runeCount * 36) + (this.header.tileCount * TILE_SIZE);
    return this.data.subarray(start, start + this.header.tensorSize);
  }

  getLatentBank() {
    const start = HEADER_SIZE + (this.header.runeCount * 36) + (this.header.tileCount * TILE_SIZE) + this.header.tensorSize;
    return this.data.subarray(start, start + this.header.latentSize);
  }

  getGraphLinks() {
    const start = HEADER_SIZE + (this.header.runeCount * 36) + (this.header.tileCount * TILE_SIZE) +
                  this.header.tensorSize + this.header.latentSize;

    // Parse CSR format
    const offsets = [];
    const edges = [];

    let offset = start;
    for (let i = 0; i <= this.header.graphNodeCount; i++) {
      offsets.push(this.data.readUInt32LE(offset));
      offset += 4;
    }

    const edgeCount = offsets[offsets.length - 1];
    for (let i = 0; i < edgeCount; i++) {
      edges.push(this.data.readUInt32LE(offset));
      offset += 4;
    }

    return { offsets, edges };
  }

  getMetadata() {
    // Find metadata section (after graph links)
    let offset = HEADER_SIZE + (this.header.runeCount * 36) + (this.header.tileCount * TILE_SIZE) +
                 this.header.tensorSize + this.header.latentSize;

    // Skip graph (offsets + edges)
    offset += (this.header.graphNodeCount + 1) * 4; // offsets
    const graphEdges = this.getGraphLinks().offsets[this.header.graphNodeCount];
    offset += graphEdges * 4; // edges

    // Find null terminator for JSON
    let end = offset;
    while (end < this.data.length && this.data[end] !== 0) {
      end++;
    }

    const metadataStr = this.data.subarray(offset, end).toString('utf8');
    return JSON.parse(metadataStr);
  }

  getVisualCard() {
    // Everything after metadata
    let offset = HEADER_SIZE + (this.header.runeCount * 36) + (this.header.tileCount * TILE_SIZE) +
                 this.header.tensorSize + this.header.latentSize;

    // Skip graph
    offset += (this.header.graphNodeCount + 1) * 4;
    const graphEdges = this.getGraphLinks().offsets[this.header.graphNodeCount];
    offset += graphEdges * 4;

    // Skip metadata (find null)
    while (offset < this.data.length && this.data[offset] !== 0) {
      offset++;
    }
    offset++; // Skip null

    return this.data.subarray(offset);
  }
}

// Demo: Create a sample CH-ROM97 cartridge
async function createDemoCartridge() {
  console.log('🎮 Building Demo CH-ROM97 Cartridge...');

  const builder = new CHR97Builder();

  // Load manifold data from Python export
  let manifoldData = null;
  try {
    const data = await fs.readFile('manifold_export.json', 'utf8');
    manifoldData = JSON.parse(data);
    console.log('📥 Loaded manifold data from Python export');
  } catch (e) {
    console.log('⚠️ No manifold_export.json found, using random data');
  }

  // Load image topology data
  let imageTopology = null;
  try {
    const data = await fs.readFile('image_topology.json', 'utf8');
    imageTopology = JSON.parse(data);
    console.log('🖼️ Loaded image topology data');
  } catch (e) {
    console.log('⚠️ No image_topology.json found, skipping image topology');
  }

  // Create 26 rune blocks (A-Z)
  for (let i = 0; i < 26; i++) {
    // Generate fake data
    const tileData = Buffer.alloc(TILE_SIZE);
    for (let j = 0; j < TILE_SIZE; j++) {
      tileData[j] = Math.floor(Math.random() * 256); // Random grayscale
    }

    const tensor = new Array(TENSOR_DIM).fill(0).map(() => Math.random());
    const latent = new Array(LATENT_DIM).fill(0).map(() => Math.floor(Math.random() * 16));

    // Use manifold from Python export or generate random
    let manifold, quant4;
    if (manifoldData && i < manifoldData.float_manifold.length) {
      manifold = manifoldData.float_manifold[i];
      quant4 = manifoldData.quantized_manifold[i];
    } else {
      manifold = [
        Math.random() * 2 - 1, // x
        Math.random() * 2 - 1, // y
        Math.random() * 2 - 1, // z
        Math.random() * 2 - 1  // w
      ];
      quant4 = manifold.map(v =>
        Math.max(0, Math.min(255, Math.floor(((v + 1) / 2) * 255)))
      );
    }

    builder.addRune({
      id: i,
      tileIndex: i,
      clusterId: Math.floor(i / 5), // 5 clusters
      manifold,
      quant4,
      graphDegree: 1,
      tensorUuid: BigInt(crypto.randomBytes(8).readBigUInt64LE()),
      tileData,
      tensor,
      latent
    });
  }

  // Set metadata
  builder.setMetadata({
    case_id: "DEMO-CHR97",
    statutes: ["PC 187", "PC 207"],
    pois: ["Demo POI"],
    domain: "Homicide Demo",
    langextract_bag: ["felony", "demo", "glyph"],
    confidence: 0.95
  });

  // Create fake visual card (base64 placeholder)
  const visualCard = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", 'base64');
  builder.setVisualCard(visualCard);

  // Add image topology if available
  if (imageTopology) {
    builder.addImageTopology(imageTopology);
  }

  await builder.build('demo.chr97');
  console.log('✅ Demo cartridge created: demo.chr97');
}

// Demo: Read and inspect cartridge
async function inspectCartridge(path) {
  console.log(`🔍 Inspecting CH-ROM97 cartridge: ${path}`);

  const reader = new CHR97Reader(path);
  const header = await reader.load();

  console.log('📋 Header Info:');
  console.log(`   Version: ${header.version >> 8}.${header.version & 0xFF}`);
  console.log(`   Flags: 0x${header.flags.toString(16)}`);
  console.log(`   Runes: ${header.runeCount}`);
  console.log(`   Tiles: ${header.tileCount}`);
  console.log(`   Tensor Size: ${header.tensorSize} bytes`);
  console.log(`   Latent Size: ${header.latentSize} bytes`);
  console.log(`   Graph Nodes: ${header.graphNodeCount}`);
  console.log(`   Manifold Dim: ${header.manifoldDim}`);

  const metadata = {}; // reader.getMetadata(); // TODO: fix offset calculation
  console.log('📊 Metadata:', metadata);

  const runeBlocks = reader.getRuneBlocks();
  console.log(`🎯 First Rune Block:`, {
    id: runeBlocks[0].runeId,
    tileIndex: runeBlocks[0].tileIndex,
    clusterId: runeBlocks[0].clusterId,
    manifold_float32: runeBlocks[0].manifold,
    manifold_fp16: runeBlocks[0].getManifoldFP16(),
    quant4_spatial_hash: runeBlocks[0].getSpatialHash(),
    graphDegree: runeBlocks[0].graphDegree,
    tensorUuid: runeBlocks[0].tensorUuid.toString()
  });

  console.log('\n🔥 Tensor-Core Integration:');
  console.log('   - Use quant4 for fast GPU spatial lookup (NES/N64 style)');
  console.log('   - Use FP16 manifold for GPU math operations');
  console.log('   - Use float32 manifold for CPU reasoning/AI');
}

// Main execution
if (process.argv[1] && process.argv[1].endsWith('chr97.mjs')) {
  const command = process.argv[2];

  switch (command) {
    case 'build':
      await createDemoCartridge();
      break;
    case 'inspect':
      const path = process.argv[3] || 'demo.chr97';
      await inspectCartridge(path);
      break;
    default:
      console.log('Usage:');
      console.log('  node chr97.mjs build     # Create demo cartridge');
      console.log('  node chr97.mjs inspect [path]  # Inspect cartridge');
  }
}

export { CHR97Builder, CHR97Reader, CHR97Header, CHR97RuneBlock, createDemoCartridge, inspectCartridge };
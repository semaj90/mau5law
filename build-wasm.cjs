#!/usr/bin/env node

/**
 * WebAssembly SIMD Build Script
 * Compiles C SIMD operations to WebAssembly for high-performance vector operations
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const { join, dirname } = require('path');

const WASM_DIR = join(__dirname, 'src', 'wasm');
const SRC_FILE = join(WASM_DIR, 'simd_ops.c');
const OUTPUT_FILE = join(WASM_DIR, 'simd_ops.js');

// Check if Emscripten is available
function checkEmscripten() {
  try {
    execSync('emcc --version', { stdio: 'pipe' });
    console.log('✅ Emscripten found');
    return true;
  } catch (error) {
    console.error('❌ Emscripten not found. Please install Emscripten SDK:');
    console.error('   git clone https://github.com/emscripten-core/emsdk.git');
    console.error('   cd emsdk && ./emsdk install latest && ./emsdk activate latest');
    console.error('   source ./emsdk_env.sh');
    return false;
  }
}

// Check if source file exists
function checkSourceFile() {
  if (!existsSync(SRC_FILE)) {
    console.error(`❌ Source file not found: ${SRC_FILE}`);
    return false;
  }
  console.log(`✅ Source file found: ${SRC_FILE}`);
  return true;
}

// Build WebAssembly module
function buildWasm() {
  const emccCommand = [
    'emcc',
    '-O3',
    '-msimd128',
    '-msse4.2',
    '-mavx2',
    '-ffast-math',
    '-flto',
    '-DNDEBUG',
    '-s WASM=1',
    '-s MODULARIZE=1',
    '-s EXPORT_ES6=1',
    '-s ENVIRONMENT="web,node"',
    '-s ALLOW_MEMORY_GROWTH=1',
    '-s INITIAL_MEMORY=67108864',
    '-s MAXIMUM_MEMORY=2147483648',
    '-s EXPORTED_FUNCTIONS="["_vector_dot_product","_cosine_similarity","_batch_cosine_similarity","_euclidean_distance","_batch_euclidean_distance","_normalize_vector","_batch_normalize","_matrix_multiply","_softmax","_score_legal_documents","_top_k_indices","_alloc_float_array","_alloc_int_array","_free_array","_process_embedding_batch","_malloc","_free"]"',
    '-s EXPORTED_RUNTIME_METHODS="["ccall","cwrap","getValue","setValue","UTF8ToString","stringToUTF8","HEAPF32","HEAP32"]"',
    `"${SRC_FILE}"`,
    `-o "${OUTPUT_FILE}"`
  ].join(' ');

  console.log('🔨 Building WebAssembly SIMD module...');
  console.log(`Command: ${emccCommand}`);

  try {
    execSync(emccCommand, { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ WebAssembly SIMD module built successfully!');
    console.log(`📁 Output: ${OUTPUT_FILE}`);
    return true;
  } catch (error) {
    console.error('❌ WebAssembly build failed:', error.message);
    return false;
  }
}

// Main build process
async function main() {
  console.log('🚀 WebAssembly SIMD Build Script');
  console.log('================================');

  if (!checkEmscripten()) {
    process.exit(1);
  }

  if (!checkSourceFile()) {
    process.exit(1);
  }

  if (!buildWasm()) {
    process.exit(1);
  }

  console.log('\n🎉 Build completed successfully!');
  console.log('💡 You can now use the WebAssembly SIMD operations in your application.');
}

// Run the build script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, checkEmscripten, checkSourceFile, buildWasm };
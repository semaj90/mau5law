#!/usr/bin/env node

/**
 * Phase 72: Hardened Svelte-Check JSON Parser
 *
 * Robustly parses svelte-check output, filtering out PostCSS/Vite noise
 * Only accepts well-formed JSON lines with required fields
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function log(msg) {
  console.log(`[phase72-parse] [${new Date().toISOString()}] ${msg}`)
}

/**
 * Robustly parse svelte-check output
 * Filters out PostCSS, Vite, and other noise
 * Only accepts well-formed JSON with required fields
 */
export function parseSvelteCheckOutput(raw) {
  const errors = []
  const lines = raw.split(/\r?\n/)
  let skipped = 0
  let parsed = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) continue

    // Skip non-JSON lines (PostCSS, Vite, etc.)
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      skipped++
      continue
    }

    try {
      const obj = JSON.parse(trimmed)

      // Validate required fields for error object
      if (!obj || typeof obj !== 'object') {
        skipped++
        continue
      }

      // Check for svelte-check error format
      if (obj.type === 'error' && obj.filename && obj.start) {
        const error = {
          file: obj.filename,
          line: obj.start.line ?? 0,
          column: obj.start.character ?? 0,
          code: obj.code ?? 'UNKNOWN',
          message: obj.text ?? '',
          severity: obj.severity === 'error' ? 'error' : 'warning'
        }

        errors.push(error)
        parsed++
      } else {
        skipped++
      }
    } catch (e) {
      // Silently skip unparseable lines
      skipped++
    }
  }

  log(`Parsed ${parsed} errors, skipped ${skipped} lines`)
  return errors
}

/**
 * Run svelte-check and parse output
 */
export async function runSvelteCheckAndParse() {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve, reject) => {
    log('Running svelte-check...')
    const proc = spawn('npx', ['svelte-check', '--output', 'machine'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    proc.on('exit', (code) => {
      if (code !== 0 && code !== 1) {
        return reject(new Error(`svelte-check exited with ${code}: ${stderr}`))
      }

      const errors = parseSvelteCheckOutput(stdout)
      resolve(errors)
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * CLI: Run and output JSON
 */
async function main() {
  try {
    const errors = await runSvelteCheckAndParse()
    console.log(JSON.stringify(errors, null, 2))
    process.exitCode = 0
  } catch (err) {
    console.error(`[phase72-parse] FATAL: ${err.message}`)
    process.exitCode = 1
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                     process.argv[1].endsWith('phase72-svelte-check-parse.mjs')

if (isMainModule) {
  main()
}

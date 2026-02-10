#!/usr/bin/env node
/**
 * OpenClaw Docs Index Status
 */

const fs = require('fs');
const path = require('path');

const INDEX_DIR = path.join(process.env.HOME, '.openclaw/docs-index');
const INDEX_PATH = path.join(INDEX_DIR, 'openclaw-docs.sqlite');
const META_PATH = path.join(INDEX_DIR, 'index-meta.json');

console.log('📊 OpenClaw Docs Index Status\n');

if (!fs.existsSync(META_PATH)) {
  console.log('❌ Index not found');
  console.log('   Run: node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-index.js rebuild');
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));

console.log(`Version: ${meta.version}`);
console.log(`Index type: ${meta.indexType}`);
console.log(`Features: ${meta.features.join(', ')}`);
console.log(`Indexed at: ${meta.indexedAt}`);
console.log(`Files indexed: ${meta.filesIndexed}`);
console.log(`Errors: ${meta.errors}`);
console.log(`Build time: ${meta.buildTimeSeconds}s`);
console.log(`Index path: ${INDEX_PATH}`);

if (fs.existsSync(INDEX_PATH)) {
  const stats = fs.statSync(INDEX_PATH);
  console.log(`Index size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log('\n✅ Index ready');
} else {
  console.log('\n❌ Index file missing');
  process.exit(1);
}

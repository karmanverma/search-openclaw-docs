#!/usr/bin/env node
/**
 * OpenClaw Docs Index Status & Health Check
 */

const fs = require('fs');
const path = require('path');

const INDEX_DIR = path.join(process.env.HOME, '.openclaw/docs-index');
const INDEX_PATH = path.join(INDEX_DIR, 'openclaw-docs.sqlite');
const META_PATH = path.join(INDEX_DIR, 'index-meta.json');

const EMBEDDINGS_ENABLED = process.env.OPENCLAW_DOCS_EMBEDDINGS === 'true';

console.log('📊 OpenClaw Docs Index Status\n');

// Check index exists
if (!fs.existsSync(META_PATH)) {
  console.log('❌ Index not found');
  console.log('   Run: node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-index.js rebuild\n');
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));

// Basic info
console.log(`Files indexed: ${meta.filesIndexed}`);
console.log(`Indexed at: ${meta.indexedAt}`);
console.log(`Build time: ${meta.buildTimeSeconds}s`);

if (fs.existsSync(INDEX_PATH)) {
  const stats = fs.statSync(INDEX_PATH);
  console.log(`Index size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

// Check if docs have been updated since index
const indexDate = new Date(meta.indexedAt);
const now = new Date();
const daysSinceIndex = Math.floor((now - indexDate) / (1000 * 60 * 60 * 24));

if (daysSinceIndex > 7) {
  console.log(`\n⚠️  Index is ${daysSinceIndex} days old - consider rebuilding`);
}

// Search mode
console.log(`\nSearch mode: ${EMBEDDINGS_ENABLED ? '🔗 Hybrid (FTS5 + Vector)' : '📝 FTS5 keyword search (default)'}`);

if (!EMBEDDINGS_ENABLED) {
  console.log('   → No network calls, fully offline');
  console.log('   → Set OPENCLAW_DOCS_EMBEDDINGS=true for vector search');
}

// Check embedding coverage if enabled
if (EMBEDDINGS_ENABLED) {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(INDEX_PATH, { readonly: true });
    const total = db.prepare('SELECT COUNT(*) as c FROM files').get().c;
    const withEmbed = db.prepare('SELECT COUNT(*) as c FROM files WHERE embedding IS NOT NULL').get().c;
    const coverage = Math.round((withEmbed / total) * 100);
    db.close();
    
    console.log(`   Embedding coverage: ${withEmbed}/${total} files (${coverage}%)`);
    
    if (coverage === 0) {
      console.log('   → Rebuild index to add embeddings');
    }
  } catch (e) {
    console.log('   ⚠️  Could not check embedding coverage');
  }
}

// Final status
console.log('\n' + '─'.repeat(40));
if (fs.existsSync(INDEX_PATH) && meta.filesIndexed > 0) {
  console.log('✅ Index ready');
} else {
  console.log('❌ Index needs rebuild');
}

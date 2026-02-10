#!/usr/bin/env node
/**
 * OpenClaw Docs Index Status & Health Check
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const INDEX_DIR = path.join(process.env.HOME, '.openclaw/docs-index');
const INDEX_PATH = path.join(INDEX_DIR, 'openclaw-docs.sqlite');
const META_PATH = path.join(INDEX_DIR, 'index-meta.json');
const DOCS_PATH = '/usr/lib/node_modules/openclaw/docs';

const EMBED_URL = process.env.EMBED_URL || 'http://localhost:8090/v1/embeddings';

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

// Check embedding coverage
let embeddingCoverage = 0;
try {
  const Database = require('better-sqlite3');
  const db = new Database(INDEX_PATH, { readonly: true });
  const total = db.prepare('SELECT COUNT(*) as c FROM files').get().c;
  const withEmbed = db.prepare('SELECT COUNT(*) as c FROM files WHERE embedding IS NOT NULL').get().c;
  embeddingCoverage = Math.round((withEmbed / total) * 100);
  db.close();
  
  console.log(`\nEmbedding coverage: ${withEmbed}/${total} files (${embeddingCoverage}%)`);
  
  if (embeddingCoverage === 0) {
    console.log('   → Using keyword-only search (FTS5)');
  } else if (embeddingCoverage < 100) {
    console.log('   → Hybrid search (some files missing embeddings)');
  } else {
    console.log('   → Full hybrid search available');
  }
} catch (e) {
  console.log('\n⚠️  Could not check embedding coverage');
}

// Check embedding server
console.log(`\nEmbedding server: ${EMBED_URL}`);

const checkEmbedServer = () => {
  return new Promise((resolve) => {
    try {
      const url = new URL(EMBED_URL);
      const req = http.request({
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 3000
      }, (res) => {
        resolve(res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.write(JSON.stringify({ input: 'test', model: 'test' }));
      req.end();
    } catch {
      resolve(false);
    }
  });
};

checkEmbedServer().then(available => {
  if (available) {
    console.log('   → Server responding ✓');
  } else {
    console.log('   → Server not available (keyword-only mode)');
  }
  
  // Final status
  console.log('\n' + '─'.repeat(40));
  if (fs.existsSync(INDEX_PATH) && meta.filesIndexed > 0) {
    console.log('✅ Index ready');
  } else {
    console.log('❌ Index needs rebuild');
  }
});

/**
 * File-Level Indexer
 * Builds SQLite index with FTS5 for keyword search + embeddings for vector rerank
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { extractFileMetadata } = require('./metadata');

const EMBED_URL = process.env.EMBED_URL || 'http://localhost:8090/v1/embeddings';
const EMBED_MODEL = process.env.EMBED_MODEL || 'amazon.titan-embed-text-v2:0';

/**
 * Get embedding from local server or fallback
 */
async function getEmbedding(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      input: text.slice(0, 8000),
      model: EMBED_MODEL
    });
    
    const url = new URL(EMBED_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.data?.[0]?.embedding) {
            resolve(json.data[0].embedding);
          } else {
            reject(new Error('Invalid embedding response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Embedding timeout'));
    });
    req.write(data);
    req.end();
  });
}

/**
 * Find all markdown files recursively
 */
function findMarkdownFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip non-English docs and node_modules
      if (!['zh-CN', 'node_modules', '.git'].includes(entry.name)) {
        findMarkdownFiles(fullPath, files);
      }
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Build the index
 */
async function buildIndex(docsPath, indexPath, options = {}) {
  const { onProgress } = options;
  
  // Ensure directory exists
  const indexDir = path.dirname(indexPath);
  fs.mkdirSync(indexDir, { recursive: true });
  
  // Remove old index
  if (fs.existsSync(indexPath)) {
    fs.unlinkSync(indexPath);
  }
  
  // Load SQLite
  const Database = require('better-sqlite3');
  const db = new Database(indexPath);
  
  // Create tables
  db.exec(`
    -- Main file metadata
    CREATE TABLE files (
      id INTEGER PRIMARY KEY,
      path TEXT UNIQUE,
      rel_path TEXT,
      title TEXT,
      headers TEXT,
      keywords TEXT,
      summary TEXT,
      embedding TEXT
    );
    
    -- FTS5 for fast keyword search
    CREATE VIRTUAL TABLE files_fts USING fts5(
      rel_path,
      title,
      headers,
      keywords,
      summary,
      content='files',
      content_rowid='id',
      tokenize='porter unicode61'
    );
    
    -- Triggers to keep FTS in sync
    CREATE TRIGGER files_ai AFTER INSERT ON files BEGIN
      INSERT INTO files_fts(rowid, rel_path, title, headers, keywords, summary)
      VALUES (new.id, new.rel_path, new.title, new.headers, new.keywords, new.summary);
    END;
    
    CREATE INDEX idx_files_path ON files(path);
  `);
  
  // Find files
  const files = findMarkdownFiles(docsPath);
  
  // Prepare insert
  const insert = db.prepare(`
    INSERT INTO files (path, rel_path, title, headers, keywords, summary, embedding)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  let indexed = 0;
  let errors = 0;
  
  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const relPath = filePath.replace(docsPath + '/', '');
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const meta = extractFileMetadata(content, filePath);
      
      // Get embedding
      let embedding = null;
      try {
        embedding = await getEmbedding(meta.embeddingText);
      } catch (e) {
        // Continue without embedding if fails
        errors++;
      }
      
      insert.run(
        filePath,
        relPath,
        meta.title,
        meta.headers.join(' | '),
        meta.keywords.join(' '),
        meta.summary,
        embedding ? JSON.stringify(embedding) : null
      );
      
      indexed++;
      
      if (onProgress && (i % 20 === 0 || i === files.length - 1)) {
        onProgress({ current: i + 1, total: files.length, indexed, errors });
      }
      
    } catch (e) {
      errors++;
      console.error(`  ❌ ${relPath}: ${e.message}`);
    }
  }
  
  db.close();
  
  return { total: files.length, indexed, errors };
}

module.exports = {
  buildIndex,
  findMarkdownFiles,
  getEmbedding
};

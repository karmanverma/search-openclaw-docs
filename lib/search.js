/**
 * Hybrid Search: FTS5 keyword filter + vector rerank
 * Returns file paths ranked by relevance
 */

const fs = require('fs');
const http = require('http');

const EMBED_URL = process.env.EMBED_URL || 'http://localhost:8090/v1/embeddings';
const EMBED_MODEL = process.env.EMBED_MODEL || 'amazon.titan-embed-text-v2:0';

/**
 * Get query embedding
 */
async function getQueryEmbedding(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      input: text.slice(0, 2000),
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
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Embedding timeout'));
    });
    req.write(data);
    req.end();
  });
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build FTS5 query from natural language
 * Handles special characters and creates OR query
 */
function buildFtsQuery(query) {
  // Extract meaningful terms
  const terms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1)
    .filter(t => !['the', 'a', 'an', 'is', 'are', 'how', 'do', 'i', 'to', 'in', 'on', 'for', 'what', 'why'].includes(t));
  
  if (terms.length === 0) return null;
  
  // Create OR query for broader matches
  return terms.map(t => `"${t}"*`).join(' OR ');
}

/**
 * Search with keyword filter + vector rerank
 */
async function search(indexPath, query, options = {}) {
  const { topK = 3, candidateMultiplier = 5 } = options;
  
  if (!fs.existsSync(indexPath)) {
    throw new Error('Index not found. Run: node docs-index.js rebuild');
  }
  
  const Database = require('better-sqlite3');
  const db = new Database(indexPath, { readonly: true });
  
  // Step 1: FTS5 keyword search for candidates
  const ftsQuery = buildFtsQuery(query);
  let candidates = [];
  
  if (ftsQuery) {
    try {
      candidates = db.prepare(`
        SELECT 
          f.id,
          f.path,
          f.rel_path as rel_path,
          f.title,
          f.headers,
          f.keywords,
          f.summary,
          f.embedding,
          bm25(files_fts, 2.0, 3.0, 2.0, 1.5, 1.0) as bm25_score
        FROM files_fts
        INNER JOIN files f ON files_fts.rowid = f.id
        WHERE files_fts MATCH ?
        ORDER BY bm25_score ASC
        LIMIT ?
      `).all(ftsQuery, topK * candidateMultiplier);
    } catch (e) {
      // FTS query failed, fall back to all files
      candidates = [];
    }
  }
  
  // If FTS returns few results, add more from all files
  if (candidates.length < topK * 2) {
    const allFiles = db.prepare(`
      SELECT id, path, rel_path, title, headers, keywords, summary, embedding
      FROM files
      WHERE id NOT IN (${candidates.map(c => c.id).join(',') || '0'})
      LIMIT ?
    `).all(topK * candidateMultiplier - candidates.length);
    
    candidates = [...candidates, ...allFiles.map(f => ({ ...f, bm25_score: 0 }))];
  }
  
  // Step 2: Vector rerank candidates
  let queryEmbedding = null;
  try {
    queryEmbedding = await getQueryEmbedding(query);
  } catch (e) {
    // Vector search unavailable, use BM25 only
  }
  
  const results = candidates.map(candidate => {
    let vectorScore = 0;
    
    if (queryEmbedding && candidate.embedding) {
      const docEmbedding = JSON.parse(candidate.embedding);
      vectorScore = cosineSimilarity(queryEmbedding, docEmbedding);
    }
    
    // Normalize BM25: more negative = better match
    // -7 is great, -3 is okay, 0 is no match
    // Map to 0-1 scale: -10 → 1.0, 0 → 0.0
    const bm25Normalized = candidate.bm25_score 
      ? Math.min(1, Math.max(0, -candidate.bm25_score / 10))
      : 0;
    
    // Combined score: 60% vector, 40% keyword (when vector available)
    // If no vector, use pure BM25
    const combinedScore = queryEmbedding 
      ? (0.6 * vectorScore + 0.4 * bm25Normalized)
      : bm25Normalized;
    
    // Find matching keywords for explanation
    const queryTerms = query.toLowerCase().split(/\s+/);
    const matchedKeywords = (candidate.keywords || '').split(' ')
      .filter(k => queryTerms.some(qt => k.includes(qt) || qt.includes(k)))
      .slice(0, 5);
    
    return {
      path: candidate.path,
      relPath: candidate.rel_path,
      title: candidate.title,
      summary: candidate.summary,
      matchedKeywords,
      score: combinedScore,
      vectorScore,
      bm25Score: bm25Normalized
    };
  });
  
  // Sort by combined score
  results.sort((a, b) => b.score - a.score);
  
  db.close();
  
  return results.slice(0, topK);
}

/**
 * Format search results for display
 */
function formatResults(results, query) {
  const lines = [];
  
  lines.push(`🔍 Query: ${query}\n`);
  
  if (results.length === 0) {
    lines.push('❌ No matching docs found');
    return lines.join('\n');
  }
  
  // Best match
  const best = results[0];
  lines.push(`🎯 Best match:`);
  lines.push(`   ${best.relPath}`);
  if (best.title) lines.push(`   "${best.title}"`);
  if (best.matchedKeywords.length > 0) {
    lines.push(`   Keywords: ${best.matchedKeywords.join(', ')}`);
  }
  lines.push(`   Score: ${best.score.toFixed(2)}`);
  lines.push('');
  
  // Also relevant
  if (results.length > 1) {
    lines.push(`📄 Also relevant:`);
    for (const result of results.slice(1)) {
      lines.push(`   ${result.relPath} (${result.score.toFixed(2)})`);
      if (result.matchedKeywords.length > 0) {
        lines.push(`      Keywords: ${result.matchedKeywords.join(', ')}`);
      }
    }
    lines.push('');
  }
  
  // Read command
  lines.push(`💡 Read with:`);
  lines.push(`   cat ${best.path}`);
  
  return lines.join('\n');
}

module.exports = {
  search,
  formatResults,
  buildFtsQuery,
  cosineSimilarity
};

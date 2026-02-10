---
name: search-openclaw-docs
description: OpenClaw agent skill for semantic search across OpenClaw documentation. Use when users ask about OpenClaw setup, configuration, troubleshooting, or features. Returns relevant file paths to read.
metadata:
  openclaw:
    emoji: "📚"
    homepage: https://github.com/karmanverma/search-openclaw-docs
    requires:
      bins: ["node"]
    install:
      - id: "deps"
        kind: "npm"
        package: "better-sqlite3"
        label: "Install better-sqlite3 (SQLite bindings)"
    postInstall: "node scripts/docs-index.js rebuild"
---

# OpenClaw Documentation Search

Fast file-centric search for OpenClaw docs. Returns file paths to read, not chunks.

**Default mode:** FTS5 keyword search (no network calls, fully offline)

## Quick Start

```bash
# Search
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "discord requireMention"

# Check index health
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-status.js

# Rebuild (after OpenClaw update)
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-index.js rebuild
```

## When to Use

| User asks... | Action |
|--------------|--------|
| "How do I configure X?" | Search → read file → answer |
| "Why isn't X working?" | Search → read file → diagnose |
| "What does Y do?" | Search → read file → explain |

**Don't use for**: Personal memories, preferences, past decisions → use `memory_search` instead.

## Usage Examples

```bash
# Config question
node scripts/docs-search.js "discord requireMention"

# Troubleshooting  
node scripts/docs-search.js "webhook not working"

# More results
node scripts/docs-search.js "providers" --top=5

# JSON output
node scripts/docs-search.js "heartbeat" --json
```

## Output Format

```
🔍 Query: discord only respond when mentioned
Mode: FTS5 keyword search

🎯 Best match:
   channels/discord.md
   "Discord (Bot API)"
   Keywords: discord, requiremention
   Score: 0.40

📄 Also relevant:
   concepts/groups.md (0.32)

💡 Read with:
   cat /usr/lib/node_modules/openclaw/docs/channels/discord.md
```

## How It Works

**Default (FTS5 only):**
- Fast keyword matching on titles, headers, config keys
- Handles camelCase terms like `requireMention`
- No network calls - fully offline
- Works great for config lookups

## Index Location

- **Index**: `~/.openclaw/docs-index/openclaw-docs.sqlite`
- **Docs**: `/usr/lib/node_modules/openclaw/docs/`

Index is built locally from your OpenClaw version.

## Troubleshooting

### No results / wrong results

```bash
# 1. Check index exists and is healthy
node scripts/docs-status.js

# 2. Rebuild if stale or missing
node scripts/docs-index.js rebuild

# 3. Try exact config terms (camelCase matters)
node scripts/docs-search.js "requireMention"

# 4. Try broader terms
node scripts/docs-search.js "discord"
```

### Index outdated after OpenClaw update

```bash
node scripts/docs-index.js rebuild
```

---

## Optional: Enable Vector Search

> ⚠️ **SECURITY NOTE:** Enabling embeddings sends document content and queries to your configured `EMBED_URL`. Only enable this if you trust your embedding endpoint (e.g., localhost server, your own API).

For improved semantic search, you can optionally enable vector embeddings:

```bash
# Enable embeddings (opt-in)
export OPENCLAW_DOCS_EMBEDDINGS=true
export EMBED_URL="http://localhost:8090/v1/embeddings"
export EMBED_MODEL="text-embedding-3-small"

# Rebuild index with embeddings
node scripts/docs-index.js rebuild
```

**When enabled:**
- Document content is sent to `EMBED_URL` during indexing
- Queries are sent to `EMBED_URL` during search
- Hybrid scoring: 60% vector + 40% keyword

**Recommended only for:**
- Local embedding servers (localhost)
- Self-hosted APIs you control
- Trusted enterprise endpoints

---

## Integration

```javascript
// Use in custom scripts
const { search } = require('./lib/search');
const INDEX = process.env.HOME + '/.openclaw/docs-index/openclaw-docs.sqlite';

const results = await search(INDEX, "discord webhook");
// results[0].path → full path to read
```

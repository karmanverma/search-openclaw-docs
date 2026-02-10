---
name: search-openclaw-docs
description: Semantic search across OpenClaw documentation. Use when users ask about OpenClaw setup, configuration, troubleshooting, or features. Returns relevant file paths to read.
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

## Configuration

### Embedding Server (Optional)

Vector search improves results but is **not required**. Falls back to keyword-only (FTS5) automatically.

```bash
# OpenAI-compatible endpoint
export EMBED_URL="http://localhost:8090/v1/embeddings"
export EMBED_MODEL="text-embedding-3-small"

# Or use OpenAI directly
export EMBED_URL="https://api.openai.com/v1/embeddings"
export EMBED_MODEL="text-embedding-3-small"
export OPENAI_API_KEY="sk-..."
```

### Index Location

- **Index**: `~/.openclaw/docs-index/openclaw-docs.sqlite`
- **Docs**: `/usr/lib/node_modules/openclaw/docs/`

Index is built locally from your OpenClaw version - not shipped with skill.

## Troubleshooting

### No results / wrong results

```bash
# 1. Check index exists and is healthy
node scripts/docs-status.js

# 2. Rebuild if stale or missing
node scripts/docs-index.js rebuild

# 3. Try exact config terms (camelCase matters for keywords)
node scripts/docs-search.js "requireMention"  # better than "require mention"

# 4. Try broader terms
node scripts/docs-search.js "discord"  # instead of "discord bot webhook setup"
```

### Vector search not working

Falls back to FTS5 automatically - still works, just keyword-only.

```bash
# Check embedding server (if configured)
curl -s $EMBED_URL -X POST \
  -H "Content-Type: application/json" \
  -d '{"input":"test","model":"'$EMBED_MODEL'"}' | head -c 200
```

### Index outdated after OpenClaw update

```bash
node scripts/docs-index.js rebuild
```

## How It Works

1. **FTS5 keyword filter** - Fast match on titles, headers, config keys
2. **Vector rerank** - Semantic similarity (if embeddings available)
3. **Hybrid score** - 60% vector + 40% keyword → best results

Indexes 313 files at file level (not chunks) for fast, actionable results.

## Integration

```javascript
// Use in custom scripts
const { search } = require('./lib/search');
const INDEX = process.env.HOME + '/.openclaw/docs-index/openclaw-docs.sqlite';

const results = await search(INDEX, "discord webhook");
// results[0].path → full path to read
// results[0].relPath → relative path for display
```

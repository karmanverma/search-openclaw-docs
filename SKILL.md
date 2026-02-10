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

File-centric retrieval for OpenClaw docs. Finds the RIGHT documentation file(s) quickly using hybrid keyword + vector search.

## How It Works

1. **Keyword filter (FTS5)** - Fast match on titles, headers, config keys
2. **Vector rerank** - Semantic similarity to pick best matches
3. **Returns file paths** - Actual files to read, not chunks

## Usage

### Search Docs
```bash
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "your query"
```

### Examples
```bash
# Config question
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "discord requireMention"

# Troubleshooting
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "webhook not working"

# Feature lookup
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "memory search setup"

# Get more results
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "providers" --top=5

# JSON output (for scripting)
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "heartbeat" --json
```

### Output Format
```
🔍 Query: discord only respond when mentioned

🎯 Best match:
   channels/discord.md
   "Discord (Bot API)"
   Keywords: discord, requiremention
   Score: 0.40

📄 Also relevant:
   concepts/groups.md (0.32)
      Keywords: requiremention, groups

💡 Read with:
   cat /usr/lib/node_modules/openclaw/docs/channels/discord.md
```

### Index Management
```bash
# Check index status
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-status.js

# Rebuild index (after OpenClaw update)
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-index.js rebuild
```

## When to Use

| Situation | Action |
|-----------|--------|
| User asks "How do I configure X?" | Search → read file → answer |
| User asks "Why isn't X working?" | Search → read file → diagnose |
| User asks about OpenClaw features | Search → read file → explain |
| Need config examples | Search → read file → extract |

## Decision Tree

```
User asks about OpenClaw
        ↓
Search docs (this skill)
        ↓
Get 1-3 relevant file paths
        ↓
Read full file(s) with cat
        ↓
Answer from complete context
```

## Architecture

- **313 files** indexed at file level
- **FTS5** for fast keyword matching (titles, headers, config keys, camelCase terms)
- **Vector embeddings** for semantic reranking
- **Hybrid scoring**: 60% vector + 40% keyword

## Index Location

- **Index**: `~/.openclaw/docs-index/openclaw-docs.sqlite`
- **Metadata**: `~/.openclaw/docs-index/index-meta.json`
- **Docs source**: `/usr/lib/node_modules/openclaw/docs/`

## vs memory_search

| This Skill | memory_search |
|------------|---------------|
| OpenClaw docs only | Personal memories |
| File paths | Line snippets |
| Config/troubleshooting | Decisions/preferences |

Never mix docs into memory index!

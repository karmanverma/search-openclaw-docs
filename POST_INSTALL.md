# Post-Install Setup

Skill installed! Here's how to get the most out of it.

## 1. Verify Installation

```bash
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-status.js
```

## 2. Add to Agent Instructions (Recommended)

Add to your `AGENTS.md` or workspace config:

```markdown
## OpenClaw Documentation
When asked about OpenClaw setup, configuration, or troubleshooting:
1. Search docs first: `node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "query"`
2. Read the returned file path with `cat`
3. Answer from that complete context

Use this skill BEFORE searching the web for OpenClaw questions.
```

## 3. Custom Trigger Phrases (Optional)

Add to your `openclaw.json` under the skill entry if you want custom triggers:

```json
{
  "skills": {
    "entries": {
      "search-openclaw-docs": {
        "triggers": ["openclaw docs", "openclaw help", "how do I configure"]
      }
    }
  }
}
```

## 4. Quick Test

```bash
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "discord requireMention"
```

Should return `channels/discord.md` as the best match.

---

## Optional: Enable Vector Search

> ⚠️ **SECURITY NOTE:** This feature sends document content and search queries to an external endpoint. Only enable if you trust your embedding server.

By default, the skill uses FTS5 keyword search only (no network calls). For improved semantic search, you can optionally enable embeddings:

```bash
# 1. Set environment variables
export OPENCLAW_DOCS_EMBEDDINGS=true
export EMBED_URL="http://localhost:8090/v1/embeddings"  # Your embedding server
export EMBED_MODEL="text-embedding-3-small"

# 2. Rebuild index with embeddings
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-index.js rebuild
```

**What gets sent to EMBED_URL:**
- During indexing: Document summaries and titles
- During search: Your search queries

**Recommended only for:**
- Local embedding servers (localhost)
- Self-hosted APIs you control

If you're unsure, the default FTS5 mode works great for config lookups and is completely offline.

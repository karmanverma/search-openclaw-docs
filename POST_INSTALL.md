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

## 4. Configure Embeddings (Optional)

For better semantic search, set up an embedding server:

```bash
export EMBED_URL="http://localhost:8090/v1/embeddings"
export EMBED_MODEL="text-embedding-3-small"
```

Then rebuild the index:
```bash
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-index.js rebuild
```

Without embeddings, the skill still works great using keyword search (FTS5).

---

## Quick Test

```bash
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "discord requireMention"
```

Should return `channels/discord.md` as the best match.

# search-openclaw-docs

📚 Fast semantic search for OpenClaw documentation.

**Returns file paths, not chunks** - find the right doc file quickly, then read the full context.

## Installation

### Via ClawHub (recommended)

```bash
clawhub install search-openclaw-docs
```

### Manual

```bash
cd ~/.openclaw/skills
git clone https://github.com/karmanverma/search-openclaw-docs.git
cd search-openclaw-docs
npm install
node scripts/docs-index.js rebuild
```

## Usage

### Search docs
```bash
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "discord requireMention"
```

### More results
```bash
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "providers" --top=5
```

### JSON output
```bash
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-search.js "heartbeat" --json
```

### Check index status
```bash
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-status.js
```

### Rebuild index (after OpenClaw update)
```bash
node ~/.openclaw/skills/search-openclaw-docs/scripts/docs-index.js rebuild
```

## How It Works

1. **FTS5 keyword search** - Fast match on titles, headers, config keys (including camelCase terms like `requireMention`)
2. **Vector rerank** - Semantic similarity to pick best matches (optional)
3. **Hybrid scoring** - 60% vector + 40% keyword (when embeddings available)

### Without Embeddings

Works great with pure FTS5! The index automatically falls back to keyword-only search if:
- No embedding server configured
- Server not running
- API errors

### With Embeddings (optional)

Set environment variables to use your embedding provider:

```bash
export EMBED_URL="http://localhost:8090/v1/embeddings"
export EMBED_MODEL="text-embedding-3-small"
```

Compatible with any OpenAI-compatible embedding API.

## Index Location

- **Index**: `~/.openclaw/docs-index/openclaw-docs.sqlite`
- **Metadata**: `~/.openclaw/docs-index/index-meta.json`
- **Docs source**: `/usr/lib/node_modules/openclaw/docs/`

Index is built locally from YOUR OpenClaw installation - it's not shipped with the skill since docs are version-specific.

## Example Output

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

## License

MIT

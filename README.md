# search-openclaw-docs

📚 OpenClaw agent skill for semantic search across documentation.

Returns **file paths to read**, not chunks - find the right doc quickly, then get full context.

## Install

### Via ClawHub
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

```bash
# Search docs
node scripts/docs-search.js "discord requireMention"

# Check index health
node scripts/docs-status.js

# Rebuild index (after OpenClaw update)
node scripts/docs-index.js rebuild

# More results
node scripts/docs-search.js "providers" --top=5

# JSON output
node scripts/docs-search.js "heartbeat" --json
```

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

💡 Read with:
   cat /usr/lib/node_modules/openclaw/docs/channels/discord.md
```

## How It Works

1. **FTS5 keyword search** - Fast match on titles, headers, camelCase config keys
2. **Vector rerank** - Semantic similarity (optional, if embedding server available)
3. **Hybrid scoring** - 60% vector + 40% keyword

Works great without embeddings - falls back to pure FTS5 automatically.

## Configuration

### Embedding Server (Optional)

```bash
export EMBED_URL="http://localhost:8090/v1/embeddings"
export EMBED_MODEL="text-embedding-3-small"
```

Compatible with any OpenAI-compatible embedding API.

### Index Location

- **Index**: `~/.openclaw/docs-index/openclaw-docs.sqlite`
- **Docs**: `/usr/lib/node_modules/openclaw/docs/`

Index is built locally from your OpenClaw installation.

## License

MIT

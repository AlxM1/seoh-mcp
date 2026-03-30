# SEOh! MCP Server

Analyze any website's SEO and AI search visibility directly from Claude, Cursor, or any MCP-compatible AI client.

## Tools

| Tool | What it does |
|------|-------------|
| `geo_score` | GEO (Generative Engine Optimization) score — how visible is your site to ChatGPT, Perplexity, Gemini, Claude |
| `seo_audit` | Full SEO audit — title, meta, headings, images, links, content quality |
| `competitor_compare` | Side-by-side comparison of two websites |
| `keyword_analysis` | Keyword density, top terms, stuffing detection, target keyword placement |
| `technical_check` | robots.txt, sitemap, redirects, SSL validation |

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "seoh": {
      "command": "npx",
      "args": ["-y", "seoh-mcp"]
    }
  }
}
```

Then ask Claude: *"What's the GEO score for mywebsite.com?"*

### With your own API key (higher limits)

Get a key at [analysis.seoh.ca](https://analysis.seoh.ca), then:

```json
{
  "mcpServers": {
    "seoh": {
      "command": "npx",
      "args": ["-y", "seoh-mcp"],
      "env": {
        "SEOH_API_KEY": "seoh_your_key_here"
      }
    }
  }
}
```

## Free vs Paid

| | Free (built-in) | Starter ($59.99/mo) | Pro ($109.99/mo) | Agency ($399.99/mo) |
|--|--|--|--|--|
| Analyses/month | 50 | 500 | 2,000 | 10,000 |
| GEO Score | Yes | Yes | Yes | Yes |
| SEO Audit | Yes | Yes | Yes | Yes |
| Competitor Compare | No | Yes | Yes | Yes |
| Bulk Analysis | No | No | Yes | Yes |
| PDF Reports | No | Yes | Yes | Yes |
| Site Crawler | No | No | No | Yes |

## Example Prompts

- "What's the GEO score for shopify.com?"
- "Run an SEO audit on mybusiness.ca"
- "Compare seoh.ca vs semrush.com"
- "Analyze keyword density on this blog post: https://example.com/post"
- "Check the technical SEO for mysite.com — robots.txt, sitemap, redirects"

## About

Built by [SEOh!](https://seoh.ca) — Vancouver's #1 GEO Agency. We help businesses get found on Google and AI search engines.

## License

MIT

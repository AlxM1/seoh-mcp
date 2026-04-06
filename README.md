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
| `schema_validate` | Validate JSON-LD structured data and schema.org markup; checks rich snippet eligibility |
| `serp_preview` | Preview how a page appears in Google search results and social shares (OG, Twitter Card) |
| `site_crawl` | Crawl up to 50 pages of a site; per-page scores, sitewide issues, broken links, sitemap coverage |
| `full_report` | Comprehensive GEO audit — 5 dimensions scored: AI Citability, Schema Readiness, E-E-A-T, Content Structure, Platform Visibility |
| `check_usage` | View your API quota usage and remaining calls for the billing period |

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

### Custom API base URL

If you're running a self-hosted or staging backend:

```json
{
  "mcpServers": {
    "seoh": {
      "command": "npx",
      "args": ["-y", "seoh-mcp"],
      "env": {
        "SEOH_API_KEY": "seoh_your_key_here",
        "SEOH_API_BASE": "https://your-backend.example.com"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SEOH_API_KEY` | Built-in free key (50/month) | Your SEOh! API key from [analysis.seoh.ca](https://analysis.seoh.ca) |
| `SEOH_API_BASE` | `https://analysis.seoh.ca` | API base URL (override for self-hosted installs) |

## Free vs Paid

| | Free (built-in) | Starter ($59.99/mo) | Pro ($109.99/mo) | Agency ($399.99/mo) |
|--|--|--|--|--|
| Analyses/month | 50 | 500 | 2,000 | 10,000 |
| GEO Score | Yes | Yes | Yes | Yes |
| SEO Audit | Yes | Yes | Yes | Yes |
| Full GEO Report | Yes | Yes | Yes | Yes |
| Schema Validate | Yes | Yes | Yes | Yes |
| SERP Preview | Yes | Yes | Yes | Yes |
| Competitor Compare | No | Yes | Yes | Yes |
| Keyword Analysis | No | Yes | Yes | Yes |
| Site Crawl | No | No | No | Yes |
| Bulk Analysis | No | No | Yes | Yes |
| PDF Reports | No | Yes | Yes | Yes |

## Example Prompts

- "What's the GEO score for shopify.com?"
- "Run an SEO audit on mybusiness.ca"
- "Compare seoh.ca vs semrush.com"
- "Analyze keyword density on this blog post: https://example.com/post"
- "Check the technical SEO for mysite.com — robots.txt, sitemap, redirects"
- "Validate the schema markup on https://example.com/product"
- "How does my homepage look in Google search results?"
- "Crawl my entire site and find the biggest SEO issues: https://example.com"
- "Run a full GEO audit on https://example.com — I want all 5 dimensions"
- "How many API calls do I have left this month?"

## Rate Limiting

After each tool call, the server displays your remaining API quota if the backend returns rate-limit headers. You can also call `check_usage` directly to see your current billing-period usage.

## About

Built by [SEOh!](https://seoh.ca) — Vancouver's #1 GEO Agency. We help businesses get found on Google and AI search engines.

## License

MIT

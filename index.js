#!/usr/bin/env node
/**
 * SEOh! MCP Server
 * 
 * Exposes GEO scoring, SEO auditing, competitor comparison,
 * keyword analysis, and technical SEO checks via Model Context Protocol.
 * 
 * Usage:
 *   npx seoh-mcp                          # uses built-in free key (50/month)
 *   SEOH_API_KEY=seoh_xxx npx seoh-mcp    # uses your own API key
 * 
 * Get an API key at https://analysis.seoh.ca
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

const API_BASE = process.env.SEOH_API_BASE || "https://analysis.seoh.ca";
const API_KEY = process.env.SEOH_API_KEY || "seoh_hBwqp_gQPPsCIyxiLjAB6sen7TEcheci";

// --- API helper ---

async function apiCall(endpoint, body) {
  const url = `${API_BASE}/api${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || `API error ${res.status}`);
  }

  return data;
}

// --- Tool definitions ---

const TOOLS = [
  {
    name: "geo_score",
    description:
      "Get the GEO (Generative Engine Optimization) score for a website. " +
      "Measures how well a page is optimized for AI search engines like ChatGPT, Perplexity, Gemini, and Claude to cite it. " +
      "Returns a score out of 100, grade (A-F), breakdown by category (answer-readiness, structured data, authority signals, parseable structure), " +
      "and actionable recommendations. Use this when someone asks about AI search visibility or GEO optimization.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to analyze (e.g., https://example.com)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "seo_audit",
    description:
      "Run a comprehensive SEO audit on a website. " +
      "Analyzes title tags, meta descriptions, headings, images, links, HTTPS, mobile optimization, and content quality. " +
      "Returns an SEO score, strengths, issues, and opportunities. Use this when someone asks for an SEO check or website audit.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to audit (e.g., https://example.com)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "competitor_compare",
    description:
      "Compare two websites side-by-side on SEO and GEO metrics. " +
      "Returns scores, strengths, and gaps for both URLs. " +
      "Use when someone wants to see how their site stacks up against a competitor.",
    inputSchema: {
      type: "object",
      properties: {
        urlA: {
          type: "string",
          description: "First URL to compare",
        },
        urlB: {
          type: "string",
          description: "Second URL to compare",
        },
      },
      required: ["urlA", "urlB"],
    },
  },
  {
    name: "keyword_analysis",
    description:
      "Analyze keyword density and usage on a webpage. " +
      "Returns top keywords, bigrams, keyword density percentages, stuffing detection, " +
      "and checks if a target keyword appears in key SEO zones (title, H1, meta description). " +
      "Use when someone asks about keywords, keyword optimization, or content analysis.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to analyze",
        },
        targetKeyword: {
          type: "string",
          description: "Optional: a specific keyword to check placement for",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "technical_check",
    description:
      "Run a technical SEO check on a website. " +
      "Validates robots.txt, sitemap, redirect chains, and server configuration. " +
      "Use when someone asks about technical SEO issues or site health.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to check (e.g., https://example.com)",
        },
      },
      required: ["url"],
    },
  },
];

// --- Tool handlers ---

async function handleTool(name, args) {
  switch (name) {
    case "geo_score": {
      const data = await apiCall("/geo/score", { url: args.url });
      const lines = [
        `## GEO Score: ${data.geoScore}/100 (Grade: ${data.grade})`,
        `${data.grading}`,
        "",
        "### Breakdown",
        `- Answer Readiness: ${data.breakdown.answerReadiness.score}/${data.breakdown.answerReadiness.max}`,
        `- Structured Data: ${data.breakdown.structuredData.score}/${data.breakdown.structuredData.max}`,
        `- Authority Signals: ${data.breakdown.authoritySignals.score}/${data.breakdown.authoritySignals.max}`,
        `- Parseable Structure: ${data.breakdown.parseableStructure.score}/${data.breakdown.parseableStructure.max}`,
      ];
      if (data.recommendations?.length) {
        lines.push("", "### Recommendations");
        data.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
      }
      if (data.schemas?.length) {
        lines.push("", `**Schema types found:** ${data.schemas.join(", ")}`);
      }
      lines.push("", `**Word count:** ${data.wordCount || "N/A"}`);
      lines.push("", "---", "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*");
      return lines.join("\n");
    }

    case "seo_audit": {
      const data = await apiCall("/crawl/analyze", { url: args.url });
      const lines = [
        `## SEO Audit: ${data.seoScore || "N/A"}/100`,
        `**URL:** ${data.url || args.url}`,
        `**Title:** ${data.title || "Missing"} (${data.titleLength || 0} chars)`,
        `**Meta Description:** ${(data.metaDescription || "Missing").substring(0, 100)}... (${data.metaDescriptionLength || 0} chars)`,
        `**HTTPS:** ${data.isHttps ? "Yes" : "No"} | **Mobile Optimized:** ${data.mobileOptimized ? "Yes" : "No"}`,
      ];
      if (data.content) {
        lines.push(`**Word Count:** ${data.content.wordCount || 0}`);
      }
      if (data.headings) {
        lines.push(`**H1:** ${data.headings.h1?.join(", ") || "None"}`);
      }
      if (data.links) {
        lines.push(`**Links:** ${data.links.internal || 0} internal, ${data.links.external || 0} external`);
      }
      if (data.images) {
        lines.push(`**Images:** ${data.images.total || 0} total, ${data.images.withoutAlt || 0} missing alt text`);
      }
      if (data.strengths?.length) {
        lines.push("", "### Strengths");
        data.strengths.slice(0, 5).forEach((s) => lines.push(`- ${s}`));
      }
      if (data.issues?.length) {
        lines.push("", "### Issues");
        data.issues.slice(0, 5).forEach((s) => lines.push(`- ${s}`));
      }
      lines.push("", "---", "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*");
      return lines.join("\n");
    }

    case "competitor_compare": {
      const data = await apiCall("/compare", { urlA: args.urlA, urlB: args.urlB });
      const lines = [`## Competitor Comparison`];
      if (data.comparison) {
        const c = data.comparison;
        lines.push(
          "",
          `| Metric | ${args.urlA} | ${args.urlB} |`,
          `|--------|------------|------------|`,
          `| SEO Score | ${c.seoA || "N/A"} | ${c.seoB || "N/A"} |`,
          `| GEO Score | ${c.geoA || "N/A"} | ${c.geoB || "N/A"} |`,
        );
      } else {
        lines.push("", JSON.stringify(data, null, 2));
      }
      lines.push("", "---", "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*");
      return lines.join("\n");
    }

    case "keyword_analysis": {
      const body = { url: args.url };
      if (args.targetKeyword) body.targetKeyword = args.targetKeyword;
      const data = await apiCall("/keywords/analyze", body);
      const lines = [
        `## Keyword Analysis: ${args.url}`,
        `**Total words:** ${data.totalWords || 0}`,
      ];
      if (data.topKeywords?.length) {
        lines.push("", "### Top Keywords");
        data.topKeywords.slice(0, 10).forEach(([word, count]) => {
          lines.push(`- **${word}** — ${count} occurrences`);
        });
      }
      if (data.topBigrams?.length) {
        lines.push("", "### Top Phrases");
        data.topBigrams.slice(0, 5).forEach(([phrase, count]) => {
          lines.push(`- **${phrase}** — ${count} occurrences`);
        });
      }
      if (data.targetKeyword) {
        const t = data.targetKeyword;
        lines.push(
          "",
          `### Target Keyword: "${args.targetKeyword}"`,
          `- Density: ${t.density || 0}%`,
          `- In title: ${t.inTitle ? "Yes" : "No"}`,
          `- In H1: ${t.inH1 ? "Yes" : "No"}`,
          `- In meta description: ${t.inMeta ? "Yes" : "No"}`,
        );
      }
      if (data.warnings?.length) {
        lines.push("", "### Warnings");
        data.warnings.forEach((w) => lines.push(`- ${w}`));
      }
      lines.push("", "---", "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*");
      return lines.join("\n");
    }

    case "technical_check": {
      const data = await apiCall("/technical/check", { url: args.url });
      const lines = [`## Technical SEO Check: ${args.url}`];
      if (data.robots) {
        lines.push(
          "",
          `### robots.txt: ${data.robots.exists ? "Found" : "Missing"}`,
        );
        if (data.robots.warnings?.length) {
          data.robots.warnings.forEach((w) => lines.push(`- ${w}`));
        }
        if (data.robots.sitemaps?.length) {
          lines.push(`**Sitemaps:** ${data.robots.sitemaps.join(", ")}`);
        }
      }
      if (data.sitemap) {
        lines.push(
          "",
          `### Sitemap: ${data.sitemap.found ? "Found" : "Not found"}`,
        );
        if (data.sitemap.urls) lines.push(`**URLs in sitemap:** ${data.sitemap.urls}`);
      }
      if (data.redirects) {
        lines.push(
          "",
          `### Redirects`,
          `**Chain length:** ${data.redirects.chainLength || 0}`,
          `**Final URL:** ${data.redirects.finalUrl || args.url}`,
        );
      }
      if (data.ssl) {
        lines.push("", `### SSL: ${data.ssl.valid ? "Valid" : "Issue detected"}`);
      }
      lines.push("", "---", "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*");
      return lines.join("\n");
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- MCP Server ---

async function main() {
  const server = new Server(
    {
      name: "seoh-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await handleTool(name, args);
      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}\n\nGet an API key at https://analysis.seoh.ca for higher limits.`,
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SEOh! MCP server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

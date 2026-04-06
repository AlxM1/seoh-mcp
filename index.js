#!/usr/bin/env node
/**
 * SEOh! MCP Server
 *
 * Exposes GEO scoring, SEO auditing, competitor comparison,
 * keyword analysis, technical SEO checks, schema validation,
 * SERP preview, site crawling, full GEO reports, and usage info
 * via Model Context Protocol.
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

// Stores the last known rate-limit info from any API response
let lastRateLimit = null;

// --- API helpers ---

async function apiCall(endpoint, body) {
  const url = `${API_BASE}/api${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  // Capture rate-limit headers if present
  const remaining = res.headers.get("x-ratelimit-remaining");
  const limit = res.headers.get("x-ratelimit-limit");
  const reset = res.headers.get("x-ratelimit-reset");
  if (remaining !== null || limit !== null) {
    lastRateLimit = { remaining, limit, reset };
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || `API error ${res.status}`);
  }

  return data;
}

async function apiGet(endpoint) {
  const url = `${API_BASE}/api${endpoint}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    signal: AbortSignal.timeout(15000),
  });

  const remaining = res.headers.get("x-ratelimit-remaining");
  const limit = res.headers.get("x-ratelimit-limit");
  const reset = res.headers.get("x-ratelimit-reset");
  if (remaining !== null || limit !== null) {
    lastRateLimit = { remaining, limit, reset };
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || `API error ${res.status}`);
  }

  return data;
}

// Appends rate-limit footer line if info is available
function rateLimitLine() {
  if (!lastRateLimit) return "";
  const parts = [];
  if (lastRateLimit.remaining !== null) parts.push(`${lastRateLimit.remaining} calls remaining`);
  if (lastRateLimit.limit !== null) parts.push(`limit ${lastRateLimit.limit}`);
  if (lastRateLimit.reset !== null) parts.push(`resets ${lastRateLimit.reset}`);
  return parts.length ? `\n> API usage: ${parts.join(" | ")}` : "";
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
  {
    name: "schema_validate",
    description:
      "Validate JSON-LD structured data and schema.org markup on a webpage. " +
      "Checks for valid schemas, missing required fields, and provides a snippet preview. " +
      "Use when someone asks about structured data, schema markup, or rich snippets.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to validate schema markup on (e.g., https://example.com)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "serp_preview",
    description:
      "Preview how a webpage appears in search results (Google SERP) and social media shares. " +
      "Shows title truncation, description preview, Open Graph tags, Twitter card data, and readability metrics. " +
      "Use when someone asks about how their site looks in search results or social shares.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to preview (e.g., https://example.com)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "site_crawl",
    description:
      "Crawl an entire website (up to 50 pages) and analyze SEO across all pages. " +
      "Returns per-page scores, sitewide issues, broken links, and a sitemap analysis. " +
      "Use for comprehensive site audits beyond single-page analysis.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The root URL to crawl (e.g., https://example.com)",
        },
        maxPages: {
          type: "number",
          description: "Maximum number of pages to crawl (default: 10, max: 50)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "full_report",
    description:
      "Run a comprehensive GEO (Generative Engine Optimization) audit. " +
      "Scores 5 dimensions: AI Citability, Schema Readiness, E-E-A-T Signals, Content Structure, and Platform Visibility. " +
      "Returns overall score, per-dimension breakdown, and prioritized recommendations. " +
      "This is the most thorough analysis available.",
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
    name: "check_usage",
    description:
      "Check your SEOh! API usage — how many calls you've made and how many remain this billing period. " +
      "Use when someone asks about their API quota, remaining credits, or account usage.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
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
      lines.push(rateLimitLine());
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
      lines.push(rateLimitLine());
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
      lines.push(rateLimitLine());
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
      lines.push(rateLimitLine());
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
      lines.push(rateLimitLine());
      lines.push("", "---", "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*");
      return lines.join("\n");
    }

    case "schema_validate": {
      const data = await apiCall("/schema/validate", { url: args.url });
      const lines = [`## Schema Validation: ${args.url}`];

      const schemas = data.schemas || data.schemasFound || [];
      if (schemas.length) {
        lines.push("", `### Found Schemas (${schemas.length})`);
        schemas.forEach((s) => {
          const type = s.type || s["@type"] || "Unknown";
          const valid = s.valid !== undefined ? (s.valid ? "Valid" : "Invalid") : "Unknown";
          lines.push(`- **${type}** — ${valid}`);
          if (s.issues?.length) {
            s.issues.forEach((issue) => lines.push(`  - ${issue}`));
          }
          if (s.missingFields?.length) {
            lines.push(`  - Missing fields: ${s.missingFields.join(", ")}`);
          }
        });
      } else {
        lines.push("", "No structured data found on this page.");
      }

      const issues = data.issues || data.errors || [];
      if (issues.length) {
        lines.push("", "### Validation Issues");
        issues.forEach((issue) => lines.push(`- ${issue}`));
      }

      const warnings = data.warnings || [];
      if (warnings.length) {
        lines.push("", "### Warnings");
        warnings.forEach((w) => lines.push(`- ${w}`));
      }

      if (data.richSnippetEligible !== undefined) {
        lines.push("", `**Rich snippet eligible:** ${data.richSnippetEligible ? "Yes" : "No"}`);
      }

      if (data.snippet) {
        lines.push("", "### Snippet Preview");
        lines.push("```json", JSON.stringify(data.snippet, null, 2).substring(0, 500), "```");
      }

      if (data.recommendations?.length) {
        lines.push("", "### Recommendations");
        data.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
      }

      lines.push(rateLimitLine());
      lines.push("", "---", "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*");
      return lines.join("\n");
    }

    case "serp_preview": {
      const data = await apiCall("/preview/analyze", { url: args.url });
      const lines = [`## SERP Preview: ${args.url}`, ""];

      // Google SERP preview
      lines.push("### Google Search Result");
      const serpTitle = data.serp?.title || data.title || "No title";
      const serpDesc = data.serp?.description || data.metaDescription || "No description";
      const serpUrl = data.serp?.displayUrl || args.url;
      lines.push(
        `**Title:** ${serpTitle}`,
        `**Displayed URL:** ${serpUrl}`,
        `**Description:** ${serpDesc}`,
      );
      if (data.serp?.titleTruncated !== undefined) {
        lines.push(`**Title truncated:** ${data.serp.titleTruncated ? "Yes — too long" : "No — good length"}`);
      }
      if (data.serp?.descriptionTruncated !== undefined) {
        lines.push(`**Description truncated:** ${data.serp.descriptionTruncated ? "Yes — too long" : "No — good length"}`);
      }

      // Open Graph / Social
      const og = data.openGraph || data.og || {};
      if (Object.keys(og).length) {
        lines.push("", "### Open Graph (Facebook / LinkedIn)");
        if (og.title) lines.push(`**og:title:** ${og.title}`);
        if (og.description) lines.push(`**og:description:** ${og.description}`);
        if (og.image) lines.push(`**og:image:** ${og.image}`);
        if (og.type) lines.push(`**og:type:** ${og.type}`);
      }

      // Twitter Card
      const twitter = data.twitterCard || data.twitter || {};
      if (Object.keys(twitter).length) {
        lines.push("", "### Twitter Card");
        if (twitter.card) lines.push(`**card:** ${twitter.card}`);
        if (twitter.title) lines.push(`**title:** ${twitter.title}`);
        if (twitter.description) lines.push(`**description:** ${twitter.description}`);
        if (twitter.image) lines.push(`**image:** ${twitter.image}`);
      }

      // Readability
      if (data.readability) {
        const r = data.readability;
        lines.push("", "### Readability");
        if (r.score !== undefined) lines.push(`**Score:** ${r.score}/100`);
        if (r.grade) lines.push(`**Grade level:** ${r.grade}`);
        if (r.avgSentenceLength) lines.push(`**Avg sentence length:** ${r.avgSentenceLength} words`);
        if (r.fleschKincaid !== undefined) lines.push(`**Flesch-Kincaid:** ${r.fleschKincaid}`);
      }

      if (data.issues?.length) {
        lines.push("", "### Issues");
        data.issues.forEach((issue) => lines.push(`- ${issue}`));
      }

      lines.push(rateLimitLine());
      lines.push("", "---", "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*");
      return lines.join("\n");
    }

    case "site_crawl": {
      const body = { url: args.url };
      if (args.maxPages) body.maxPages = args.maxPages;
      const data = await apiCall("/sitecrawl/crawl", body);
      const lines = [`## Site Crawl: ${args.url}`, ""];

      // Overall stats
      const pagesCrawled = data.pagesCrawled || data.pages?.length || 0;
      const avgScore = data.avgScore || data.averageScore || "N/A";
      lines.push(
        `**Pages crawled:** ${pagesCrawled}`,
        `**Average SEO score:** ${avgScore}`,
      );
      if (data.crawlDuration) lines.push(`**Crawl duration:** ${data.crawlDuration}`);
      if (data.brokenLinks !== undefined) lines.push(`**Broken links:** ${data.brokenLinks}`);
      if (data.uniqueIssues !== undefined) lines.push(`**Unique issues found:** ${data.uniqueIssues}`);

      // Per-page scores (top 10)
      const pages = data.pages || [];
      if (pages.length) {
        lines.push("", "### Page Scores (top 10)");
        lines.push("| URL | Score | Issues |");
        lines.push("|-----|-------|--------|");
        pages.slice(0, 10).forEach((p) => {
          const pageUrl = p.url || "Unknown";
          const score = p.score || p.seoScore || "N/A";
          const issueCount = p.issues?.length || p.issueCount || 0;
          const shortUrl = pageUrl.replace(/^https?:\/\/[^/]+/, "") || "/";
          lines.push(`| ${shortUrl} | ${score} | ${issueCount} |`);
        });
      }

      // Sitewide issues
      const sitewideIssues = data.sitewideIssues || data.topIssues || data.issues || [];
      if (sitewideIssues.length) {
        lines.push("", "### Top Sitewide Issues");
        sitewideIssues.slice(0, 10).forEach((issue) => {
          const msg = typeof issue === "string" ? issue : (issue.message || issue.issue || JSON.stringify(issue));
          const count = issue.count ? ` (${issue.count} pages)` : "";
          lines.push(`- ${msg}${count}`);
        });
      }

      // Sitemap analysis
      if (data.sitemap) {
        lines.push("", "### Sitemap Analysis");
        lines.push(`**Sitemap found:** ${data.sitemap.found ? "Yes" : "No"}`);
        if (data.sitemap.urls) lines.push(`**URLs listed:** ${data.sitemap.urls}`);
        if (data.sitemap.coverage !== undefined) lines.push(`**Crawled coverage:** ${data.sitemap.coverage}%`);
      }

      lines.push(rateLimitLine());
      lines.push("", "---", "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*");
      return lines.join("\n");
    }

    case "full_report": {
      const data = await apiCall("/audit", { url: args.url });
      const lines = [
        `## Full GEO Report: ${args.url}`,
        `**Overall Score:** ${data.overallScore || data.geoScore || "N/A"}/100`,
        "",
      ];

      // 5 dimensions
      const dimensions = data.dimensions || data.breakdown || {};
      const dimMap = [
        ["aiCitability", "AI Citability"],
        ["schemaReadiness", "Schema Readiness"],
        ["eeatSignals", "E-E-A-T Signals"],
        ["contentStructure", "Content Structure"],
        ["platformVisibility", "Platform Visibility"],
      ];

      const hasDimensions = dimMap.some(([key]) => dimensions[key] !== undefined);
      if (hasDimensions) {
        lines.push("### Dimension Scores");
        dimMap.forEach(([key, label]) => {
          const dim = dimensions[key];
          if (!dim) return;
          const score = dim.score !== undefined ? dim.score : dim;
          const max = dim.max !== undefined ? `/${dim.max}` : "";
          const grade = dim.grade ? ` (${dim.grade})` : "";
          lines.push(`- **${label}:** ${score}${max}${grade}`);
          if (dim.notes) lines.push(`  - ${dim.notes}`);
        });
        lines.push("");
      }

      if (data.grade) lines.push(`**Grade:** ${data.grade}`);
      if (data.summary) lines.push("", `### Summary`, data.summary);

      const recommendations = data.recommendations || data.prioritizedRecommendations || [];
      if (recommendations.length) {
        lines.push("", "### Prioritized Recommendations");
        recommendations.forEach((r, i) => {
          const text = typeof r === "string" ? r : (r.text || r.recommendation || JSON.stringify(r));
          const priority = r.priority ? ` [${r.priority}]` : "";
          lines.push(`${i + 1}. ${text}${priority}`);
        });
      }

      if (data.strengths?.length) {
        lines.push("", "### Strengths");
        data.strengths.slice(0, 5).forEach((s) => lines.push(`- ${s}`));
      }

      if (data.issues?.length) {
        lines.push("", "### Issues");
        data.issues.slice(0, 5).forEach((s) => lines.push(`- ${s}`));
      }

      lines.push(rateLimitLine());
      lines.push("", "---", "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*");
      return lines.join("\n");
    }

    case "check_usage": {
      let data;
      try {
        data = await apiGet("/account/usage");
      } catch (err) {
        // Fallback: display cached rate-limit info if API call fails
        if (lastRateLimit) {
          const lines = [
            "## API Usage (cached from last call)",
            `**Remaining calls:** ${lastRateLimit.remaining || "Unknown"}`,
            `**Monthly limit:** ${lastRateLimit.limit || "Unknown"}`,
            `**Resets:** ${lastRateLimit.reset || "Unknown"}`,
            "",
            "---",
            "*Powered by [SEOh!](https://seoh.ca) — Vancouver's GEO Agency*",
          ];
          return lines.join("\n");
        }
        throw err;
      }

      const lines = ["## API Usage"];
      if (data.plan) lines.push(`**Plan:** ${data.plan}`);
      if (data.callsUsed !== undefined) lines.push(`**Calls used this period:** ${data.callsUsed}`);
      if (data.callsRemaining !== undefined) lines.push(`**Calls remaining:** ${data.callsRemaining}`);
      if (data.callsLimit !== undefined) lines.push(`**Monthly limit:** ${data.callsLimit}`);
      if (data.resetDate || data.periodEnd) lines.push(`**Period resets:** ${data.resetDate || data.periodEnd}`);
      if (data.percentUsed !== undefined) lines.push(`**Used:** ${data.percentUsed}%`);

      if (!data.plan && !data.callsUsed && !data.callsRemaining) {
        lines.push("", JSON.stringify(data, null, 2));
      }

      lines.push(rateLimitLine());
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
      version: "1.1.0",
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

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync } from "fs";

const GSTACK_DIR = process.env.GSTACK_DIR || "E:\\gstack";

const SKILLS = [
  { name: "review", description: "Pre-landing PR review. Analyzes diff for SQL safety, LLM trust boundaries, conditional side effects." },
  { name: "qa", description: "Systematic QA testing of a web app. Finds bugs, fixes them atomically, re-verifies. Tiers: quick, standard, exhaustive." },
  { name: "cso", description: "Chief Security Officer — security audit. Modes: daily (zero-noise, 8/10 gate) or comprehensive (deep scan)." },
  { name: "browse", description: "Fast headless browser for QA. Navigate URLs, interact, screenshot, test responsive layouts." },
  { name: "office-hours", description: "YC Office Hours. Startup mode (6 forcing questions) or Builder mode (brainstorming)." },
  { name: "plan-ceo-review", description: "CEO/Founder strategic review. Rethink problem, find 10x product. Modes: expansion, selective, hold, reduction." },
  { name: "plan-eng-review", description: "Engineering architecture review. Data flow, state machines, test matrix, edge cases." },
  { name: "investigate", description: "Systematic root-cause debugging. No fixes without investigation. Tests hypotheses." },
  { name: "design-review", description: "Designer Who Codes — visual audit + fixes. Before/after screenshots, atomic commits." },
  { name: "ship", description: "Release engineering. Sync main, run tests, audit coverage, push, open PR." },
  { name: "retro", description: "Weekly engineering retrospective. Per-person breakdowns, shipping streaks, test health." },
  { name: "plan-design-review", description: "Senior Designer review. Rates 0-10 per dimension, AI slop detection, actionable edits." },
  { name: "plan-devex-review", description: "Developer Experience review. Persona analysis, TTHW benchmarking, friction tracing." },
  { name: "learn", description: "Persistent memory. Manage project patterns, pitfalls, preferences across sessions." },
  { name: "land-and-deploy", description: "Merge PR, wait for CI, deploy, verify production health." },
  { name: "document-release", description: "Update all project docs to match shipped changes. Diataxis coverage map." },
  { name: "document-generate", description: "Generate missing docs from scratch using Diataxis framework." },
  { name: "design-shotgun", description: "Generate 4-6 AI mockup variants, open comparison board, iterate." },
  { name: "design-consultation", description: "Build design system from scratch. Research landscape, propose creative risks, generate mockups." },
  { name: "setup-browser-cookies", description: "Import cookies from real browser into headless session for authenticated pages." },
  { name: "benchmark", description: "Baseline page load times, Core Web Vitals, resource sizes. Before/after comparison." },
  { name: "canary", description: "Post-deploy monitoring. Watches for console errors, performance regressions." },
];

function loadSkill(name) {
  const dir = `${GSTACK_DIR}/${name}`;
  const paths = [
    `${dir}/SKILL.md`,
    `${dir}/SKILL.md.tmpl`,
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        return readFileSync(p, "utf-8");
      } catch { }
    }
  }
  return null;
}

function skillToSchema(skill) {
  const toolName = skill.name.replace(/-/g, "_");
  const params = {
    type: "object",
    properties: {},
    required: [],
  };

  switch (skill.name) {
    case "review":
      params.properties.branch = { type: "string", description: "Branch to review (defaults to current)" };
      break;
    case "qa":
      params.properties.url = { type: "string", description: "URL to QA test" };
      params.properties.tier = { type: "string", enum: ["quick", "standard", "exhaustive"], description: "QA depth tier" };
      params.required = ["url"];
      break;
    case "cso":
      params.properties.mode = { type: "string", enum: ["daily", "comprehensive"], description: "Audit depth" };
      break;
    case "browse":
      params.properties.url = { type: "string", description: "URL to navigate to" };
      params.properties.action = { type: "string", description: "Action to perform (navigate, screenshot, click, fill)" };
      params.properties.selector = { type: "string", description: "CSS selector for interaction" };
      params.properties.value = { type: "string", description: "Value for fill actions" };
      break;
    case "office-hours":
      params.properties.mode = { type: "string", enum: ["startup", "builder"], description: "Office hours mode" };
      params.properties.idea = { type: "string", description: "The product idea or problem to discuss" };
      break;
    case "investigate":
      params.properties.issue = { type: "string", description: "The bug or issue description" };
      params.required = ["issue"];
      break;
    case "ship":
      params.properties.branch = { type: "string", description: "Branch to ship" };
      break;
    case "plan-ceo-review":
    case "plan-eng-review":
    case "plan-design-review":
    case "plan-devex-review":
      params.properties.prompt = { type: "string", description: "Plan or feature description to review" };
      params.required = ["prompt"];
      break;
    case "design-review":
      params.properties.target = { type: "string", description: "What to review (url, file path, or description)" };
      break;
    case "retro":
      params.properties.scope = { type: "string", enum: ["local", "global"], description: "Retrospective scope" };
      break;
    case "learn":
      params.properties.action = { type: "string", enum: ["save", "search", "list"], description: "Memory action" };
      params.properties.content = { type: "string", description: "What to learn or search query" };
      break;
    case "design-shotgun":
      params.properties.brief = { type: "string", description: "Design brief for mockup generation" };
      params.required = ["brief"];
      break;
    case "design-consultation":
      params.properties.brief = { type: "string", description: "Design system requirements" };
      params.required = ["brief"];
      break;
    case "document-release":
    case "document-generate":
      params.properties.target = { type: "string", description: "File or feature to document" };
      break;
    case "land-and-deploy":
      params.properties.pr_url = { type: "string", description: "PR URL to merge and deploy" };
      break;
    case "benchmark":
      params.properties.url = { type: "string", description: "URL to benchmark" };
      break;
    case "canary":
      params.properties.url = { type: "string", description: "Deployment URL to monitor" };
      break;
    case "setup-browser-cookies":
      params.properties.browser = { type: "string", enum: ["chrome", "arc", "brave", "edge"], description: "Source browser" };
      break;
  }

  return {
    name: toolName,
    description: skill.description,
    inputSchema: params,
  };
}

function createToolResult(skillName, skillContent, args) {
  if (!skillContent) {
    return {
      content: [{ type: "text", text: `Skill "${skillName}" not found in gstack at ${GSTACK_DIR}` }],
      isError: true,
    };
  }

  const sections = [];
  const lines = skillContent.split("\n");
  let currentSection = "frontmatter";
  let sectionLines = [];

  for (const line of lines) {
    if (line.startsWith("---") && currentSection === "frontmatter") {
      if (sectionLines.length > 0) {
        sections.push(["frontmatter", sectionLines.join("\n")]);
        sectionLines = [];
      }
      currentSection = "body";
      continue;
    }
    if (line.startsWith("## ")) {
      if (sectionLines.length > 0) {
        sections.push([currentSection, sectionLines.join("\n")]);
        sectionLines = [];
      }
      currentSection = line.replace("## ", "").trim();
      sectionLines.push(line);
      continue;
    }
    sectionLines.push(line);
  }
  if (sectionLines.length > 0) {
    sections.push([currentSection, sectionLines.join("\n")]);
  }

  const argsText = args && Object.keys(args).length > 0
    ? `\n## Invoked with arguments\n\`\`\`json\n${JSON.stringify(args, null, 2)}\n\`\`\`\n`
    : "";

  const fullContent = `# gstack skill: ${skillName}\n${argsText}\n${skillContent}`;

  return {
    content: [
      { type: "text", text: fullContent },
    ],
  };
}

async function main() {
  const server = new Server(
    { name: "gstack-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: SKILLS.map(skillToSchema),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments || {};
    const skillName = toolName.replace(/_/g, "-");
    const skillContent = loadSkill(skillName);

    if (!skillContent) {
      return createToolResult(skillName, null, args);
    }

    return createToolResult(skillName, skillContent, args);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("gstack-mcp error:", err);
  process.exit(1);
});

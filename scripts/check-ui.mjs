#!/usr/bin/env node
/**
 * UI guard: fails the build when screens invent their own styling instead of using src/ui.
 * Run: node scripts/check-ui.mjs   (add to package.json as "check:ui" and to CI)
 *
 * Scans app/ and src/ (except src/ui/, which is the design kit itself).
 * Only the owner may change this file.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN = ["app", "src"];
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build"]);
const KIT_DIR = join("src", "ui") + sep;
const EXT = /\.(tsx|ts|jsx|js|css|scss)$/;

const RULES = [
  // Hex colors only where styling happens (so "Load #1042" in text is fine).
  { id: "hex-color", re: /#[0-9a-fA-F]{3,8}\b(?![\w-])/g, when: (line, file) => file.endsWith(".css") || /(className|class=|color|fill|stroke|background|border)/.test(line), why: "Raw hex color. Use a token class (bg-surface, text-text-muted, ...) or a kit component." },
  { id: "rgb-color", re: /\b(rgb|rgba|hsl|hsla|oklch)\(/g, why: "Raw color function. Use tokens from src/ui/theme.css." },
  { id: "inline-style", re: /style=\{\{/g, why: "Inline style. Use kit components and token classes." },
  { id: "arbitrary-value", re: /\b[a-z-]+-\[[^\]]+\]/g, why: "Arbitrary Tailwind value like text-[13px] or bg-[#123]. Use the token scale or a kit component." },
  { id: "gradient", re: /gradient/gi, why: "Gradients are banned by the design system." },
  { id: "shadow", re: /\b(shadow|drop-shadow|backdrop-blur|blur)(-[a-z0-9]+)?\b/g, why: "Shadows and blur are banned. Use hairline borders (border-border)." },
  { id: "animation", re: /\banimate-(?!spin\b)[a-z-]+/g, why: "Decorative animation. Only animate-spin (loading) is allowed." },
  { id: "raw-control", re: /<(button|select|textarea|table)\b|<input\b(?![^>]*type=["']file)/g, why: "Raw form control or table. Use Button, Input, Select, Textarea or DataTable from src/ui." },
  { id: "ui-library", re: /from\s+["'](@radix-ui|@headlessui|@mui|antd|@chakra-ui|lucide-react|react-icons|framer-motion|@\/components\/ui)[^"']*["']/g, why: "Outside UI library. Screens use src/ui only (icons from src/ui/icons)." },
  { id: "emoji", re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, why: "Emoji are banned in the UI." },
];

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.test(name)) out.push(p);
  }
}

const files = [];
for (const d of SCAN) walk(join(ROOT, d), files);

let problems = 0;
for (const file of files) {
  const rel = relative(ROOT, file);
  if (rel.startsWith(KIT_DIR)) continue;
  // globals.css only imports tailwind and the theme
  if (rel.endsWith("globals.css")) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments
    for (const rule of RULES) {
      if (rule.when && !rule.when(line, rel)) continue;
      rule.re.lastIndex = 0;
      const m = rule.re.exec(line);
      if (m) {
        problems++;
        console.error(`${rel}:${i + 1}  [${rule.id}] "${m[0]}"  ${rule.why}`);
      }
    }
  });
}

if (problems) {
  console.error(`\nUI guard: ${problems} problem(s). Screens must be built from src/ui components and tokens only (see design/README.md).`);
  process.exit(1);
}
console.log(`UI guard: ${files.length} files checked, no problems.`);

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", ".next", "node_modules", "dist", "coverage"]);
const markdownFiles = [];
const failures = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) {
      continue;
    }
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (entry.endsWith(".md")) {
      markdownFiles.push(fullPath);
    }
  }
}

function lineForOffset(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function stripInlineMarkdown(value) {
  return value
    .replace(/<a\s+id=["']([^"']+)["']><\/a>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}

function githubSlug(value) {
  return stripInlineMarkdown(value)
    .toLowerCase()
    .trim()
    .replace(/\s/g, "-")
    .replace(/[^\p{Letter}\p{Number}_-]/gu, "");
}

function anchorsFor(content) {
  const anchors = new Set();
  const seen = new Map();

  for (const match of content.matchAll(/<a\s+id=["']([^"']+)["']><\/a>/gi)) {
    anchors.add(match[1]);
  }

  for (const line of content.split("\n")) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!heading) {
      continue;
    }
    const base = githubSlug(heading[2]);
    if (!base) {
      continue;
    }
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

function validateFences(file, content) {
  let currentFence = null;
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const fence = /^(```+|~~~+)/.exec(line);
    if (!fence) {
      return;
    }
    const marker = fence[1][0];
    const length = fence[1].length;
    if (!currentFence) {
      currentFence = { marker, length, line: index + 1 };
      return;
    }
    if (currentFence.marker === marker && length >= currentFence.length) {
      currentFence = null;
    }
  });

  if (currentFence) {
    failures.push(`${relative(file)}:${currentFence.line} has an unclosed code fence`);
  }
}

function parseLinkTarget(rawTarget) {
  const trimmed = rawTarget.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || /^(mailto|tel):/i.test(trimmed)) {
    return null;
  }
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1);
  }
  return trimmed.split(/\s+/)[0];
}

function validateLinks(file, content, anchorCache) {
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(linkPattern)) {
    const target = parseLinkTarget(match[1]);
    if (!target) {
      continue;
    }

    const [targetPath, anchor] = target.split("#");
    const resolvedPath = targetPath
      ? path.resolve(path.dirname(file), decodeURIComponent(targetPath))
      : file;

    if (targetPath && !existsSync(resolvedPath)) {
      failures.push(`${relative(file)}:${lineForOffset(content, match.index)} links to missing file ${target}`);
      continue;
    }

    if (!anchor) {
      continue;
    }

    if (!resolvedPath.endsWith(".md")) {
      continue;
    }

    if (!anchorCache.has(resolvedPath)) {
      anchorCache.set(resolvedPath, anchorsFor(readFileSync(resolvedPath, "utf8")));
    }
    if (!anchorCache.get(resolvedPath).has(anchor)) {
      failures.push(`${relative(file)}:${lineForOffset(content, match.index)} links to missing anchor ${target}`);
    }
  }
}

function validateMermaid(file, content) {
  const mermaidBlocks = content.matchAll(/```mermaid\n([\s\S]*?)```/g);
  for (const match of mermaidBlocks) {
    const block = match[1];
    const line = lineForOffset(content, match.index);
    const legacyDottedLabel = /\s-\.\s+.+\s+\.->/.test(block);
    if (legacyDottedLabel) {
      failures.push(`${relative(file)}:${line} uses legacy Mermaid dotted-edge label syntax`);
    }
    const nonAscii = [...new Set([...block].filter((character) => character.charCodeAt(0) > 127))];
    if (nonAscii.length > 0) {
      failures.push(`${relative(file)}:${line} has non-ASCII Mermaid characters: ${nonAscii.join("")}`);
    }
  }
}

function relative(file) {
  return path.relative(root, file);
}

walk(root);

const anchorCache = new Map();
for (const file of markdownFiles) {
  const content = readFileSync(file, "utf8");
  validateFences(file, content);
  validateLinks(file, content, anchorCache);
  validateMermaid(file, content);
}

if (failures.length > 0) {
  console.error("Documentation check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Documentation check passed (${markdownFiles.length} Markdown files).`);

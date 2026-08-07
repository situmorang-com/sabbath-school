#!/usr/bin/env node
// Publish a teacher's guide from skills-sermon-adventist to ss.situmorang.com.
//
// The source file is a self-contained teachers-guide.html rendered by the
// sabbath-school-lesson skill. This script strips the Verification Ledger
// (teacher-only research scaffolding), adds the site footer, writes the guide
// as both the homepage and a dated archive entry, rebuilds the archive index,
// then commits and pushes. GitHub Pages serves the result.
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const SITE = "https://ss.situmorang.com";
const FOOTER_MARK = "data-site-footer";
const LAI_ATTRIBUTION = "Dikutip dari ALKITAB (TB) © LAI 1974.";
const LAI_SOURCE = { label: "Alkitab Mobile SABDA - TB", url: "https://alkitab.mobi/tb/" };

// Guides carry a para_id in every EGW citation note and in the Appendix B
// table, not only in the ledger. It is an egwwritings locator rather than
// anything private, but it is API plumbing on a public devotional page, so
// scrub the locator and keep the human citation around it. Two forms occur:
//   <em>Acts of the Apostles</em>, hlm. 318.2 (para_id 127.1407)  -> ", hlm. 318.2"
//   <td><em>Complete Commentary</em>, hlm. 1076.2, para_id 14192.30685</td>
// A bare prose mention ("diambil verbatim ... dengan para_id-nya") is neither,
// and is deliberately left for a human — see assertNoLeaks.
const PARA_ID_LOCATOR = /\s*(?:\(\s*para_id[^)]*\)|,\s*para_id\s+[\d.]+)/gi;

// Anything that must never reach a public page. Checked after stripping and
// scrubbing, so a hit here means the ledger moved or leaked.
const LEAK_PATTERNS = [
  [/para_id/i, "para_id reference"],
  [/\bHTTP\s+\d{3}\b/i, "HTTP status code"],
  [/id="ledger"/i, "ledger anchor"],
  [/<code>\s*(fetched-verbatim|paraphrased|unverified|reconstructed)\s*<\/code>/i, "provenance tag"]
];

function usage() {
  return `Usage:
  node scripts/publish-guide.mjs <path-to-teachers-guide.html> [options]

Options:
  --slug <slug>   Archive slug. Default: source folder name with "-ss-" collapsed
                  (2026-08-08-ss-karunia-karunia-roh -> 2026-08-08-karunia-karunia-roh)
  --keep-ledger   Publish the Verification Ledger too. Off by default: the site
                  is public and the ledger is teacher-only working material.
  --no-push       Commit locally without pushing.
  --dry-run       Report what would change. Writes nothing, commits nothing.
`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("--help")) {
    console.log(usage());
    process.exit(args.length === 0 ? 1 : 0);
  }
  const source = args.find((arg) => !arg.startsWith("--"));
  if (!source) {
    console.error("A path to teachers-guide.html is required.\n");
    console.log(usage());
    process.exit(1);
  }
  const slugIndex = args.indexOf("--slug");
  return {
    source: path.resolve(process.cwd(), source),
    slug: slugIndex === -1 ? null : args[slugIndex + 1],
    keepLedger: args.includes("--keep-ledger"),
    push: !args.includes("--no-push"),
    dryRun: args.includes("--dry-run")
  };
}

function git(...args) {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

// The source folder is named for the Sabbath it is taught. The "-ss-" marker
// keeps Sabbath School output separate from a sermon on the same date; the
// public URL does not need it.
function deriveSlug(sourcePath) {
  return path.basename(path.dirname(sourcePath)).replace(/-ss-/, "-");
}

function readTitle(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!match) fail("No <title> in the source file. Is this a rendered guide?");
  return match[1].replace(/\s+/g, " ").trim();
}

function readLang(html) {
  const match = html.match(/<html[^>]*\blang="([^"]+)"/i);
  return match ? match[1].toLowerCase() : "";
}

function decodeEntities(value) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Sections in the guide template never nest, so cutting from the enclosing
// <section> to the next </section> is exact and needs no HTML parser.
function cutEnclosing(html, needle, openTag, closeTag) {
  const at = html.indexOf(needle);
  if (at === -1) return { html, found: false };
  const start = html.lastIndexOf(openTag, at);
  const closeAt = html.indexOf(closeTag, at);
  if (start === -1 || closeAt === -1) {
    fail(`Found ${needle} but could not find its enclosing ${openTag} ... ${closeTag}.`);
  }
  const end = closeAt + closeTag.length;
  return { html: html.slice(0, start) + html.slice(end).replace(/^\n/, ""), found: true };
}

function stripLedger(html) {
  const section = cutEnclosing(html, 'id="ledger"', "<section", "</section>");
  const toc = cutEnclosing(section.html, 'href="#ledger"', "<li", "</li>");

  // Both present or both absent. One without the other means the template
  // changed shape, and guessing would risk publishing the ledger.
  if (section.found !== toc.found) {
    fail(
      `Template drift: ledger section ${section.found ? "found" : "missing"} but ` +
        `contents entry ${toc.found ? "found" : "missing"}. Refusing to publish. ` +
        `Check teachers-guide-template.html, or pass --keep-ledger deliberately.`
    );
  }
  return { html: toc.html, found: section.found };
}

function scrubBodyProvenance(html) {
  const before = (html.match(/para_id/gi) || []).length;
  const scrubbed = html.replace(PARA_ID_LOCATOR, "");
  return { html: scrubbed, removed: before - (scrubbed.match(/para_id/gi) || []).length };
}

// Show the offending prose rather than just naming the pattern. What survives
// the scrub is almost always the guide narrating its own research, which is an
// authoring problem to fix in the guide, not something to rewrite here.
function contextFor(html, pattern) {
  const at = html.search(pattern);
  if (at === -1) return null;
  return html
    .slice(Math.max(0, at - 90), at + 90)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function assertNoLeaks(html) {
  const hits = LEAK_PATTERNS.filter(([pattern]) => pattern.test(html));
  if (hits.length === 0) return;
  const lines = hits.map(([pattern, label]) => {
    const context = contextFor(html, pattern);
    return `    ${label}${context ? `\n      …${context}…` : ""}`;
  });
  fail(
    `Teacher-only material survived the strip. Refusing to publish to a public site.\n\n` +
      `${lines.join("\n")}\n\n` +
      `  Fix it in the guide, not here. A guide should not narrate its own\n` +
      `  research in the body — see the Anti-Patterns in sabbath-school-lesson/SKILL.md.`
  );
}

function buildFooter(slug, lang) {
  const rows = [];
  if (lang === "id") {
    rows.push(
      `${escapeHtml(LAI_ATTRIBUTION)} ` +
        `<a href="${LAI_SOURCE.url}">${escapeHtml(LAI_SOURCE.label)}</a>`
    );
  }
  rows.push(
    `<a href="${SITE}/lessons/">Arsip pelajaran</a> &middot; ` +
      `<code>${escapeHtml(slug)}</code>`
  );
  return (
    `\n<footer ${FOOTER_MARK} style="max-width:var(--measure,68ch);margin:0 auto;` +
    `padding:34px 24px 56px;font:14px/1.6 var(--sans,system-ui);color:var(--muted,#8a94a2);` +
    `border-top:1px solid var(--edge,rgba(128,128,128,.22))">\n` +
    rows.map((row) => `  <p style="margin:0 0 6px">${row}</p>`).join("\n") +
    `\n</footer>\n`
  );
}

function appendFooter(html, slug, lang) {
  if (html.includes(FOOTER_MARK)) return html;
  if (!/<\/body>/i.test(html)) fail("No </body> in the source file.");
  return html.replace(/<\/body>/i, `${buildFooter(slug, lang)}</body>`);
}

// Legacy slugs (2026-q2-l11) carry no date. Sort them below the dated ones
// rather than letting "q" sort above "0".
function sortKey(slug) {
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "0000-00-00";
}

async function collectLessons() {
  const lessonsDir = path.join(rootDir, "lessons");
  const entries = await readdir(lessonsDir, { withFileTypes: true }).catch(() => []);
  const lessons = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(lessonsDir, entry.name, "index.html");
    const html = await readFile(file, "utf8").catch(() => null);
    if (html === null) continue;
    const title = html.match(/<title>([\s\S]*?)<\/title>/i);
    lessons.push({
      slug: entry.name,
      title: title ? decodeEntities(title[1].replace(/\s+/g, " ").trim()) : entry.name
    });
  }
  return lessons.sort((a, b) => sortKey(b.slug).localeCompare(sortKey(a.slug)) || b.slug.localeCompare(a.slug));
}

function renderArchiveIndex(lessons) {
  const items = lessons
    .map(
      (lesson) =>
        `  <li><a href="${escapeHtml(lesson.slug)}/">` +
        `<span class="t">${escapeHtml(lesson.title)}</span>` +
        `<span class="s">${escapeHtml(lesson.slug)}</span></a></li>`
    )
    .join("\n");
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arsip Pelajaran Sekolah Sabat</title>
<style>
  :root{color-scheme:light dark;--ink:#16212c;--muted:#5d6b7a;--edge:#d8e1ea;
    --paper:#f4f7fb;--card:#fff;--accent:#0c7877}
  @media (prefers-color-scheme:dark){
    :root{--ink:#e8eef5;--muted:#93a1b1;--edge:#26313d;--paper:#0e151c;--card:#151d26;--accent:#4fbfbd}}
  *{box-sizing:border-box}
  body{margin:0;padding:56px 24px 80px;background:var(--paper);color:var(--ink);
    font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  main{max-width:64ch;margin:0 auto}
  h1{margin:0 0 6px;font-size:26px;letter-spacing:-.01em}
  p.lede{margin:0 0 34px;color:var(--muted)}
  ul{list-style:none;margin:0;padding:0}
  li{margin:0 0 10px}
  a{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline;padding:15px 18px;
    background:var(--card);border:1px solid var(--edge);border-radius:9px;
    color:inherit;text-decoration:none}
  a:hover{border-color:var(--accent)}
  .t{font-weight:600}
  .s{margin-left:auto;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}
  footer{max-width:64ch;margin:34px auto 0;padding-top:18px;border-top:1px solid var(--edge);
    color:var(--muted);font-size:14px}
  footer a{display:inline;padding:0;border:0;background:none;color:var(--accent)}
</style>
</head>
<body>
<main>
  <h1>Arsip Pelajaran Sekolah Sabat</h1>
  <p class="lede">Penuntun guru per pekan. Pelajaran terbaru selalu ada di <a href="${SITE}/">halaman utama</a>.</p>
  <ul>
${items}
  </ul>
</main>
<footer>
  <p>${escapeHtml(LAI_ATTRIBUTION)} <a href="${LAI_SOURCE.url}">${escapeHtml(LAI_SOURCE.label)}</a></p>
</footer>
</body>
</html>
`;
}

function preflight(options) {
  try {
    git("rev-parse", "--is-inside-work-tree");
  } catch {
    fail(`${rootDir} is not a git repository.`);
  }

  const dirty = git("status", "--porcelain");
  if (dirty) {
    const message = `Working tree is not clean:\n${dirty}\n  Commit or stash first.`;
    if (options.dryRun) console.warn(`  Warning: ${message}`);
    else fail(message);
  }

  try {
    git("fetch", "--quiet", "origin", "main");
    const behind = git("rev-list", "--count", "HEAD..origin/main");
    if (behind !== "0") {
      fail(`Local main is ${behind} commit(s) behind origin. Run: git pull --ff-only`);
    }
  } catch (error) {
    if (error.status === undefined) throw error;
    console.warn("  Warning: could not reach origin. Skipping the up-to-date check.");
  }
}

const options = parseArgs(process.argv);
const slug = options.slug || deriveSlug(options.source);
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  fail(`Slug "${slug}" must be lowercase letters, digits and hyphens. Pass --slug to override.`);
}

const sourceHtml = await readFile(options.source, "utf8").catch(() => {
  fail(`Cannot read ${options.source}`);
});
if (!sourceHtml.trimEnd().endsWith("</html>")) {
  fail("Source does not end with </html>. The render looks truncated.");
}

const title = readTitle(sourceHtml);
const lang = readLang(sourceHtml);

let html = sourceHtml;
let ledgerFound = false;
let paraIdsRemoved = 0;
if (options.keepLedger) {
  console.warn("  Warning: --keep-ledger. The Verification Ledger will be public.");
} else {
  const stripped = stripLedger(html);
  ledgerFound = stripped.found;
  const scrubbed = scrubBodyProvenance(stripped.html);
  html = scrubbed.html;
  paraIdsRemoved = scrubbed.removed;
  assertNoLeaks(html);
}
html = appendFooter(html, slug, lang);

preflight(options);

const archiveDir = path.join(rootDir, "lessons", slug);
const targets = [path.join(archiveDir, "index.html"), path.join(rootDir, "index.html")];

console.log(`  Title       ${title}`);
console.log(`  Slug        ${slug}`);
console.log(`  Language    ${lang || "(unset)"}`);
console.log(`  Ledger      ${options.keepLedger ? "kept (--keep-ledger)" : ledgerFound ? "stripped" : "none found"}`);
console.log(`  para_id     ${options.keepLedger ? "kept (--keep-ledger)" : `${paraIdsRemoved} scrubbed from body notes`}`);
console.log(`  Size        ${sourceHtml.length} -> ${html.length} bytes`);

if (options.dryRun) {
  const lessons = await collectLessons();
  const projected = lessons.some((lesson) => lesson.slug === slug) ? lessons : [{ slug, title }, ...lessons];
  console.log("\n  Would write:");
  for (const target of targets) console.log(`    ${path.relative(rootDir, target)}`);
  console.log("    lessons/index.html");
  console.log(`\n  Archive would list ${projected.length} lesson(s):`);
  for (const lesson of projected.slice(0, 10)) console.log(`    ${lesson.slug}  ${lesson.title}`);
  console.log("\n  Dry run. Nothing written.");
  process.exit(0);
}

await mkdir(archiveDir, { recursive: true });
for (const target of targets) await writeFile(target, html, "utf8");
await writeFile(path.join(rootDir, "lessons", "index.html"), renderArchiveIndex(await collectLessons()), "utf8");

git("add", "index.html", "lessons");
if (!git("status", "--porcelain")) {
  console.log("\n  Nothing changed. The site already serves this guide.");
  process.exit(0);
}
git("commit", "-m", `Publish ${title}`);
console.log(`\n  Committed ${git("rev-parse", "--short", "HEAD")}`);

if (options.push) {
  git("push", "origin", "main");
  console.log(`  Pushed to origin/main`);
  console.log(`\n  ${SITE}/`);
  console.log(`  ${SITE}/lessons/${slug}/`);
  console.log(`\n  Pages sets cache-control: max-age=600, so the edge can take ~10 minutes.`);
} else {
  console.log(`  Not pushed (--no-push). Run: git push origin main`);
}

#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function usage() {
  return `Usage:
  node scripts/create-lesson.mjs lesson-data/2026-q2-l11.json --publish
  node scripts/create-lesson.mjs lesson-data/2026-q2-l11.json --archive-only
  node scripts/create-lesson.mjs lesson-data/2026-q2-l11.json --dry-run

Options:
  --publish       Write index.html and student-guide.md at the repo root, and archive under lessons/<slug>/
  --archive-only  Write only lessons/<slug>/index.html and lessons/<slug>/student-guide.md
  --dry-run       Validate and print the output paths without writing files
`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const dataPath = args.find((arg) => !arg.startsWith("--"));
  const flags = new Set(args.filter((arg) => arg.startsWith("--")));
  if (!dataPath || flags.has("--help")) {
    console.log(usage());
    process.exit(dataPath ? 0 : 1);
  }
  return {
    dataPath: path.resolve(process.cwd(), dataPath),
    publish: flags.has("--publish"),
    archiveOnly: flags.has("--archive-only"),
    dryRun: flags.has("--dry-run")
  };
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required`);
  }
}

function validateLesson(lesson) {
  for (const key of ["slug", "title", "quarter", "lessonNumber", "dateRange", "bigIdea"]) {
    requireString(String(lesson[key] ?? ""), key);
  }
  if (!lesson.memory || !lesson.memory.text || !lesson.memory.ref) {
    throw new Error("memory.text and memory.ref are required");
  }
  if (!Array.isArray(lesson.readings) || lesson.readings.length === 0) {
    throw new Error("readings must contain at least one Bible reference");
  }
  if (!Array.isArray(lesson.days) || lesson.days.length !== 7) {
    throw new Error("days must contain exactly 7 daily lessons");
  }
  for (const day of lesson.days) {
    for (const key of ["id", "label", "title"]) requireString(day[key], `day.${key}`);
    if (!Array.isArray(day.boxes) || day.boxes.length === 0) {
      throw new Error(`day ${day.id} must contain boxes`);
    }
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function paragraph(text) {
  return text ? `<p>${escapeHtml(text)}</p>` : "";
}

function renderRefButton(ref) {
  return `<button class="verse-btn" data-ref="${escapeAttr(ref)}">${escapeHtml(ref)}</button>`;
}

function renderList(items, ordered = false) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${tag}>`;
}

function renderSourceLink(source) {
  const label = source.label || source.title || source.url;
  return `<a href="${escapeAttr(source.url)}" rel="noopener">${escapeHtml(label)}</a>`;
}

function renderEgwList(items) {
  return `<ul>${items.map((item) => {
    const source = item.source ? ` - ${renderSourceLink(item.source)}.` : "";
    return `<li>${escapeHtml(item.text)}${source}</li>`;
  }).join("")}</ul>`;
}

function renderBox(box) {
  const classes = ["guide-box"];
  if (box.type === "callout") classes.push("callout");
  if (box.type === "question") classes.push("question");
  if (box.type === "egw") classes.push("egw-box");
  if (box.fullRow) classes.push("full-row");

  const refs = Array.isArray(box.refs) && box.refs.length > 0
    ? `<p>${box.refs.map(renderRefButton).join(box.joiner ? ` ${escapeHtml(box.joiner)} ` : " ")}</p>`
    : "";
  const bullets = box.type === "egw" ? renderEgwList(box.items || []) : renderList(box.bullets);
  const ordered = renderList(box.ordered, true);

  return `<div class="${classes.join(" ")}"><h3>${escapeHtml(box.title)}</h3>${paragraph(box.text)}${refs}${bullets}${ordered}</div>`;
}

function renderDay(day) {
  return `
    <article id="${escapeAttr(day.id)}" class="day">
      <div class="day-head"><div><p class="day-label">${escapeHtml(day.label)}</p><h2 class="day-title">${escapeHtml(day.title)}</h2></div></div>
      <div class="day-body">
        ${day.boxes.map(renderBox).join("\n        ")}
      </div>
    </article>`;
}

function renderFooter(sources = []) {
  if (!Array.isArray(sources) || sources.length === 0) return "";
  const links = sources.map((source) => renderSourceLink(source));
  return `Metadata pelajaran diverifikasi dari ${links.join(" dan ")}. Materi disusun ulang dalam bahasa Indonesia untuk penggunaan kelas.`;
}

function navItems(days) {
  const labels = days.map((day) => {
    const shortLabel = day.navLabel || day.label.split(" ")[0];
    return `<a href="#${escapeAttr(day.id)}">${escapeHtml(shortLabel)}</a>`;
  }).join("\n      ");
  return `<a href="#lesson-start">Ikhtisar</a>
      ${labels}
      <a href="#closing">Penutup</a>`;
}

async function readCurrentStyle() {
  const htmlPath = path.join(rootDir, "index.html");
  const html = await readFile(htmlPath, "utf8");
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!match) throw new Error("Could not find <style> block in current index.html");
  return match[1];
}

function renderHtml(lesson, style) {
  const scriptures = lesson.scriptures || {};
  const meta = [
    ["Triwulan", lesson.quarter],
    ["Pelajaran", `Pelajaran ${lesson.lessonNumber}`],
    ["Judul", lesson.title],
    ["Tanggal", lesson.dateRange],
    ["Tujuan", lesson.goal]
  ].filter(([, value]) => value);

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pelajaran ${escapeHtml(lesson.lessonNumber)} - ${escapeHtml(lesson.title)}</title>
  <script>
    if (location.hostname === "ss.situmorang.com" && location.protocol === "http:") {
      location.replace(\`https://\${location.host}\${location.pathname}\${location.search}\${location.hash}\`);
    }
  </script>
  <style>${style}</style>
</head>
<body>
  <header class="hero">
    <div class="hero-inner">
      <div class="hero-copy">
        <div class="eyebrow">Pelajaran ${escapeHtml(lesson.lessonNumber)} - ${escapeHtml(lesson.dateRange)}</div>
        <h1>${escapeHtml(lesson.title)}</h1>
        <p>${escapeHtml(lesson.subtitle || "Panduan Sekolah Sabat interaktif untuk siswa: baca ayat, diskusikan pertanyaan, dan ikuti alur pelajaran mingguan bersama kelas.")}</p>
        <div class="hero-actions">
          <a class="primary-link" href="#lesson-start">Mulai Pelajaran</a>
          <a class="secondary-link" href="#memory">Ayat Hafalan</a>
        </div>
        <div class="hero-stats" aria-label="Ringkasan pelajaran">
          <div class="stat-card"><span>Durasi</span><strong>7 Hari</strong></div>
          <div class="stat-card"><span>Ayat Hafalan</span><strong>${escapeHtml(lesson.memory.ref)}</strong></div>
          <div class="stat-card"><span>Fokus</span><strong>${escapeHtml(lesson.hero?.focus || lesson.title)}</strong></div>
        </div>
      </div>
      <aside class="hero-card" aria-label="Sorotan pelajaran">
        <p class="hero-card-kicker">Fokus Pekan Ini</p>
        <h2>${escapeHtml(lesson.hero?.summary || lesson.bigIdea)}</h2>
        ${renderList(lesson.hero?.bullets || [])}
      </aside>
    </div>
  </header>

  <nav class="sticky-nav" aria-label="Bagian pelajaran">
    <div class="wrap nav-row">
      ${navItems(lesson.days)}
    </div>
  </nav>

  <main id="lesson-start" class="wrap">
    <section class="top-grid" aria-label="Ikhtisar pelajaran">
      <div class="panel">
        <h2>Identitas Pelajaran</h2>
        <ul class="meta-list">
          ${meta.map(([label, value]) => `<li><span class="tag">${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></li>`).join("\n          ")}
        </ul>
      </div>

      <div id="memory" class="panel memory">
        <h2>Ayat Hafalan</h2>
        <blockquote>
          "${escapeHtml(lesson.memory.text)}"
          <br>- ${renderRefButton(lesson.memory.ref)}
        </blockquote>
      </div>
    </section>

    <section class="panel">
      <h2>Bacaan untuk Pelajaran Minggu Ini</h2>
      <p>Klik referensi untuk membuka teks Alkitab di halaman ini.</p>
      <div class="scripture-grid">
        ${lesson.readings.map(renderRefButton).join("\n        ")}
      </div>
    </section>

    <section class="panel">
      <h2>Gagasan Besar</h2>
      <p>${escapeHtml(lesson.bigIdea)}</p>
    </section>

    <div class="section-title"><h2>Ikuti Alur Pelajaran</h2></div>
    ${lesson.days.map(renderDay).join("\n")}

    <section id="closing" class="closing">
      <h2>${escapeHtml(lesson.closing?.title || "Ajakan Penutup")}</h2>
      <p>${escapeHtml(lesson.closing?.text || "")}</p>
      ${lesson.closing?.prayer ? `<p><strong>Pokok doa:</strong> ${escapeHtml(lesson.closing.prayer)}</p>` : ""}
    </section>
  </main>

  <aside id="scriptureDrawer" class="drawer" aria-live="polite" aria-hidden="true">
    <div class="drawer-head"><h2 id="scriptureTitle" class="drawer-title">Alkitab</h2><button class="drawer-close" type="button" aria-label="Tutup teks Alkitab" id="closeDrawer">X</button></div>
    <div class="drawer-body"><p id="scriptureText" class="scripture-text"></p><p class="drawer-note">Teks Alkitab adalah saduran Indonesia dari teks KJV untuk diskusi kelas.</p></div>
  </aside>

  <footer class="wrap">
    <p>${renderFooter(lesson.sources)}</p>
  </footer>

  <script>
    const scriptures = ${JSON.stringify(scriptures, null, 6)};

    const drawer = document.getElementById("scriptureDrawer");
    const title = document.getElementById("scriptureTitle");
    const text = document.getElementById("scriptureText");
    const closeDrawer = document.getElementById("closeDrawer");

    function openScripture(ref) {
      title.textContent = ref;
      text.textContent = scriptures[ref] || "Teks Alkitab belum dimuat untuk referensi ini.";
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
      closeDrawer.focus({ preventScroll: true });
    }

    function closeScripture() {
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
    }

    document.querySelectorAll("[data-ref]").forEach((button) => {
      button.addEventListener("click", () => openScripture(button.dataset.ref));
    });

    closeDrawer.addEventListener("click", closeScripture);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeScripture();
    });
  </script>
</body>
</html>
`;
}

function renderMarkdown(lesson) {
  const lines = [];
  lines.push(`# Panduan Siswa: ${lesson.title}`, "");
  lines.push(`Triwulan: ${lesson.quarter}`);
  lines.push(`Pelajaran: ${lesson.lessonNumber}`);
  lines.push(`Tanggal: ${lesson.dateRange}`);
  lines.push(`Tema: ${lesson.bigIdea}`, "");
  lines.push("## Ayat Hafalan", "");
  lines.push(`> "${lesson.memory.text}"`);
  lines.push(`> - ${lesson.memory.ref}`, "");
  lines.push("## Bacaan Alkitab Utama", "");
  for (const ref of lesson.readings) lines.push(`- ${ref}`);
  lines.push("", "## Gagasan Besar", "", lesson.bigIdea, "");

  for (const day of lesson.days) {
    lines.push(`## ${day.label}: ${day.title}`, "");
    for (const box of day.boxes) {
      lines.push(`### ${box.title}`, "");
      if (box.text) lines.push(box.text, "");
      if (box.refs?.length) lines.push(...box.refs.map((ref) => `- ${ref}`), "");
      if (box.bullets?.length) lines.push(...box.bullets.map((item) => `- ${item}`), "");
      if (box.ordered?.length) lines.push(...box.ordered.map((item, index) => `${index + 1}. ${item}`), "");
      if (box.type === "egw" && box.items?.length) {
        for (const item of box.items) {
          const source = item.source ? ` - [${item.source.label}](${item.source.url}).` : "";
          lines.push(`- ${item.text}${source}`);
        }
        lines.push("");
      }
    }
  }

  lines.push("## Penutup", "");
  if (lesson.closing?.text) lines.push(lesson.closing.text, "");
  if (lesson.closing?.prayer) lines.push(`Pokok doa: ${lesson.closing.prayer}`, "");
  lines.push("## Sumber", "");
  for (const source of lesson.sources || []) lines.push(`- [${source.label}](${source.url})`);
  lines.push("");
  return lines.join("\n");
}

async function writeOutputs(lesson, html, md, options) {
  const archiveDir = path.join(rootDir, "lessons", lesson.slug);
  const outputs = [
    [path.join(archiveDir, "index.html"), html],
    [path.join(archiveDir, "student-guide.md"), md]
  ];
  if (options.publish && !options.archiveOnly) {
    outputs.push([path.join(rootDir, "index.html"), html]);
    outputs.push([path.join(rootDir, "student-guide.md"), md]);
  }
  if (options.dryRun) {
    console.log(outputs.map(([file]) => path.relative(rootDir, file)).join("\n"));
    return;
  }
  await mkdir(archiveDir, { recursive: true });
  for (const [file, contents] of outputs) {
    await writeFile(file, contents, "utf8");
  }
}

const options = parseArgs(process.argv);
const lesson = JSON.parse(await readFile(options.dataPath, "utf8"));
validateLesson(lesson);
const style = await readCurrentStyle();
const html = renderHtml(lesson, style);
const md = renderMarkdown(lesson);
await writeOutputs(lesson, html, md, options);
console.log(`Created ${lesson.slug}${options.publish ? " and published as current lesson" : ""}.`);

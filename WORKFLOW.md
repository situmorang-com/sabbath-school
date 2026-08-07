# Weekly Sabbath School Lesson Workflow

## Project Location

Preferred working folder:

```txt
/Users/edmundsitumorang/Library/Mobile Documents/iCloud~md~obsidian/Documents/BIBLE STUDY/200 Seedbox/ss
```

Older working folder:

```txt
/Users/edmundsitumorang/sabbath-school
```

If both folders exist, use the iCloud/Obsidian `ss` folder once it contains the git repo files (`.git`, `package.json`, `scripts/`, `lesson-data/`, and `lessons/`).

See [AGENTS.md](AGENTS.md) for the canonical AI-agent instructions.

## What This Repo Is Now

**This repo no longer writes lessons. It publishes them.**

The lesson is written by the `sabbath-school-lesson` skill in
`~/DEV/skills-sermon-adventist`, which renders a self-contained
`teachers-guide.html`. This repo strips the teacher-only parts, wraps it, and
ships it to GitHub Pages.

```txt
skills-sermon-adventist/output/2026-08-08-ss-karunia-karunia-roh/teachers-guide.html
   |  node scripts/publish-guide.mjs <path>
   v
index.html                                 ->  https://ss.situmorang.com/
lessons/2026-08-08-karunia-karunia-roh/    ->  archive copy
lessons/index.html                         ->  archive list, rebuilt each publish
```

## Publishing

Always dry-run first:

```sh
node scripts/publish-guide.mjs <path-to-teachers-guide.html> --dry-run
```

Check the slug, that the ledger reports `stripped`, and the archive list. Then:

```sh
node scripts/publish-guide.mjs <path-to-teachers-guide.html>
```

| Flag | Effect |
|---|---|
| `--slug <slug>` | Override the archive slug. Default: source folder name with `-ss-` collapsed |
| `--keep-ledger` | Publish the Verification Ledger. **Public site — think first** |
| `--no-push` | Commit locally without pushing |
| `--dry-run` | Report only, write nothing |

What the script does, in order: parse `<title>`; remove the ledger section and
its contents entry; scrub `(para_id …)` from citation notes; append the LAI
footer; write root + archive; rebuild the archive index; commit; push.

It refuses to run on a dirty tree or a branch behind `origin/main`, and aborts
rather than publish if teacher-only material survives the strip. Republishing
the same guide is a safe no-op.

After pushing, GitHub Pages sets `cache-control: max-age=600`, so the edge can
take up to ten minutes. Confirm the build:

```sh
gh api repos/situmorang-com/sabbath-school/pages/builds/latest --jq '{status,error}'
curl -s "https://ss.situmorang.com/?cb=$(date +%s)" | grep -o '<title>[^<]*'
```

## Legacy: The Student-Page Pipeline

`lesson-data/*.json` + `scripts/create-lesson.mjs` built the Q2 2026 student
pages. Superseded, but kept working because `lessons/2026-q2-l10/` and
`lessons/2026-q2-l11/` are still live. Use it only to regenerate those:

```sh
npm run create:lesson -- lesson-data/<slug>.json --publish
npm run check:lesson
```

The TB/LAI text rules below still apply to everything published here.

## Official Sources

Use official or primary sources first:

- Sabbath School Net lesson page: `https://ssnet.org/lessons/`
- Official lesson PDFs: `https://www.sabbath.school/`
- Ellen G. White references: `https://www.ellenwhite.info/`
- TB Bible text: `https://alkitab.mobi/tb/`
- LAI text-use policy: `https://www.alkitab.or.id/tentang-kami/penggunaan-teks`

Do not copy the full official lesson text verbatim. Create an Indonesian class guide that summarizes, explains, and adapts the lesson for students. Keep Bible text, short Ellen White excerpts, and source links concise.

## Indonesian and TB Bible Text

The site output should be in natural Bahasa Indonesia.

Use **Alkitab Terjemahan Baru (TB)** for embedded Scripture text. Keep total reproduced TB text within LAI's noncommercial allowance, do not reproduce an entire Bible book, and include this attribution:

```txt
Dikutip dari ALKITAB (TB) © LAI 1974.
```

Lesson data should include:

```json
"scriptureAttribution": "Dikutip dari ALKITAB (TB) © LAI 1974.",
"scriptureSource": {
  "label": "Alkitab Mobile SABDA - TB",
  "url": "https://alkitab.mobi/tb/"
}
```

## File Structure

```txt
index.html                        current guide  ->  ss.situmorang.com/
lessons/
  index.html                      archive list   ->  /lessons/
  2026-08-08-.../index.html       teacher's guide (current pipeline)
  2026-q2-l10/                    student page    (legacy)
  2026-q2-l11/                    student page    (legacy)
scripts/
  publish-guide.mjs               current publisher
  create-lesson.mjs               legacy generator
lesson-data/*.json                legacy source data
student-guide.md                  legacy, left from the last student page
CNAME  AGENTS.md  CLAUDE.md  WORKFLOW.md  README.md
```

Everything named `index.html` is generated. Never hand-edit it.

## Legacy: Lesson Data Contract

Each `lesson-data/*.json` file must include:

- `slug`: archive path, for example `2026-q2-l11`
- `title`: Indonesian lesson title
- `quarter`: Indonesian quarter name
- `lessonNumber`: lesson number as text or number
- `dateRange`: Indonesian date range
- `goal`: one-sentence learning goal
- `memory`: `{ "text": "...", "ref": "..." }`
- `readings`: Bible references used by the weekly lesson
- `bigIdea`: Indonesian summary of the weekly point
- `hero`: summary and bullets for the first screen
- `days`: exactly seven daily lesson objects
- `scriptures`: reference-to-text map for the in-page Bible drawer
- `scriptureAttribution`: required when using TB text
- `scriptureSource`: source link object for the Bible text
- `sources`: source links shown in the footer
- `closing`: final appeal and prayer

## Legacy: Generation Commands

```sh
npm run create:lesson -- lesson-data/2026-q2-l11.json --dry-run       # validate paths
npm run create:lesson -- lesson-data/2026-q2-l11.json --archive-only  # archive copy only
npm run create:lesson -- lesson-data/2026-q2-l11.json --publish       # archive + homepage
```

## Verification Checklist

After `publish-guide.mjs` runs, before trusting the live page:

- The dry run reported the slug you expected and `Ledger: stripped`.
- `grep -c 'para_id\|id="ledger"' index.html` returns 0. The script enforces
  this, but check once after any template change.
- Cautions survived: `grep -c 'class="flag"' index.html` matches the source.
- The page opens off disk with **no network** — no external CSS, JS, or fonts.
- Contents links all resolve; the timed plan and every appendix are intact.
- Mobile and desktop widths both render; tables scroll inside `.tablewrap`.
- `lessons/index.html` lists the new guide *and* the legacy Q2 pages.
- `/lessons/2026-q2-l11/` still loads.
- Pages build succeeded: `gh api repos/situmorang-com/sabbath-school/pages/builds/latest --jq '{status,error}'`.
- Live title matches, allowing up to ten minutes for the edge cache.

## Legacy: How the Last Student Page Was Done

The 2026 Q2 Lesson 11 page, "Kemunduran," was created by:

1. Verifying the official lesson metadata from Sabbath School sources.
2. Creating `lesson-data/2026-q2-l11.json`.
3. Writing an original Indonesian student guide for class use.
4. Replacing the initial paraphrased Bible drawer text with exact TB text.
5. Adding `scriptureAttribution` and `scriptureSource` metadata.
6. Updating `scripts/create-lesson.mjs` so the drawer, footer, and Markdown guide show TB attribution.
7. Running:

```sh
npm run create:lesson -- lesson-data/2026-q2-l11.json --publish
npm run check:lesson
```

8. Verifying all 31 clickable references resolve to 18 TB scripture entries.
9. Committing and pushing:

```txt
1235dfd Add lesson 11 sabbath school guide
9e70bf4 Use TB scripture text for lesson 11
```

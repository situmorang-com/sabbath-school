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

This repo is set up so a future Codex request like `create this week's sabbath school lesson` can produce the current Indonesian lesson page and archive it.

See [AGENTS.md](AGENTS.md) for the canonical AI-agent instructions.

## Command Meaning

When the user says `create this week's sabbath school lesson`, do this:

1. Resolve the current Sabbath School lesson week from official sources.
2. Gather the lesson title, date range, memory text, weekly readings, and daily lesson themes.
3. Write an Indonesian lesson data file under `lesson-data/<slug>.json`.
4. Use Alkitab Terjemahan Baru (TB) text for the memory text and Bible drawer entries, with LAI attribution metadata.
5. Generate the site and archive with:

```sh
npm run create:lesson -- lesson-data/<slug>.json --publish
```

6. Verify locally in the browser on mobile and desktop when browser tooling is available.
7. Commit and push to GitHub Pages.

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
index.html
student-guide.md
lesson-data/
  2026-q2-l10.json
  2026-q2-l11.json
lessons/
  2026-q2-l10/
    index.html
    student-guide.md
  2026-q2-l11/
    index.html
    student-guide.md
scripts/
  create-lesson.mjs
CNAME
AGENTS.md
CLAUDE.md
```

The root `index.html` is the current public lesson at `https://ss.situmorang.com/`.

Each generated lesson is also archived at:

```txt
https://ss.situmorang.com/lessons/<slug>/
```

## Lesson Data Contract

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

## Generation Commands

Validate output paths without writing:

```sh
npm run create:lesson -- lesson-data/2026-q2-l11.json --dry-run
```

Generate only the archive copy:

```sh
npm run create:lesson -- lesson-data/2026-q2-l11.json --archive-only
```

Generate the archive and publish it as the homepage:

```sh
npm run create:lesson -- lesson-data/2026-q2-l11.json --publish
```

## Verification Checklist

After generating:

- Confirm `index.html` and `student-guide.md` changed intentionally.
- Confirm `lessons/<slug>/index.html` and `lessons/<slug>/student-guide.md` exist.
- Search for stale text from the previous week.
- Confirm TB attribution appears in the Bible drawer, footer, Markdown guide, and source data.
- Confirm every clickable `data-ref` has matching `scriptures` text.
- Open the local site in the in-app browser.
- Check mobile width and desktop width.
- Click at least one Bible reference and confirm the drawer opens.
- Push only after the page renders cleanly.

## How the Last Page Was Done

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

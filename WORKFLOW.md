# Weekly Sabbath School Lesson Workflow

This repo is set up so a future Codex request like `create this week's sabbath school lesson` can produce the current Indonesian lesson page and archive it.

## Command Meaning

When the user says `create this week's sabbath school lesson`, do this:

1. Resolve the current Sabbath School lesson week from official sources.
2. Gather the lesson title, date range, memory text, weekly readings, and daily lesson themes.
3. Write an Indonesian lesson data file under `lesson-data/<slug>.json`.
4. Generate the site and archive with:

```sh
npm run create:lesson -- lesson-data/<slug>.json --publish
```

5. Verify locally in the browser on mobile and desktop.
6. Commit and push to GitHub Pages.

## Official Sources

Use official or primary sources first:

- Sabbath School Net lesson page: `https://ssnet.org/lessons/`
- Official lesson PDFs: `https://www.sabbath.school/`
- Ellen G. White references: `https://www.ellenwhite.info/`

Do not copy the full official lesson text verbatim. Create an Indonesian class guide that summarizes, explains, and adapts the lesson for students. Keep Bible text, short Ellen White excerpts, and source links concise.

## File Structure

```txt
index.html
student-guide.md
lesson-data/
  2026-q2-l10.json
lessons/
  2026-q2-l10/
    index.html
    student-guide.md
scripts/
  create-lesson.mjs
CNAME
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
- `sources`: source links shown in the footer
- `closing`: final appeal and prayer

## Generation Commands

Validate output paths without writing:

```sh
npm run create:lesson -- lesson-data/2026-q2-l10.json --dry-run
```

Generate only the archive copy:

```sh
npm run create:lesson -- lesson-data/2026-q2-l10.json --archive-only
```

Generate the archive and publish it as the homepage:

```sh
npm run create:lesson -- lesson-data/2026-q2-l10.json --publish
```

## Verification Checklist

After generating:

- Confirm `index.html` and `student-guide.md` changed intentionally.
- Confirm `lessons/<slug>/index.html` and `lessons/<slug>/student-guide.md` exist.
- Search for stale text from the previous week.
- Open the local site in the in-app browser.
- Check mobile width and desktop width.
- Click at least one Bible reference and confirm the drawer opens.
- Push only after the page renders cleanly.

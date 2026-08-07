# Sekolah Sabat

Situs penuntun guru Sekolah Sabat, bahasa Indonesia, di `https://ss.situmorang.com/`.

Dilayani oleh GitHub Pages dari `main` repo ini. Bukan dari VPS.

## Folder Proyek

```txt
/Users/edmundsitumorang/Library/Mobile Documents/iCloud~md~obsidian/Documents/BIBLE STUDY/200 Seedbox/ss
```

## Alur Kerja

Pelajaran **tidak ditulis di sini.** Pelajaran ditulis oleh skill
`sabbath-school-lesson` di `~/DEV/skills-sermon-adventist`, yang menghasilkan
`teachers-guide.html` mandiri. Repo ini hanya membersihkan dan menerbitkannya.

```txt
skills-sermon-adventist/output/<YYYY-MM-DD>-ss-<slug>/teachers-guide.html
   |  node scripts/publish-guide.mjs <path>
   v
index.html                     ->  ss.situmorang.com/
lessons/<slug>/index.html      ->  arsip
lessons/index.html             ->  daftar arsip
```

Selalu jalankan `--dry-run` lebih dahulu:

```sh
node scripts/publish-guide.mjs <path-ke-teachers-guide.html> --dry-run
node scripts/publish-guide.mjs <path-ke-teachers-guide.html>
```

Skrip menghapus Catatan Verifikasi beserta entri daftar isinya, membersihkan
`para_id` dari catatan kutipan, menambahkan footer LAI, menulis halaman utama
dan arsip, lalu commit dan push.

**Situs ini publik.** Apa pun yang tertinggal di dalam penuntun dapat dibaca dan
diindeks siapa saja.

Rincian: [WORKFLOW.md](WORKFLOW.md). Instruksi AI-agent: [AGENTS.md](AGENTS.md).

## Warisan

`lesson-data/*.json` + `scripts/create-lesson.mjs` membangun halaman *siswa*
Q2 2026. Sudah digantikan, tetapi tetap berfungsi karena
`lessons/2026-q2-l10/` dan `lessons/2026-q2-l11/` masih tayang.

```sh
npm run check:lesson
npm run create:lesson -- lesson-data/<slug>.json --publish
```

## Teks Alkitab

Terjemahan Baru (TB) dengan atribusi LAI:

```txt
Dikutip dari ALKITAB (TB) © LAI 1974.
```

# Sekolah Sabat

Halaman pelajaran Sekolah Sabat interaktif dalam bahasa Indonesia.

## Folder Proyek

Folder kerja yang disarankan:

```txt
/Users/edmundsitumorang/Library/Mobile Documents/iCloud~md~obsidian/Documents/BIBLE STUDY/200 Seedbox/ss
```

Jika folder lama `/Users/edmundsitumorang/sabbath-school` masih ada, gunakan folder iCloud/Obsidian di atas setelah berisi `.git`, `package.json`, `scripts/`, `lesson-data/`, dan `lessons/`.

## Membuat Pelajaran Mingguan

Gunakan workflow di [WORKFLOW.md](WORKFLOW.md) ketika ingin membuat pelajaran baru.

Instruksi AI-agent utama ada di [AGENTS.md](AGENTS.md).

Validasi generator:

```sh
npm run check:lesson
```

Buat arsip dan jadikan pelajaran sebagai halaman utama:

```sh
npm run create:lesson -- lesson-data/<slug>.json --publish
```

Halaman utama dipublikasikan di `https://ss.situmorang.com/`, sementara arsip pelajaran berada di `lessons/<slug>/`.

Teks Alkitab di drawer memakai Terjemahan Baru (TB) dengan atribusi LAI:

```txt
Dikutip dari ALKITAB (TB) © LAI 1974.
```

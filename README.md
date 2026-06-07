# Sekolah Sabat

Halaman pelajaran Sekolah Sabat interaktif dalam bahasa Indonesia.

## Membuat Pelajaran Mingguan

Gunakan workflow di [WORKFLOW.md](WORKFLOW.md) ketika ingin membuat pelajaran baru.

Validasi generator:

```sh
npm run check:lesson
```

Buat arsip dan jadikan pelajaran sebagai halaman utama:

```sh
npm run create:lesson -- lesson-data/<slug>.json --publish
```

Halaman utama dipublikasikan di `https://ss.situmorang.com/`, sementara arsip pelajaran berada di `lessons/<slug>/`.

# otak-atik

Kumpulan puzzle untuk orang dewasa. Halaman statis tanpa build step dan tanpa dependensi, cocok untuk GitHub Pages. Progres tersimpan di `localStorage` browser, tidak ada yang dikirim ke server.

## Puzzle

| Folder | Puzzle |
| --- | --- |
| [`sudoku/`](sudoku) | Sudoku lima level: Newbie, Mudah, Sedang, Sulit, Extreme. Catatan kandidat, undo, petunjuk, periksa, timer, rekor waktu per level, dan game yang berlanjut setelah halaman ditutup. |

## Level sudoku

Generator membuat puzzle dengan solusi tunggal, lalu menilai kesulitan dengan solver teknik manusia (`solveBySingles`), bukan hanya jumlah petunjuk:

| Level | Petunjuk | Syarat |
| --- | --- | --- |
| Newbie | ≤ 46 | Selesai hanya dengan naked single |
| Mudah | ≤ 38 | Selesai dengan naked + hidden single |
| Sedang | ≤ 34 | Selesai dengan naked + hidden single |
| Sulit | ≤ 30 | Single buntu, tersisa 1–36 sel |
| Extreme | ≤ 25 | Single buntu, tersisa 37+ sel (butuh teknik lanjutan atau coba-coba) |

Ini ukuran kesulitan yang sederhana. Teknik lanjutan seperti pair, X-wing, atau chain tidak dinilai satu per satu.

## Menjalankan

```bash
python3 -m http.server 8000
```

Buka `http://localhost:8000/`. Halaman memakai ES module, jadi tidak jalan lewat `file://`.

## Tes

```bash
npm test
```

Memakai test runner bawaan Node (tanpa dependensi). Tes memeriksa solusi tunggal, jumlah petunjuk, dan syarat teknik tiap level.

## Menambah puzzle

Buat folder baru (misalnya `nonogram/`) dengan `index.html`, tambahkan kartu di `index.html` akar, dan pakai `shared/style.css` agar tampilannya seragam. Simpan progres dengan kunci `otak-atik.<puzzle>.*`.

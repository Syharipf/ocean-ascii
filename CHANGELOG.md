# Changelog

## 1.0.0

- Wallpaper native KDE Plasma 6: hewan laut ASCII bergantian, kawanan berwarna, hujan, ombak, dan kabut ASCII transparan; tanpa jam.
- Auto-freeze mengikuti jendela yang terlihat pada aktivitas dan virtual desktop saat ini; Show Desktop melanjutkan animasi.
- Resume membuang waktu saat pause, resize digabungkan, dan render tidak mengantrikan simulasi terpisah.
- Konfigurasi FPS dan jenis hewan tersimpan; preview mandiri tidak ikut auto-freeze.
- Pemeriksaan Node, lifecycle Qt, benchmark Canvas nyata, dan pengukuran CPU/RAM Linux tanpa dependensi tambahan.
- Lisensi MIT, atribusi `ascii-sharks`, dan panduan pasang/perbarui/hapus melalui `kpackagetool6`.

Angka FPS merupakan target, bukan jaminan. `Canvas.Image` tetap memakai CPU dan pengunggahan tekstur; auto-freeze menghentikan pekerjaan wallpaper, bukan seluruh proses Plasma.

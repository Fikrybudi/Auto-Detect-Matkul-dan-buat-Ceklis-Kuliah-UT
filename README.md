# 📚 UT LMS Tracker

Chrome/Edge extension untuk membantu mahasiswa Universitas Terbuka melacak progress belajar di elearning.ut.ac.id.

![Version](https://img.shields.io/badge/version-1.0-blue)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-green)

## ✨ Fitur

- **Auto-detect Mata Kuliah** - Otomatis mendeteksi mata kuliah dari halaman LMS
- **Manual Checklist** - Centang progress Absensi, Tugas, dan Diskusi per mata kuliah
- **Edit Nama Matkul** - Klik nama untuk mengubah jika tidak terdeteksi
- **Summary Counter** - Lihat total progress di bagian atas
- **Tambah Manual** - Tambah mata kuliah secara manual jika perlu
- **Data Tersimpan** - Progress tersimpan di browser, tidak hilang saat refresh

## 📦 Instalasi

### Chrome
1. Buka `chrome://extensions/`
2. Aktifkan **Developer mode** (pojok kanan atas)
3. Klik **Load unpacked**
4. Pilih folder `UT_LMS_TRACKER`

### Edge
1. Buka `edge://extensions/`
2. Aktifkan **Developer mode** (sidebar kiri)
3. Klik **Load unpacked**
4. Pilih folder `UT_LMS_TRACKER`

## 🚀 Cara Pakai

1. Buka [elearning.ut.ac.id](https://elearning.ut.ac.id)
2. Login ke akun UT kamu
3. Klik icon extension **UT LMS Tracker**
4. Klik **🔄 Refresh Mata Kuliah** untuk mendeteksi mata kuliah
5. Klik nama mata kuliah untuk mengubah nama jika perlu
6. Centang checklist sesuai progress:
   - ✅ **Absensi** - Sudah absen
   - 📝 **Tugas** - Sudah kirim tugas
   - 💬 **Diskusi** - Sudah ikut diskusi

## 📁 Struktur File

```
UT_LMS_TRACKER/
├── manifest.json    # Konfigurasi extension
├── popup.html       # UI popup extension
├── popup.js         # Logika popup & checklist
├── content.js       # Script scraping mata kuliah
├── icon16.png       # Icon 16x16
├── icon48.png       # Icon 48x48
└── icon128.png      # Icon 128x128
```

## 🔧 Troubleshooting

**Mata kuliah tidak terdeteksi?**
- Pastikan sudah login ke elearning.ut.ac.id
- Coba refresh halaman LMS lalu klik Refresh di extension
- Gunakan fitur "Tambah Manual" untuk menambah mata kuliah

**Data hilang?**
- Data disimpan di browser storage
- Jangan clear browsing data atau data extension akan hilang

## 📝 Lisensi

MIT License - Bebas digunakan dan dimodifikasi.

---

Made with ❤️ untuk mahasiswa UT

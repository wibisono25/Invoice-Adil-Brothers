# Log Percakapan & Dokumentasi Pengembangan Aplikasi Invoice UD Adil Brothers

Dokumen ini merangkum seluruh proses pengembangan, perbaikan, dan instruksi deployment untuk aplikasi Invoice UD Adil Brothers.

## 1. Ringkasan Proyek
Aplikasi Invoice berbasis web (React + Vite) yang terintegrasi dengan Supabase untuk penyimpanan data dan memiliki fitur pembuatan PDF otomatis.

## 2. Fitur Utama & Perubahan yang Dilakukan

### A. Integrasi Database (Supabase)
- **Perbaikan Koneksi:** Memperbaiki format `VITE_SUPABASE_URL` di file `.env` agar sesuai dengan standar Supabase.
- **Validasi Klien:** Menambahkan pengecekan URL dan Anon Key di `src/lib/supabase.ts` agar aplikasi tidak *crash* jika konfigurasi belum lengkap.

### B. Antarmuka Pengguna (UI/UX)
- **Penggantian Dialog Browser:** Mengganti `prompt()` dan `confirm()` bawaan browser dengan **Modal Kustom** menggunakan `framer-motion`. Hal ini dilakukan karena dialog bawaan sering diblokir di dalam iFrame atau browser HP tertentu.
- **Fitur Tambah Pembeli:** Implementasi modal khusus untuk menambah pembeli UMKM baru dengan validasi nama duplikat.
- **Konfirmasi Hapus:** Implementasi modal konfirmasi sebelum menghapus data pembeli atau invoice untuk mencegah kesalahan klik.
- **Status Loading:** Menambahkan animasi putar (*spinner*) saat proses simpan atau hapus data ke database.

### C. Pembuatan PDF
- **Perbaikan Logo:** Memperbaiki masalah logo yang memiliki latar belakang hitam pada hasil PDF. Logo sekarang berada di dalam kotak putih (*badge*) agar terlihat jelas dan profesional.
- **Format A5:** Invoice diatur dalam format portrait A5 yang ringkas.

## 3. Instruksi Deployment (GitHub & Vercel)

### Langkah-langkah ke GitHub:
1. Gunakan fitur **"Export to GitHub"** di Google AI Studio.
2. Pastikan file `.env` **TIDAK** ikut diunggah (sudah diatur di `.gitignore`).

### Langkah-langkah di Vercel:
1. Hubungkan repository GitHub ke Vercel.
2. **PENTING:** Masukkan *Environment Variables* di Dashboard Vercel (Settings > Environment Variables):
   - `VITE_SUPABASE_URL`: [URL Supabase Anda]
   - `VITE_SUPABASE_ANON_KEY`: [Anon Key Supabase Anda]
3. Lakukan **Redeploy** setelah menyimpan variabel tersebut.

## 4. Penggunaan di HP (Mobile)

### Cara Instalasi (PWA):
- **Android (Chrome):** Buka link, klik titik tiga, pilih "Tambahkan ke Layar Utama".
- **iPhone (Safari):** Buka link, klik ikon Share, pilih "Tambah ke Layar Utama".

## 5. Catatan Teknis
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Animasi:** Framer Motion
- **PDF Library:** jsPDF + html2canvas
- **Database:** Supabase (PostgreSQL)

---
*Dokumen ini dibuat secara otomatis sebagai referensi pengembangan aplikasi.*

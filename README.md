# RTSP ke RTMP Encoder

Aplikasi web untuk mengkonversi stream RTSP dari kamera CCTV Dahua ke RTMP untuk YouTube menggunakan FFmpeg.

[![GitHub issues](https://img.shields.io/github/issues/arwansihombing/rtsp-rtmp)](https://github.com/arwansihombing/rtsp-rtmp/issues)
[![GitHub license](https://img.shields.io/github/license/arwansihombing/rtsp-rtmp)](https://github.com/arwansihombing/rtsp-rtmp/blob/main/LICENSE)

## Fitur

- Antarmuka web responsif untuk manajemen stream
- Mendukung multiple stream RTSP ke RTMP
- Konfigurasi resolusi output yang fleksibel
- Sistem monitoring log realtime
- Auto-restart untuk koneksi yang terputus
- Admin panel untuk manajemen sistem
- Autentikasi dan manajemen pengguna
- Penggunaan resource yang efisien

## Persyaratan Sistem

- Orange Pi 4A dengan Debian Bookworm
- Node.js versi 14 atau lebih tinggi
- FFmpeg
- SQLite3

## Instalasi

1. Clone repositori:
```bash
git clone https://github.com/arwansihombing/rtsp-rtmp.git
cd rtsp-rtmp
```

2. Install dependensi:
```bash
npm install
```

3. Salin file konfigurasi:
```bash
cp .env.example .env
```

4. Edit file .env sesuai kebutuhan:
```env
PORT=3000
JWT_SECRET=your_secret_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
```

5. Jalankan aplikasi:
```bash
npm start
```

## Penggunaan

1. Akses web interface di `http://[ip-address]:3000`
2. Login menggunakan kredensial admin
3. Tambah stream baru dengan mengisi:
   - Nama stream
   - URL RTSP (contoh: rtsp://admin:password@ip-camera:554/cam/realmonitor?channel=1&subtype=0)
   - URL RTMP dan Stream Key YouTube
   - Resolusi output (opsional)
4. Kelola stream melalui dashboard:
   - Start/Stop stream
   - Monitor status dan log
   - Edit konfigurasi

## Konfigurasi FFmpeg

Aplikasi menggunakan command FFmpeg berikut:
```bash
ffmpeg -f lavfi -i anullsrc -rtsp_transport tcp -i [RTSP_URL] -vcodec libx264 -acodec aac -ar 44100 -b:a 128k -strict experimental -f flv [RTMP_URL]/[STREAM_KEY]
```

## Pemeliharaan

- Log aplikasi tersimpan di folder `logs/`
- Database SQLite tersimpan di `database.sqlite`
- Gunakan admin panel untuk monitoring sistem dan pembersihan log

## Keamanan

- Semua endpoint API dilindungi dengan autentikasi JWT
- Password pengguna di-hash menggunakan bcrypt
- Role-based access control untuk admin panel

## Kontribusi

Kontribusi selalu diterima dengan senang hati! Berikut langkah-langkah untuk berkontribusi:

1. Fork repositori ini
2. Buat branch fitur baru (`git checkout -b fitur-baru`)
3. Commit perubahan Anda (`git commit -m 'Menambahkan fitur baru'`)
4. Push ke branch (`git push origin fitur-baru`)
5. Buat Pull Request

## Lisensi

MIT License

## Author

- [Arwan Sihombing](https://github.com/arwansihombing)
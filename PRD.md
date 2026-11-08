# Product Requirements Document (PRD)

## MLBB Voice Timer (Second-Device Audio HUD)

> **Document Version:** 1.0.0  
> **Status:** Approved for Implementation  
> **Target Platform:** Desktop / Tablet Web Application (Client-Side PWA)  
> **Role:** Senior Tech Lead & Product/UI-UX Specialist  
> **Active Workspace:** `C:\Users\user_hebat\workspace\voice-timer-project`

---

## 1. Executive Summary & Problem Statement

### 1.1 Latar Belakang

Pada pertandingan tingkat tinggi Mobile Legends: Bang Bang (Mythic / Glory / Immortal), memantau _battle spell cooldown_ musuh (terutama _Flicker_ 120s, _Purify_ 90s, _Vengeance_ 75s, dan _Retribution_ 35s) merupakan faktor penentu kemenangan saat perebutan objektif Lord/Turtle dan inisiasi _teamfight_.

### 1.2 Masalah Nyata di Lapangan

1. **Beban Kognitif Tinggi:** Pemain harus menghitung menit & detik di kepala atau mengetik manual di chat in-game (yang memakan waktu 2–4 detik dan membuat karakter diam di tempat).
2. **Ancaman Anti-Cheat (ACE Moonton):** Aplikasi overlay Android pihak ketiga atau screen-scraper yang berjalan di smartphone yang sama berisiko tinggi memicu suspensi akun / _perma-ban_.
3. **Ergonomi Dua Tangan:** Kedua tangan pemain wajib menempel pada smartphone untuk mengendalikan _virtual joystick_ dan membidik skill mikro. Pemain tidak memiliki jari bebas untuk mencatat atau menekan tombol rumit.
4. **Bising Pertarungan & Ucapan Beruntun (_Burst Speech_):** Saat war terjadi, pemain berteriak dengan kalimat cepat tanpa jeda (misal: _"Chou fliker Hanabi aegis Natan pyt"_), sering kali diiringi musik game, suara skill, dan obrolan tim di Discord.

### 1.3 Solusi Produk: Second-Device Audio HUD

Aplikasi web mandiri berbasis **Svelte 5 + Web Audio API + Web Worker** yang diletakkan di samping pemain (laptop/tablet).

- **100% Isolasi Fisik:** Nol interaksi dengan HP utama (aman mutlak dari anti-cheat).
- **Multi-Entity Burst NLP:** Mampu membongkar ucapan beruntun hingga 3–5 entitas sekaligus dalam 1 tarikan napas.
- **Auditory Earcons (Non-blocking):** Mengonfirmasi pencatatan timer dengan nada _chime_ sintetis 60 ms tanpa menenggelamkan audio in-game.
- **Glanceable HUD:** Tampilan skala besar berjarak pandang 70 cm dengan angka raksasa dan kode warna urgensi.

---

## 2. Pilihan Tech Stack & Rationale Arsitektur

Berdasarkan evaluasi performa, latensi, dan pemeliharaan:

| Layer                    | Pilihan Teknologi                    | Alasan Pemilihan Teknis & Trade-Off                                                                                                                                                                                                                                                    |
| :----------------------- | :----------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend Framework**   | **Svelte 5 (Vite SPA)**              | Mengompilasi kode tanpa Virtual DOM (_zero VDOM diffing_). Mutasi DOM terjadi secara bedah (_surgical_) langsung ke elemen timer. Bundle ultra-kecil (< 20 KB runtime), startup instan pada laptop/tablet tua. Menolak SvelteKit SSR karena aplikasi ini 100% _client-side offline_.   |
| **Styling & HUD UI**     | **Tailwind CSS v4**                  | Utility-first untuk membangun antarmuka gelap (_Dark Slate HUD_) dengan hierarki kontras tinggi tanpa _runtime CSS overhead_.                                                                                                                                                          |
| **Timer Precision Core** | **Dedicated Web Worker**             | Menjalankan _timer loop_ berbasis selisih delta waktu absolut (`performance.now()`). Bebas dari _browser tab throttling_ saat layar diminimalkan atau tidak aktif.                                                                                                                     |
| **Audio Feedback**       | **Web Audio API & Speech Synthesis** | Kombinasi Procedural Earcons (< 80 ms chime sintetis) dan Tactical Esports Voice Announcer (< 0.7s callout via `window.speechSynthesis`). Memberi peringatan suara instan tanpa mengharuskan pemain memalingkan pandangan dari layar HP.                                               |
| **Burst NLP Engine**     | **Grammar-Aware Chunker + Fuse.js**  | Algoritma modular berorientasi domain MLBB. Memecah klausa kalimat, mengenali format paralel/interleaved, dan mengikat _talent modifier_ (-15% PYT) secara lokal (_scoped binding_).                                                                                                   |
| **Speech-to-Text (STT)** | **Dual-Engine Pipeline (Hybrid)**    | **Tier 1 (Default):** Native Web Speech API (`SpeechRecognition`) sub-100ms streaming.<br>**Tier 2 (AI Offline):** `whisper-tiny` ONNX on-demand via Hugging Face Hub CDN & IndexedDB cache dengan proteksi Device Benchmark Gate.<br>**Tier 3 (Manual):** 1-Tap Glanceable Touch HUD. |
| **Offline Distribution** | **Vite PWA (`vite-plugin-pwa`)**     | Service worker yang memungkinkan aplikasi disimpan sebagai aplikasi desktop/tablet mandiri tanpa perlu koneksi internet aktif.                                                                                                                                                         |

---

## 3. Fitur Utama & Kebutuhan Fungsional (FR)

### FR-1: Match Preparation (Enemy Team Setup)

- Sebelum pertandingan dimulai, pemain dapat memilih 5 hero musuh dari katalog hero MLBB.
- Sistem secara otomatis mengisi _default battle spell_ populer per hero (misal: Chou $\to$ Flicker, Ling $\to$ Retribution, Hanabi $\to$ Aegis/Purify).
- Pemain dapat mengaktifkan toggle _Talent PYT (Pull Yourself Together)_ per hero secara manual sebelum match jika musuh menggunakan emblem support.

### FR-2: Input Ingestion & Hardware Trigger

- **Mode 1 (Hold-to-Talk Keyboard):** Menahan tombol `Spacebar` untuk membuka input suara.
- **Mode 2 (USB Foot Pedal Support):** Mendukung mapping tombol eksternal (Foot Pedal HID) agar kedua tangan tetap 100% di smartphone.
- **Mode 3 (Voice Activity Detection / VAD):** Headset boom mic dengan deteksi ambang batas desibel (_software noise gate_).
- **Mode 4 (Manual Silent Touch):** Grid sentuh 5 hero musuh untuk pencatatan senyap via klik/tap 1 sentuhan.

### FR-3: Multi-Entity Burst NLP Parsing Engine

- **Sanitasi Kata:** Menyaring kata-kata pengisi (_stopwords_) khas Indonesia: _"eh", "tadi", "si", "terus", "ya", "udah", "dong"_.
- **Pencocokan Slang & Typo:** Mendukung variasi pelafalan gamer:
  - Flicker: _"fliker", "flik", "pliker", "flek"_
  - Purify: _"puri", "pyuri", "pure"_
  - Vengeance: _"vengence", "pengen", "vengens"_
  - Retribution: _"retri", "sawi"_
- **Scoped Modifier Binding:** Jika ada kata _"pyt"_ atau _"pe ye te"_, sistem hanya memotong -15% cooldown pada hero/spell yang berada di klausa yang sama, **dilarang membocorkan modifier ke seluruh spell**.
- **Dukungan Pola Sintaks Ganda:**
  1. _Interleaved:_ `[Hero][Spell]` $\to$ _"Chou fliker"_
  2. _Inverted Interleaved:_ `[Spell][Hero]` $\to$ _"Fliker Chou"_
  3. _Parallel Chunks:_ `[Hero 1] [Hero 2] [Spell 1] [Spell 2]` $\to$ _"Chou Hanabi fliker aegis"_

### FR-4: Precision Timer & Drift-Proof Execution

- Timer dikelola di _Web Worker Thread_.
- Menghitung mundur dengan akurasi milidetik, disinkronkan ke UI setiap detik.
- Mendukung status paralel hingga 5 spell musuh secara bersamaan.

### FR-5: Procedural Auditory Earcons

- Menghasilkan nada frekuensi instan via `AudioContext`:
  - **Flicker:** Sine sweep nada tinggi (880 Hz $\to$ 1174 Hz, 80 ms) — memberi rasa mobilitas instan.
  - **Purify / Aegis:** Dual chime defensif (523 Hz + 659 Hz, 100 ms) — memberi rasa perisai.
  - **Retribution:** Low-frequency pulse (150 Hz $\to$ 90 Hz, 60 ms) — memberi rasa hentakan monster.
  - **Timer Ready (Cooldown Selesai):** High chime ping 2x (1046 Hz) saat cooldown musuh telah kembali tersedia.

### FR-5.1: Tactical Esports Voice Announcer

- Menyuarakan pengingat suara militer super padat (< 0.7 detik, rate 1.25x-1.35x) via `window.speechSynthesis`:
  - **Peringatan 10 Detik:** `"[Hero] [Spell] sepuluh"` (contoh: _"Chou flicker sepuluh"_).
  - **Peringatan 0 Detik (Ready):** `"[Hero] [Spell] ready"` (diselaraskan bersama earcon double-ping).
- Menghindari _auditory masking_ dan kebingungan komunikasi Discord dengan pembatasan durasi ketat dan kendali volume independen.

### FR-6: High-Contrast Glanceable HUD (Jarak 70 cm)

- **Tipografi Raksasa:** Sisa detik ditampilkan dengan `font-black text-5xl` atau `6xl` tabular mono.
- **Hero Portrait & Spell Icon:** Avatar visual berukuran minimal 56x56 px agar dikenali tanpa membaca teks.
- **Tri-Color Urgency Coding:**
  - **Merah Solid (Cooldown > 15s):** Musuh tidak memiliki spell. Aman untuk diinisiasi / gank.
  - **Kuning Berkedip (Cooldown 1s – 15s):** Fase waspada! Spell musuh hampir selesai.
  - **Hijau Menyala (Cooldown 0s / READY):** Spell aktif kembali (tampil menyala 5 detik sebelum kembali ke status _idle_).

### FR-7: Instant Error Recovery & Undo

- Jika sistem salah tangkap atau pemain salah bicara:
  - Pemain dapat mengucapkan kata: _"batal"_ atau _"cancel"_.
  - Atau menekan tombol `Esc` / `Backspace` di keyboard / pedal kaki untuk membatalkan timer terakhir yang diluncurkan.

---

## 4. Kebutuhan Non-Fungsional (NFR)

1. **Latensi Input-ke-Konfirmasi:** Total waktu dari berhentinya ucapan hingga bunyi _earcon_ konfirmasi berbunyi wajib **< 200 ms** (pada mode offline) atau **< 500 ms** (pada Web Speech API).
2. **Konsumsi Memori:** Penggunaan RAM browser stabil di bawah **60 MB** saat menjalankan 5 timer aktif secara paralel selama 30 menit terus-menerus.
3. **Ketahanan Latar Belakang (_Background Resilience_):** Timer tidak boleh meleset (> 100 ms) saat jendela browser diminimalkan atau ditimpa aplikasi lain.
4. **Nol Pengiriman Data Sensitif:** Seluruh pemrosesan audio dan NLP wajib berjalan di perangkat lokal (_zero telemetry, zero server storage_).

---

## 5. Batasan & Hal di Luar Lingkup (_Out of Scope_)

- **Dilarang Menghubungkan Jaringan ke HP MLBB:** Tidak ada bridge ADB, Bluetooth, atau WebSocket lokal ke smartphone game demi perlindungan dari deteksi anti-cheat.
- **Tidak Ada Screen OCR / Mirroring:** Aplikasi tidak membaca layar HP secara visual. Seluruh pembaruan berbasis input suara dan manual touch.
- **Tidak Ada Fitur TTS Monolog:** Dilarang membacakan kalimat panjang yang mengganggu audio game.

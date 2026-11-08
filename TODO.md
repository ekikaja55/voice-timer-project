# Master Implementation Roadmap (TODO.md)

## MLBB Voice Timer (Svelte 5 + Web Audio + Web Worker)

> **Status:** Siap Dieksekusi  
> **Target Arsitektur:** Svelte 5 (Vite SPA) + Tailwind CSS + Web Worker + Web Audio API  
> **Workspace Root:** `C:\Users\user_hebat\workspace\voice-timer-project`

---

## FASE 0 : Setup Proyek & Scaffolding Svelte 5 (Vite SPA)

- [x] Inisialisasi proyek Svelte 5 menggunakan Vite (`npm create vite@latest . -- --template svelte-ts` atau konfigurasi TypeScript minimalis).
- [x] Konfigurasi Tailwind CSS (v3 / v4) dengan skema warna _Dark Slate HUD_ (`#0f172a`, aksen Indigo `#6366f1`, Emerald `#10b981`, Rose `#f43f5e`, Amber `#f59e0b`).
- [x] Konfigurasi `vite-plugin-pwa` untuk dukungan instalasi PWA offline di desktop/tablet.
- [x] Verifikasi build awal & sanitasi file default template (`npm run check` & `npm run lint`).

---

## FASE 1 : Model Data & Kamus Entitas MLBB (Data Layer)

- [x] Setting SPA Mode [src/routes/+layout.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/routes/+layout.ts) (`ssr = false`).
- [x] Buat tipe data TypeScript terstruktur di [src/lib/types/index.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/types/index.ts): `Hero`, `BattleSpell`, `TimerInstance`, `ParsedPair`, `MatchEnemySlot`.
- [x] Buat file kamus [src/lib/data/spells.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/data/spells.ts):
  - Daftar 12 Battle Spell MLBB lengkap (Flicker, Purify, Aegis, Vengeance, Sprint, Petrify, Retribution, Flameshot, Revitalize, Inspire, Execute, Arrival) dengan durasi CD dan varian slang.
- [x] Buat file katalog [src/lib/data/heroes.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/data/heroes.ts):
  - Katalog 85+ hero populer MLBB lintas 6 role beserta alias slang Indonesia dan default spell mapping.

---

## FASE 2 : Engine Multi-Entity Burst NLP (Logic Layer)

- [x] Buat modul [src/lib/nlp/tokenizer.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/nlp/tokenizer.ts):
  - Sanitasi teks: huruf kecil, pembersihan tanda baca, penghapusan kata sampah (_stopwords_ Indonesia: _"eh", "tadi", "si", "terus", "ya", "udah"_).
- [x] Buat modul [src/lib/nlp/matcher.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/nlp/matcher.ts):
  - Algoritma pencocokan cepat Levenshtein dengan batas toleransi typo 1–2 karakter.
  - Tagging tipe token: `HERO`, `SPELL`, `MODIFIER` (`PYT`), `COMMAND` (`BATAL` / `UNDO`), atau `UNKNOWN`.
- [x] Buat modul [src/lib/nlp/clauseChunker.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/nlp/clauseChunker.ts):
  - **Scoped Modifier Binding:** Mengisolasi modifier `PYT` (-15%) hanya pada spell dalam klausa lokal (mencegah _leakage_ ke seluruh spell).
  - **Dukungan Pola Sintaks:**
    - Pola Selang-seling: `[Hero][Spell]` dan `[Spell][Hero]`.
    - Pola Paralel: `[Hero 1, Hero 2][Spell 1, Spell 2]`.
  - Fallback untuk spell tunggal tanpa nama hero (mengarah ke "Musuh" atau hero target aktif).
- [x] Tulis unit test komprehensif di [src/lib/unit-test/parser.spec.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/unit-test/parser.spec.ts) (10 skenario uji lolos validasi 100%).

---

## FASE 3 : Generator Audio Earcon Prosedural (Web Audio API)

- [x] Buat audio synthesizer mandiri [src/lib/audio/earcons.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/audio/earcons.ts):
  - Inisialisasi `AudioContext` dengan mekanisme _resume on user gesture (`unlockAudioContext`)_.
  - Desain suara _Procedural Earcon_ sintetis (< 80 ms, non-blocking) tanpa dependensi MP3/WAV:
    - `playFlickerEarcon()`: Sine sweep nada tinggi (880 Hz $\to$ 1174 Hz).
    - `playDefenseEarcon()`: Dual-tone harmoni perisai (523 Hz + 659 Hz).
    - `playRetriEarcon()`: Bass impact frekuensi rendah (150 Hz $\to$ 70 Hz).
    - `playSprintEarcon()`, `playPetrifyEarcon()`, `playOffenseEarcon()`.
    - `playReadyAlert()`: Double-ping alert saat cooldown selesai (1046 Hz).
    - `playUndoEarcon()`: Low error tone saat timer dibatalkan.
    - `playSpellEarcon()`: Smart dispatcher berbasis objek spell.
- [x] Verifikasi unit test [src/lib/unit-test/earcons.spec.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/unit-test/earcons.spec.ts) (nol dependensi file eksternal, aman SSR/headless).

---

## FASE 4 : Engine Timer Presisi Tinggi (Web Worker Core)

- [x] Buat dedicated Web Worker [src/lib/workers/timer.worker.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/workers/timer.worker.ts):
  - Implementasi _timestamp delta loop_ (`Date.now() - startedAt`).
  - Menghitung sisa detik absolut agar **bebas dari perlambatan (_drift throttling_)** saat browser tab diminimalkan atau tidak fokus.
- [x] Buat bridge reaktif [src/lib/stores/timerStore.svelte.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/stores/timerStore.svelte.ts):
  - Svelte 5 Runes / State (`$state`) yang menerima event dari Worker dan mengekspos daftar timer aktif ke UI.
  - Dukungan aksi `startTimer` (dengan kalkulasi otomatis -15% PYT), `dispatchVoicePairs`, `undoLastTimer` (Instant Undo), `cancelTimer`, dan `resetAll`.
- [x] Tulis unit test komprehensif di [src/lib/unit-test/timerStore.spec.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/unit-test/timerStore.spec.ts) (6 skenario uji lolos 100%).

---

## FASE 5 : Audio Ingestion & Input Trigger Pipeline

- [x] Buat modul [src/lib/speech/speechManager.svelte.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/speech/speechManager.svelte.ts):
  - Adapter `webkitSpeechRecognition` (`id-ID`) dengan penanganan timeout, normalisasi input, dan auto-dispatch ke NLP & TimerStore.
  - Simulasi teks `simulateTranscript` untuk pengujian & manual fallback.
- [x] Buat modul listener hardware [src/lib/speech/inputHandlers.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/speech/inputHandlers.ts):
  - Listener keyboard: `Spacebar` (Hold-to-Talk) & `Esc`/`Backspace` (Instant Undo).
  - Dukungan pemetaan input _USB Foot Pedal_.
- [x] Tulis unit test komprehensif di [src/lib/unit-test/speechManager.spec.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/unit-test/speechManager.spec.ts) (6 skenario uji lolos 100%).

---

## FASE 6 : Antarmuka Pengguna "Glanceable HUD" (Jarak Pandang 70 cm)

- [x] Komponen **Header & Match State**:
  - Modal setup 5 hero musuh sebelum match dimulai [src/lib/components/MatchSetupModal.svelte](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/components/MatchSetupModal.svelte) (dengan deteksi otomatis default spell dan toggle PYT).
  - Store reaktif match 5 slot lane [src/lib/stores/matchStore.svelte.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/stores/matchStore.svelte.ts).
- [x] Komponen **5-Slot Enemy HUD Deck** ([src/lib/components/EnemyCard.svelte](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/components/EnemyCard.svelte)):
  - Kartu berukuran besar dengan foto potret hero dan icon spell.
  - Angka sisa detik raksasa (`font-black text-5xl / 6xl` tabular mono).
  - Skema warna status:
    - **Merah Pekat:** Cooldown aktif (> 15s).
    - **Kuning Berkedip:** Cooldown waspada (< 15s).
    - **Hijau Menyala:** Spell READY kembali.
  - Tombol manual 1-klik untuk trigger spell tanpa suara.
- [x] Komponen **Voice Stream Banner & Live Visualizer** ([src/lib/components/VoiceBanner.svelte](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/components/VoiceBanner.svelte)):
  - Indikator mic aktif / listening state (klik/tahan mic atau hold spacebar).
  - Log frasa yang baru saja diucapkan beserta tombol `[BATALKAN]` (Undo).
  - Tombol simulasi uji cepat (preset burst, paralel, dsb).
- [x] Assembling Halaman Utama HUD ([src/routes/+page.svelte](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/routes/+page.svelte)) dengan listener input global, card deck 5 musuh, dan standalone timers.

---

## FASE 7 : Pengujian, Validasi Kualitas & Dokumentasi

- [x] Jalankan unit test NLP parser dengan skenario ekstrem (_burst speech_ 3 hero beruntun, pola terbalik, pola paralel) di [src/lib/unit-test/parser.spec.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/unit-test/parser.spec.ts).
- [x] Verifikasi timer drift-proof Web Worker thread [src/lib/workers/timer.worker.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/workers/timer.worker.ts) berbasis delta `performance.now()`.
- [x] Eksekusi **End-to-End User Flow Testing** via **Playwright MCP** secara interaktif (verifikasi touch card, instant undo, burst speech simulation, unassigned hero dynamic tray, match setup modal, dan reset all timers).
- [x] Dokumentasikan petunjuk penggunaan, isolasi anti-cheat fisik, dan cheat sheet perintah suara di [README.md](file:///C:/Users/user_hebat/workspace/voice-timer-project/README.md).

---

## FASE 8 : Rombak Layout & Desain Minimalis "Antislop", Shazam Voice Overlay & Diagnostik Audio

- [x] Modul Diagnostik Audio & Deteksi Hardware [src/lib/speech/audioChecker.svelte.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/speech/audioChecker.svelte.ts):
  - Deteksi ketersediaan Web Speech API, deteksi hardware mikrofon (`enumerateDevices`), dan pengecekan status izin (`getUserMedia`).
  - Analisis sinyal suara real-time (volume meter 0-100) via `AnalyserNode`.
- [x] Komponen Diagnostik Audio & Mic [src/lib/components/settings/SpeechDiagnosticsTab.svelte](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/components/settings/SpeechDiagnosticsTab.svelte):
  - Panduan interaktif konfigurasi browser (termasuk instruksi Firefox `about:config` dan rekomendasi Chromium).
  - Indikator bar visual sinyal audio real-time saat berbicara dan Discord-style 3s mirror test.
- [x] Komponen Shazam-Style Voice Overlay [src/lib/components/VoiceShazamOverlay.svelte](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/components/VoiceShazamOverlay.svelte):
  - Radar waveform animasi berdenyut responsif terhadap amplitudo suara.
  - Tampilan teks transkrip raksasa saat user berbicara beruntun.
  - Chip hasil pemrosesan NLP (Hero -> Spell, status PYT, Undo/Reset) sebelum kembali ke HUD.
- [x] Perbaikan Bug Pintasan Spasi [src/lib/speech/inputHandlers.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/speech/inputHandlers.ts):
  - Dukungan lengkap varian keycode Spasi (`Space`, `Spacebar`, `keyCode 32`).
  - Otomatis `blur()` elemen tombol aktif agar Spasi tidak memicu klik tombol ganda.
  - Listener `blur` window untuk merilis hold state saat jendela browser tidak fokus.
- [x] Desain Ulang Layout & Warna Minimalis (Prinsip Antislop):
  - Palet matte Slate/Zinc tanpa gradien atau orbs generik AI.
  - Peningkatan kontras tipografi countdown tabular raksasa untuk jarak pandang 70 cm.

---

## FASE 9 : Tactical Esports Voice Announcer & Device Benchmark Suite

- [x] Modul Esports Voice Announcer [src/lib/audio/voiceAnnouncer.svelte.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/audio/voiceAnnouncer.svelte.ts):
  - Service singleton reaktif berbasis native `window.speechSynthesis` (0 MB download, 0ms latency, didukung 100% di Firefox & Chromium).
  - Format callout militer esports padat (< 0.7 detik, rate 1.25x-1.35x): `[Hero] [Spell] 10 seconds` / `sepuluh` (window 10s) dan `[Hero] [Spell] ready` (window 0s).
  - Antrean cerdas non-blocking untuk mencegah audio overlap ketika multi-spell selesai berdekatan.
  - Pilihan multi-bahasa (English default & Bahasa Indonesia) dan kontrol volume mandiri.
- [x] Modul Device Benchmark Suite [src/lib/benchmark/deviceBenchmark.svelte.ts](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/lib/benchmark/deviceBenchmark.svelte.ts):
  - Algoritma benchmark mikro-komputasi float32 matrix operations (250 ms) mengadopsi konsep kreier/benchmark.
  - Klasifikasi skor performa perangkat (0-100) dan penentuan estimasi latensi inferensi AI on-device.
  - Proteksi kompatibilitas Firefox (deteksi WebGPU eksperimental dan fallback otomatis ke WASM SIMD).
- [x] Halaman Dedicated Pengaturan [/settings](file:///C:/Users/user_hebat/workspace/voice-timer-project/src/routes/settings/+page.svelte) dengan Tab 3-in-1:
  - Tab 1: Speech Engine & Diagnostics (Selector, Whisper Downloader, Speech Sandbox, Mic Hardware & Signal Meter, Discord-Style 3s Mirror Mic Test).
  - Tab 2: Tactical Voice Callout (Master switch, bahasa EN/ID, volume slider, opsi window 10s/0s, tombol test voice callout).
  - Tab 3: Device Benchmark (Hardware detection, 250ms benchmark runner, score & tier).
  - Unsaved Changes Guard (`beforeNavigate` & `beforeunload` interception dengan modal konfirmasi 3 opsi: Batal Keluar, Buang Perubahan, Simpan & Keluar).
  - Mini-pill background active timers warning.
- [x] Header HUD Bersih & Minimalis:
  - Read-only Status Badge terpadu (`[● Mic Connected • NATIVE STT]` atau `[● Mic Connected • WHISPER AI]`).
  - Tombol navigasi langsung ke `/settings`.
- [x] Unit test Vitest untuk Voice Announcer, Device Benchmark, Debug Logger, dan Whisper Engine.

---

## FASE 10 : Pengujian Sanity Akhir & Rilis Final

- [x] Jalankan sanity check linting, typechecking, dan suite unit test Vitest lengkap.
- [ ] Validasi user flow menggunakan Playwright MCP.
- [ ] Finalisasi berkas workpad dan persetujuan user.

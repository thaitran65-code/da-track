# ĐA TRACK — Tài liệu tổng hợp & Hướng dẫn sửa (bàn giao)

> **Mục đích file này:** khi đoạn chat cũ ngưng, đưa file này cho đoạn chat mới (Claude)
> để nắm ngay app là gì, cấu trúc thế nào, và **cách sửa an toàn** để không làm hỏng file.
> Người dùng tên **Liem**, ở TP.HCM, **giao tiếp 100% tiếng Việt** — mọi báo cáo/hướng dẫn viết bằng tiếng Việt.

---

## 1. APP LÀ GÌ

**Đa Track** = web app nhạc đệm đa track, chạy trong trình duyệt (1 file HTML duy nhất).
- File chính: **`multitrack_player.html`** (~11MB, có **âm thanh base64 nhúng thẳng** trong file).
- 3 track: **Trống** (drum), **Nhạc đệm** (backing/hợp âm), **Âm đệm** (amdem).
- Dùng để: chơi nhạc đệm bolero/nhạc vàng/Trịnh — rải dây guitar, quạt chả, trống, hợp âm.
- Chơi trên điện thoại (Android) qua trình duyệt hoặc app đã đóng gói.

---

## 2. HOST & SAO LƯU (RẤT QUAN TRỌNG)

- **GitHub Pages** (bản chạy online): repo **`thaitran65-code/da-track`**.
  - Link app: `https://thaitran65-code.github.io/da-track/multitrack_player.html`
- **Khôi phục file mới nhất** (khi file hỏng) — tải bản Liem đã up lên GitHub:
  ```
  curl -sL -o /tmp/mp.html https://raw.githubusercontent.com/thaitran65-code/da-track/main/multitrack_player.html
  ```
  (Dùng `curl`, KHÔNG dùng `web_fetch` — github bị chặn robots.txt.)
- **Repo chuyển file giữa các chat**: `thaitran65-code/tai-li-u` — Liem up file, lấy link raw,
  Claude tải bằng `curl -sL -o /tmp/file <link raw>`.
- **Thói quen**: sau mỗi lần sửa, Liem up file lên GitHub → luôn có bản backup mới nhất.

---

## 3. ⚠️ CÁCH SỬA AN TOÀN (BÀI HỌC XƯƠNG MÁU)

**File ~11MB có binary base64 nhúng → dễ làm hỏng nếu sửa sai cách.**

1. **TUYỆT ĐỐI KHÔNG** dùng `open(p,'w').write(...)` để ghi đè cả file bằng Python
   → đã từng làm **HỎNG/CẮT file** phải khôi phục từ GitHub. Chỉ được:
   - Dùng công cụ **`str_replace`** (an toàn nhất), HOẶC
   - Python `h = h.replace(old, new, 1)` + `assert old in h` rồi ghi lại **nguyên biến h** (không cắt xén).
2. **Validate JS sau MỖI lần sửa**: tách các khối `<script>` ra file `.js` rồi `node --check`:
   ```python
   import re; h=open('multitrack_player.html',encoding='utf-8',errors='replace').read()
   blocks=re.findall(r'<script>(.*?)</script>', h, re.S)
   open('/tmp/mt.js','w',encoding='utf-8').write('\n;\n'.join(blocks))
   ```
   ```
   node --check /tmp/mt.js
   ```
3. **KHÔNG `grep` rộng cả file** → sẽ stream binary base64 gây lỗi/tràn. Chỉ dùng:
   - `sed -n 'START,ENDp' file` để xem theo dòng, HOẶC
   - công cụ `view` với `view_range`, HOẶC
   - Python đọc `.split('\n')` rồi lọc dòng có `'UklGR'`/`'SUQzB'` (đầu base64 wav/mp3) để **bỏ qua** dòng binary khi in.
4. Dùng **ký tự UTF-8 THẬT** (emoji, tiếng Việt có dấu) — không dùng `\uXXXX` surrogate.
5. **Test runtime bằng Playwright** (headless Chrome) khi nghi lỗi:
   - Chạy server: `cd /tmp/mp_test && python3 -m http.server 8899` (copy html vào đó trước).
   - Playwright ở `/home/claude/.npm-global/lib/node_modules/playwright`.
   - `page.evaluate()` gọi thẳng hàm (vd `openDrumPadModal('A','drum')`) + bắt `pageerror`/console error.
   - Lưu ý: server http.server hay bị tắt giữa chừng — chạy lại bằng
     `(setsid python3 -m http.server 8899 >/tmp/srv.log 2>&1 </dev/null &)` rồi `sleep 2`.

---

## 4. KIẾN TRÚC & HÀM QUAN TRỌNG (để chat mới định vị nhanh)

- **AudioContext**: `drumCtx` = `backingCtx` (CÙNG 1 context, đồng hồ chung).
  Tạo với `new AC({ latencyHint: 'interactive' })` (độ trễ thấp).
- **Đồng bộ ô nhịp**: `getCurrentBarLengthSec()` bám chu kỳ 1 ô nhịp thực của Trống đang phát;
  `buildAmDemLoopBuffer()` khóa mẫu Âm đệm dài đúng 1 vòng lặp Trống (chống trôi nhịp).
  Đổi tempo qua `changeTempoTo()` → `reanchorBarOnTempoChange()`, debounce 400ms.

- **Hợp âm → tần số dây (rải/quạt)**: `chordToStringFrequencies(chordName, startString)`
  - `startString` = 'auto'/6/5/4 (dây trầm bắt đầu). 'auto' → `autoStartString(root)`
    (E/F/G→6, A/B/C→5, D→4).
  - Hợp âm mở dùng `OPEN_CHORD_VOICINGS` (bỏ dây dưới startString);
    hợp âm chặn/7 dùng `STRUM_SHAPES` (E/A/D-shape, nốt gốc đúng dây bắt đầu).
- **Hợp âm 3 nốt (organ/pad)**: `chordNameToPitchClasses()` — hiểu m, dim, **7 (dominant)**.
- **Bộ hợp âm theo tone**: `computeDiatonicChords(rootIndex, mode)`.
  Tone THỨ: **bậc 5 (v) = hợp âm 7** (V7 dominant) — vd Am→E7, Dm→A7, Em→B7 (kiểu bolero).
- **Tiếng guitar**: nút "🎸 Tiếng 1/2" (`btnGuitarSound`, localStorage `guitarSoundMode`):
  - Tiếng 1 = Karplus-Strong: `makeKarplusStrongBuffer()` + `pluckStringKS(freq, when, stepDur, gainMul)`
    (có lowpass ấm cho dây trầm, tăng gain dây bass).
  - Tiếng 2 = mẫu guitar thật: `GUITAR_SAMPLE_DATA` (8 mẫu MP3 base64), `pluckStringSample(freq, when, gainMul)`
    (chọn mẫu gần cao độ nhất + đổi playbackRate).
  - `pluckStringNote()` là dispatcher chọn theo `guitarSoundMode`.
- **Rải dây**: `STRUM_PATTERNS` (dãy số dây, mỗi bước 1 dây), `scheduleAheadStrum()`,
  `playStrumPad()`. Cả mẫu trải đúng tròn 1 ô nhịp.
- **Quạt chả**: `strumChord()` (gạt xuống/lên/bass theo direction), `playQuatPad()`.

- **Pad Nhạc đệm** (`backingPadSettings[1..7]`): mỗi pad có `repeat, infinite (mặc định true),
  nextPad ('Không'), strumStart ('auto'), + trigger (giọng nói/phím/MIDI)`.
  - `armBackingRepeat()`: hết repeat → dừng hoặc chuyển `nextPad` (chỉ pad nhạc đệm, `getNextPadOptionsBacking()`).
  - Hộp cài đặt: hàm `openDrumPadModal(letter, group)` (dùng chung drum/amdem/backing/stop);
    lưu ở `drumPadModalSave` (mỗi group lưu field riêng).
- **Kích hoạt pad bằng**: giọng nói (vân tay rms+spectral, bandpass 300–3400Hz, ngưỡng 0.80),
  bàn phím (Bluetooth), MIDI. **UI nút MIDI đã ẨN** (`display:none` ở `midiTriggerBtn`) theo yêu cầu —
  Liem chỉ dùng bàn phím Bluetooth. JS MIDI còn nằm im (vô hại, không có thiết bị thì không chạy).

---

## 5. CÁC TÍNH NĂNG ĐÃ HOÀN THÀNH

- Đồng bộ 3 track theo ô nhịp, chống trôi nhịp.
- Chọn tone (trưởng/thứ) → tự nạp 7 hợp âm vào pad nhạc đệm; tone thứ bậc 5 = hợp âm 7.
- Rải dây (Karplus-Strong / mẫu guitar thật) + Quạt chả + Organ + Rải piano + Đệm chặn + Pad nền.
- **Dây trầm bắt đầu** (6/5/4/auto) cho từng pad hợp âm.
- Repeat / Lặp mãi (mặc định bật) / Next pad cho pad nhạc đệm.
- Kích hoạt pad bằng bàn phím Bluetooth / giọng nói.
- Giao diện điện thoại: thanh nút Nhạc đệm cuộn ngang 1 hàng (media ≤640px).
- PWA (manifest.json + sw.js network-first + icon) để cài/chạy offline trên GitHub Pages.

---

## 6. ĐÓNG GÓI APK

App có **2 kiểu đóng gói**:

### A. APK độc lập (WebView, offline 100%) — ĐANG DÙNG
- Project Capacitor sẵn: **`datrack_apk_project.zip`** (giải nén → thư mục `datrack_app`).
- Build ở máy Liem (Ubuntu) bằng **Android Studio**:
  1. Android Studio → Open → chọn thư mục **`datrack_app/android`**.
  2. Nếu hỏi JVM (Gradle cần Java 8–24) → chọn **Use JVM 21**.
  3. Đợi Gradle sync xong.
  4. Build → Build App Bundle(s)/APK(s) → **Build APK(s)**.
  5. File ở: `datrack_app/android/app/build/outputs/apk/debug/app-debug.apk`
- **Cập nhật app**: thay `www/index.html` VÀ `android/app/src/main/assets/public/index.html`
  bằng `multitrack_player.html` mới → build lại.
- WebView **không có Web MIDI** (nên đã bỏ MIDI, dùng bàn phím Bluetooth).
- Tên app "Đa Track", package `com.thaitran.datrack`, icon 3 thanh track.

### B. APK kiểu TWA (chạy nền Chrome) — bản cũ, còn giữ MIDI
- Tạo qua **pwabuilder.com** từ link GitHub Pages → tab "Other Android" ra bản unsigned →
  ký lại bằng `keytool` + `zipalign` + `apksigner` (SDK có sẵn: `/usr/lib/android-sdk/build-tools/debian/`).
- Giữ được Web MIDI (nút bàn đạp), chạy offline sau lần mở đầu (nhờ sw.js).
- **Không build được APK ngay trong sandbox** (thiếu dexer d8/dx, mạng dl.google.com bị chặn) →
  phải build ở máy Liem hoặc ký lại bản có sẵn.

---

## 7. MÔI TRƯỜNG & CÔNG CỤ DEV

- **Sinh mẫu âm thanh**: `fluidsynth` (apt-get install) + soundfont `/usr/share/sounds/sf2/TimGM6mb.sf2`
  + `ffmpeg`. (Đã dùng để tạo mẫu guitar nylon program 24, và bộ 55 mẫu trống chuẩn GM.)
  - Mẫu guitar: render nốt → chuẩn hóa đỉnh ~0.55 (gain sạch, KHÔNG limiter kẻo méo dây bass) → MP3 96k → base64.
- **Test runtime**: Playwright (đã cài global ở `/home/claude/.npm-global`).
- **Android SDK** trong sandbox: `/usr/lib/android-sdk` (platform android-23, build-tools có aapt/aapt2/apksigner/zipalign;
  Java 21 có keytool). **Thiếu**: dexer d8/dx, gradle → không build APK từ đầu được.
- **Capacitor**: `npm install @capacitor/core @capacitor/cli @capacitor/android` (npm được, chạy ok).
- Thư mục làm việc thường dùng: `/mnt/user-data/outputs/` (file giao cho Liem),
  `/tmp/` (scratch), `/tmp/datrack_app/` (project APK).

---

## 8. LƯU Ý VỀ MEMORY & PHONG CÁCH

- Trả lời **tiếng Việt 100%**, thân thiện, gọi "anh".
- Sau khi sửa xong: **validate JS**, rồi **present file** cho Liem (dùng công cụ present_files).
- Sửa xong nhắc Liem **up GitHub** để backup.
- Khi Liem báo lỗi khó tái hiện → **test bằng Playwright** trước khi kết luận (đừng đoán).
- Nhạc: Liem thích Trịnh Công Sơn, Ngô Thụy Miên, Phú Quang, Phương Thảo — chơi bolero/nhạc vàng.

---

*File này viết ngày mình hoàn thành: gỡ MIDI + build APK độc lập thành công.
Đưa nguyên file này cho đoạn chat mới là nắm được toàn bộ để tiếp tục.*

# Ramazan İnanç Hair Art Studio — Randevu Sistemi

Bu dosya projeye özel çalışma bilgisidir. Global kurallar
`~/.claude/CLAUDE.md`'dedir ve burada tekrarlanmaz.

## Ürün kalite çıtası

Kabul ölçütü "çalışıyor" değil, **"rakiplerinden önde"**. Bir geliştirme
önerisi rakip kıyaslamasına dayandırılır (Fresha, Booksy, Vagaro, Squire,
GlossGenius; Türkiye: Kolay Randevu, Salon Randevu, AtlasPlan, Randevio).

## Yığın

- **Backend:** NestJS 11 + Prisma 7 + PostgreSQL 16. 203 TS dosyası, 20 modül.
- **Frontend:** React 19 + Vite 8 + Tailwind 4 + Framer Motion + Radix.
  104 TS/TSX dosyası. TypeScript ~6.0.
- **Test:** Jest (backend), Vitest + Testing Library (frontend), Playwright (e2e).
- **Lint:** backend `eslint`, frontend `oxlint`.

## Yerel çalıştırma — dikkat edilecekler

```powershell
npm run db:up        # docker compose, postgres 5434 portunda
npm run db:migrate
npm run dev:backend  # 3000
npm run dev:frontend # 5173
```

**⚠️ Port 3000 çakışması gerçek bir risk.** Eray'ın makinesinde
`Desktop\beauty proof` (Next.js) ve `Desktop\restoren sipariş merkezi` projeleri
de çalışıyor olabilir ve 3000'i tutabilir. Backend `EADDRINUSE` verirse
**başka projenin sürecini öldürme**; bizimkini taşı:

```powershell
$env:PORT='3001'; npm --prefix backend run start:dev
$env:VITE_API_URL='http://127.0.0.1:3001/api'; npm --prefix frontend run dev
```

Frontend'de **Vite proxy yoktur**; `frontend/src/lib/api.ts` API adresini
`VITE_API_URL` yoksa `window.location.hostname:3000/api` olarak sabit kurar.

## Gerçek veriler (yerel seed)

- Şube slug'ı: **`hair-art-ramazan-inanc-denizli`** (`ramazan-inanc` değil).
- 1 şube (Denizli), 7 hizmet, 5 uzman, 12 müşteri, ~80 randevu.
- Çalışma düzeni 10.00–21.00 (dakika 600–1260).
- Development OTP kodu: `111111`.
- Postgres container adı: `ramazan-inanc-postgres`, port **5434**.

## Mimarinin bilinmesi gereken yerleri

- **Eşzamanlılık doğru çözülmüş:** `common/schedule-lock.ts` içindeki
  `pg_advisory_xact_lock(hashtext('salon-schedule:' + branchId))` şube
  bazında serileştirir. Randevu yazan her yeni akış bu kilidi almalıdır.
- **Doluluk modeli çift katmanlı:** `BookingOccupancySegment` (yeni, buffer'lı)
  + `occupancySegments: { none: {} }` ile filtrelenen legacy `Booking` kayıtları.
  Müsaitlik sorgusu ikisini de okur. Yeni kod segment üretmelidir.
- **Arka plan işçileri süreç-içi `setInterval`'dır** (notification-worker 10sn,
  reminder/review scheduler 60sn, waitlist-worker 15sn, pending-expiry 60sn) —
  **ama doğruluk açısından çok-replika güvenlidirler.** 12.08.2026'da tek tek
  doğrulandı: bildirim kuyruğu `notification-outbox.service.ts` içinde
  deterministik idempotency anahtarıyla (`booking:{id}:{event}:v1`) `upsert`
  eder; `notification-worker` ve `waitlist` claim'lerini
  `FOR UPDATE SKIP LOCKED` + `PROCESSING` durumu + stale-claim kurtarma ile
  alır; `pending-booking-expiry` koşullu `updateMany` ile compare-and-swap
  yapar. Replika eklemek gereksiz yoklama üretir ama **çift SMS üretmez.**
- **Tek gerçek çok-replika açığı rate limit'tir:** süreç-içi `Map`
  (`public-action-rate-limit.service.ts`) ve yalnız review uçlarını kapsar.
  OTP tarafı bundan bağımsız, veritabanındaki `attemptCount` ile korunur.
- **Realtime = SSE + 2.5 saniyede bir DB polling** (`admin-realtime.controller.ts`).
- `backend/src/payments/` **boştur**; ödeme/kapora sistemi yoktur.
- `NotificationChannel` enum'unda **yalnız `SMS`** vardır; WhatsApp yoktur.
- Frontend'de sunucu-durum kütüphanesi yoktur; 41 dosyada 338 adet
  `useState/useEffect/fetch` elle yönetilir. `CustomerAccountApp.tsx` 2209 satır.

## Yönetici paneli

Giriş `/admin`, kullanıcı adı **`owner`** (parola yerel seed parolasıdır, buraya
yazılmaz — Eray'dan iste). 11 bölüm: Randevular, Talepler, Bekleme listesi,
Çalışma düzeni, Müşteriler, Değerlendirmeler, Hizmetler, Uzmanlar, Ekip erişimi,
Raporlar, Ayarlar.

**⚠️ `AdminApp.tsx` React Router kullanmaz.** İçeride elle yönlendirme yapar:
`window.location.pathname` string eşleme + doğrudan `pushState` + manuel
`popstate` dinleyicisi + 11 dallı `if` zinciri. Yeni bölüm eklerken `PATHS`,
`sectionFromPath()`, `navigate()` içindeki rol listesi, `allowedSections` ve
`if` zinciri olmak üzere **beş yeri birden** güncellemek gerekir.
Rol listesi iki ayrı yerde tekrarlandığı için biri unutulursa yetki açığı doğar.

`BRANCH_SLUG` bu dosyada sabit kodludur — arayüz tek şubeye çivilenmiştir.

**⚠️ Geliştirme modunda `ReportsPage` tarih değişiminde bir adım geride kalır.**
Bu bir ürün hatası **değildir**; StrictMode çifte-effect artefaktıdır ve
production build'de doğru çalışır (12.08.2026'da `vite preview` ile doğrulandı).
Bunu hata sanıp "düzeltmeye" kalkma.

## Tasarım sistemi

Kaynak: `.superdesign/design-system.md` (Sprint 09) + uygulama
`frontend/src/design-system/tokens.css`.

**⚠️ Doküman ile kod arasında bilinçli sapma var.** `tokens.css` renkleri
dokümandakinden daha koyudur (ör. success `#087158` ↔ doküman `#129C78`);
kontrast için böyle yapılmıştır. **Çakışmada `tokens.css` esastır**, doküman
güncellenmelidir.

**⚠️ İkon ailesi çelişkisi:** doküman "yalnız Lucide" der ama kurulu paket
`@phosphor-icons/react`'tır. Yeni ikon eklemeden önce Eray'a hangisinin
geçerli olduğunu sor.

Kaydedilmiş ihlal: `.booking-panel::after` panel geneline 0.045 opaklıkta logo
filigranı basar; dokümanın "metin üzerine filigran yasak" kuralına aykırıdır.

**⚠️ Stil katmanı 18.575 satır elle yazılmış CSS'tir** (11 dosya, 2.951 selector,
90 `!important`, 46 `z-index`), buna karşılık `tokens.css` yalnız 100 satırdır.
`admin.css` tek başına 8.496 satırdır. Tailwind 4 de kuruludur, yani iki sistem
yan yana çalışır. Yeni stil yazarken **önce token'a bak, yoksa token ekle** —
dosyanın sonuna kural eklemek borcu büyütür. z-index ölçeği başıboştur
(41, 45, 130, 145, 160); yeni bir katman gerekiyorsa adlandırılmış değişken tanımla.

## Ölçülmüş taban çizgisi (12.08.2026, düzeltmeler sonrası)

- Lighthouse masaüstü: Erişilebilirlik **100**, Best Practices **100**,
  SEO **100**, Agentic Browsing **100** — 55 denetim geçti, 0 başarısız.
- Konsol hatası: **0**. 320/390/1440'ta yatay taşma: **yok**.
- Backend 34 suite / 107 test, E2E 2 suite / 6 test, frontend 12 dosya /
  19 test — hepsi geçiyor. `npm run build` temiz.
- Hero videosu 1,96 MB'tır ama artık `preload="metadata"` ve 5,9 KB'lık
  gerçek poster (`ramazan-inanc-studio-poster.jpg`) kullanır.

**⚠️ Türkçe büyük harf tuzağı:** `BrandHeader`'daki marka bağlantısına
`aria-label` **yazma**. Marka adı CSS ile büyük harfe çevrildiği için "HAİR"
ile "Hair" noktalı `İ` yüzünden eşleşmiyor ve Lighthouse "görünen etiket
erişilebilir adla uyuşmuyor" hatası veriyor. Erişilebilir ad görünen metinden
gelmelidir.

## Slot ızgarası (12.08.2026'da değiştirildi)

Public ızgara artık sabit 60 dakika **değildir**;
`BranchBookingPolicy.publicSlotGranularityMinutes` alanına bağlıdır.

- `0` (varsayılan) → adım hizmet süresine eşitlenir. 30 dk hizmet 10.00, 10.30,
  11.00 diye ilerler. Bu değişiklik 30 dakikalık hizmetlerde satılabilir slot
  sayısını **11'den 22'ye** çıkardı.
- Pozitif değer → sabit adım. Eski davranış için `60` yazılır.
- Yönetici görünümü bundan bağımsız, her zaman 15 dakikadır
  (`ADMIN_SLOT_STEP_MINUTES`).

Alan Ayarlar ekranında **"Online saat aralığı (0 = hizmet süresi)"** olarak
düzenlenebilir. Salon günün fazla parçalanmasından şikâyet ederse önce bu değeri
yükselt, kodu değiştirme.

## Karar kapısı

```powershell
npm run db:status; npm run readiness
npm --prefix backend run test -- --runInBand
npm --prefix backend run test:e2e
npm --prefix frontend run lint; npm --prefix frontend run test
npm --prefix frontend run test:e2e
npm run build
```

`docs/QA_REPORT.md` Sprint 13'te kalmıştır (18 migration yazar, gerçekte **23**
migration vardır). Rapor güncellenmeden "QA geçti" denmez.

**⚠️ Politika DTO'su tam gövde bekler.** Yönetici ekranı `GET`'ten dönen
politika nesnesini olduğu gibi `PUT` gövdesine çevirir; `forbidNonWhitelisted`
açık olduğu için DTO'da tanımlı olmayan **her alan 400 üretir**. Bu yüzden
`BookingPolicyService.toDto` `createdAt`'i bilinçli olarak dışarıda bırakır.
Politikaya yeni alan eklerken beş yeri birlikte güncelle: Prisma şeması,
migration, `UpdateBookingPolicyDto`, `toDto` parametre tipi + `input()` eşlemesi,
ve frontend `AdminBookingPolicy` tipi.

## Bilinçli olarak dışarıda bırakılanlar

Netgsm canlı anahtarı, ödeme kuruluşu sözleşmesi, hosting/domain/TLS ve KVKK
hukuk onayı koddan sahte başarıyla geçilmez; `docs/EXTERNAL_SERVICES_CHECKLIST.md`
içinde "bekliyor" kalır.

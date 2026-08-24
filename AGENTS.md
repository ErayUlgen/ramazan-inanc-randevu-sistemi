# Ramazan İnanç Hair Art Studio — Codex Durum Kaydı

Bu dosya Codex ile Claude Code paralel çalışırken yerel çalışma durumunu ve
tekrar kullanılacak kesin çözümleri kaydeder. Ürün ayrıntıları için `CLAUDE.md`,
araç envanteri için `docs/CODEX_TOOLING_INVENTORY.md` okunur.

## Son doğrulanan yerel çalışma düzeni — 24.08.2026

Diğer projelerin varsayılan portlarıyla çakışmaması için Ramazan İnanç sistemi
aşağıdaki ayrı portlarda çalıştırıldı ve bütün adresler HTTP 200 ile doğrulandı:

- PostgreSQL: `5434`
- Backend API: `3107`
- Frontend: `5197`
- Müşteri ekranı: `http://127.0.0.1:5197/`
- Yönetici ekranı: `http://127.0.0.1:5197/admin`
- Müşteri hesabı: `http://127.0.0.1:5197/hesabim`
- API sağlık: `http://127.0.0.1:3107/api/health`

Başlatma sırası:

```powershell
docker compose up -d postgres

$env:PORT='3107'
npm --prefix backend run start:dev

$env:VITE_API_URL='http://127.0.0.1:3107/api'
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5197
```

## Çözülen başlatma tıkanıklığı

Belirti: Backend başlatıldıktan sonra sağlık isteği hazır olmadan zaman aşımına
uğruyor ve servis açılmamış sanılıyordu.

Kök neden: Docker Desktop kapalıyken PostgreSQL `5434` üzerinde dinlemiyordu.
Ayrıca NestJS geliştirme derlemesi bu projede yaklaşık 40 saniye sürebiliyor;
kısa bekleme süresi servis hazır olmadan bitiyordu.

Kesin çözüm: Önce Docker Desktop ve `ramazan-inanc-postgres` konteyneri sağlıklı
duruma getirilir. Ardından backend boş `3107` portunda başlatılır ve sağlık
isteği için en az 60 saniye beklenir. Başka projelerin süreçleri öldürülmez.
Frontend mutlaka aynı backend adresini `VITE_API_URL` ile alarak başlatılır.

### Geliştirme servisleri kapalıysa — 24.08.2026

Belirti: Tarayıcı `5197` adresini açmıyor ve API istekleri bağlantı reddiyle
sonuçlanıyor; PostgreSQL `5434` üzerinde çalışmaya devam ediyor.

Kök neden: Veritabanı konteyneri kalıcı olsa da Vite frontend ile NestJS backend
geliştirme süreçleri terminal oturumlarına bağlıdır. İlgili terminal süreçleri
kapandığında `5197` ve `3107` portlarında dinleyici kalmaz.

Kesin çözüm: Başka projelerin süreçlerine dokunmadan backend
`$env:PORT='3107'; npm run start:dev`, frontend ise
`$env:VITE_API_URL='http://127.0.0.1:3107/api'; npm run dev -- --host 127.0.0.1 --port 5197`
ile yeniden başlatılır. Sonrasında `/`, `/admin/services` ve `/api/health`
adreslerinin üçünün de HTTP 200 verdiği doğrulanır.

## Depo durumu

24.08.2026 kontrolünde Git deposunun henüz commit'i yoktu ve proje dosyalarının
tamamı izlenmeyen durumdaydı. Kullanıcı açıkça istemeden commit, push veya dosya
silme işlemi yapılmaz.

## Araç kurulum güncellemesi — 24.08.2026

- Google Drive Codex eklentisi `0.1.11` kuruldu. Salt okunur arama çağrısı
  başarıyla sonuçlandı; bağlantı kullanılabilir durumdadır.
- Codex Security eklentisi `0.1.21` kuruldu ve araçları oturumda görünür hâle
  geldi.
- GitHub Codex eklentisi `0.1.11-5f7cd798dc99` kuruldu. `ErayUlgen/ShiftSync`
  deposunda salt okunur arama çağrısı başarıyla sonuçlandı.
- Cloudflare Codex eklentisi `0.1.2` kuruldu; OpenAPI ve dokümantasyon araçları
  oturumda görünür hâle geldi.
- Firecrawl CLI `1.19.6` kuruldu, tarayıcı hesap doğrulaması tamamlandı ve
  `https://firecrawl.dev` üzerinde gerçek scrape çağrısı başarıyla çalıştı.
- `typescript-language-server 6.0.0` ve `TypeScript 7.0.2` global kuruldu.
- Firecrawl çıktıları projede izlenmesin diye `.firecrawl/` `.gitignore` içine
  eklendi.
- `codex mcp list` Windows Store paket izni nedeniyle bu oturumda
  `Erişim engellendi` hatası veriyor. MCP kurulum durumu `~/.codex/config.toml`
  bölüm adları ve oturumdaki gerçek araç çağrılarıyla doğrulanır; komutun tek
  başına çalışmaması sunucuların bozuk olduğu anlamına gelmez.

## Tasarım ekran denetimi — 24.08.2026

- Kod ve çalışan uygulama üzerinden 19 ana görsel yüzey ile rezervasyonun beş
  adımı çıkarıldı. Kalıcı denetim ve ekran-skill eşlemesi
  `docs/DESIGN_SCREEN_AUDIT_2026-08-24.md` dosyasındadır.
- Müşteri, müşteri hesabı, dış değerlendirme/bekleme listesi ve yönetici
  yüzeyleri 1440×1000 ile 390×844 görünüşlerinde incelendi.
- En kritik tasarım sorunları: mobil admin kontrol bloğunun ilk ekranı tamamen
  kaplaması, ikon-only admin navigasyonu, müşteri arama sonuçlarının seçili
  profilin önüne geçebilmesi, public review header logosunun açık zeminde
  görünmemesi, çok renkli uzman monogramları ve tekrarlanan büyük kart kalıbıdır.
- Ölçümde 110 hover kuralına karşı yalnız 2 CSS `:active` kuralı bulundu. Ortak
  basma geri bildirimi ve pointer koşullu hover sonraki foundation sprintinin
  zorunlu maddesidir.
- Lighthouse masaüstü ve mobilde erişilebilirlik, best practices ve SEO 100
  verdi. Ana rezervasyon yüklemesinde LCP 2.751 ms ölçüldü; bunun 2.312 ms'lik
  kısmı LCP kaynağını keşfetme/yüklemeye başlama gecikmesidir.
- 21st.dev yalnız ücretsiz arama için kullanıldı; `get_component` hakkı
  tüketilmedi. Higgsfield üretimi yapılmadı ve kredi harcanmadı.

## Çözülen frontend/backend kaynak izni — 24.08.2026

Belirti: Frontend diğer projelerle çakışmaması için `5197` portunda açıldığında
hesap ve yönetici API istekleri tarayıcıda `Failed to fetch` ile sonuçlanıyordu.

Kök neden: Backend geliştirme CORS listesi yalnız Vite'ın eski portlarını kabul
ediyor, `http://127.0.0.1:5197` ve `http://localhost:5197` adreslerini güvenli
kaynak olarak tanımıyordu.

Kesin çözüm: `backend/src/main.ts` geliştirme kaynak listesine iki `5197`
adresi eklendi, backend yeniden derlenip başlatıldı ve
`http://127.0.0.1:3107/api/health` HTTP 200 ile doğrulandı. Bu port düzeniyle
yerel tasarım denetiminde API istekleri çalışır.

## Tasarım yenileme — ilk sayfa tamamlandı — 24.08.2026

- Tasarım otoritesi `.superdesign/design-system.md` altında sabitlendi:
  sinematik koyu marka sahnesi, aydınlık ve yoğun operasyon yüzeyleri, Archivo
  + Source Sans 3, siyah ana eylemler, mint anlam rengi ve keskinleştirilmiş
  6/8/10/12 px köşe sistemi.
- Projenin gerçek ikon ailesinin Phosphor olduğu doğrulandı ve tasarım belgesinde
  yanlış yazılan Lucide kararı düzeltildi. Kontrollerde bold, sakin durumlarda
  duotone, seçili durumda fill ağırlığı kullanılır.
- Ortak design tokenları, Button basma geri bildirimi, pointer koşullu hover,
  Sheet giriş/çıkış süreleri ve mobil dokunma hedefleri tek sisteme alındı.
- Yönetici kabuğu ile `/admin` randevu ekranı yenilendi. 1360 px ve üstünde
  yazılı açık sidebar; daha dar ekranlarda erişilebilir menü drawer'ı kullanılır.
- Komut alanındaki görünüm, tarih, filtre, arama ve yeni randevu kontrolleri
  yeniden oranlandı. Mobilde filtreler açılır panel içinde tutulur ve ana görev
  ilk ekranda görünür kalır.
- Günlük akış 804 px asgari takvim genişliğine ve 148 px uzman kolonlarına
  çekildi. 1440 px kontrolde Ramazan İnanç, Hikmet Çetin Aygördü, Ali Poyraz
  Yılmaz, Velihan Uluşan ve Mustafa Akpiliç aynı görünümde eksiksiz yer aldı.
- 390 px kontrolde yatay taşma ve 44 px altındaki görünür buton kalmadı.
- Son doğrulama: frontend lint geçti; 12 test dosyasında 19 test geçti;
  production build tamamlandı. Chrome/Playwright kontrollerinde konsol ve ağ
  hatası yoktu. Lighthouse mobil ve masaüstünde erişilebilirlik ile best
  practices puanları 100 olarak korundu. Admin'in arama motorlarına kapalı
  tutulması nedeniyle SEO denetimindeki crawl uyarısı bilinçli davranıştır.
- QA görüntüleri `.impeccable/review/admin-randevular-desktop.png` ve
  `.impeccable/review/admin-randevular-mobile.png` konumundadır.
- Sıradaki ekran grubu: müşteri yönetimi ve uzun yönetici formları. Önce
  `/admin/customers`, ardından katalog/form yüzeyleri aynı kabuk içinde ele
  alınacaktır.

## Tasarım yenileme — müşteri yönetimi tamamlandı — 24.08.2026

- `/admin/customers` masaüstünde müşteri dizini + profil çalışma alanı olarak
  yeniden kuruldu. Arama dizini sabit ve kompakt kaldı; profil seçildiğinde
  kimlik, ana eylemler, ölçümler, iç not, bakım hafızası ve randevular tek bir
  okunabilir akışta toplandı.
- Mobilde dizin ile profil aynı anda uzun bir sayfaya yığılmıyor. Müşteri
  seçildiğinde profil açılıyor; `Müşteri değiştir` ile dizine, `Profili göster`
  ile seçili kayda dönülüyor.
- Uzun randevu geçmişi ilk beş kayıtla sınırlandı; kalan kayıtlar istek üzerine
  açılıyor. Boş randevu alanları ekranı gereksiz uzatmayan kompakt duruma
  çekildi.
- Bakım profili, hizmet kayıtları ve etiketler gerçek sekme semantiğine
  bağlandı. Yinelenen müşteri birleştirme aracı ayrıntı paneline alındı ve
  birleştirme öncesinde doğal dilli onay penceresi eklendi; ham JSON önizlemesi
  kaldırıldı.
- Ham ana eylemler ortak Button bileşenine taşındı. Basma geri bildirimi,
  pointer koşullu hover, görünür focus, 44 px mobil hedef ve reduced-motion
  karşılığı doğrulandı.
- Bütün görünen form alanlarına `id`/`name` eklendi. Marka bağlantısının
  erişilebilir adı görünür içeriğinden türetildi; sidebar rol metni kontrastı
  yükseltildi.
- Son doğrulama: frontend lint geçti; 12 test dosyasında 19 test geçti;
  production build tamamlandı. 1440, 390 ve 320 px kontrollerinde yatay taşma
  yoktu. Chrome konsolunda hata/uyarı/issue kalmadı. Lighthouse erişilebilirlik,
  best practices, SEO ve agentic browsing puanları 100 oldu. Impeccable
  anti-slop denetimi bulgu üretmedi.
- Sıradaki sayfa `/admin/services`; hizmet kataloğu ile ekleme/düzenleme formu
  aynı yoğun ve responsive çalışma alanı standardına taşınacaktır.

## Tasarım yenileme — hizmet kataloğu tamamlandı — 24.08.2026

- `/admin/services` ekranı kategori gruplu, kompakt hizmet dizini olarak yeniden
  kuruldu. Arama hizmet adı, kategori, açıklama ve uzman adlarında çalışıyor;
  toplam, aktif ve online hizmet sayıları üst alanda özetleniyor.
- Hizmet ekleme/düzenleme işlemi sağdan açılan, odak tuzağı ve klavye desteği
  bulunan bir çalışma paneline taşındı. Temel bilgiler, rezervasyon akışı, uzman
  eşleşmesi ve yayın durumu ayrı bölümlerde toplandı.
- Panel gerçek Checkbox, Switch, Input, Textarea, Sheet ve AlertDialog
  bileşenlerini kullanıyor. Kaydedilmemiş değişiklikte doğal dilli uyarı açılıyor;
  kapatıldığında odak işlemi başlatan hizmet satırına geri dönüyor.
- Mobilde kategori ve hizmet listesi tek kolona düşüyor; düzenleme panelinin
  gövdesi dikey kayıyor ve alt eylem alanı görünür kalıyor. 390 px kontrolde
  yatay taşma, gizlenen form bölümü veya erişilemeyen uzman seçeneği kalmadı.
- CSS kök neden kaydı: `service-category` sınıf adı public rezervasyon CSS'iyle
  çakışarak yönetici kategorilerini gizliyordu. Yöneticiye özgü sınıflar
  `admin-service-category*` olarak adlandırıldı.
- Mobil panel kök neden kaydı: sabit yüksekliğe sahip grid, satırları eşit
  sıkıştırdığı için kategori, fiyat ve uzman eşleşmeleri görünmüyordu.
  `.service-editor-scroll` üzerinde `grid-auto-rows: max-content` kullanılarak
  her bölüm gerçek içeriği kadar yer kaplar hâle getirildi.
- Başlatma kök neden kaydı: backend `PORT` verilmeden açıldığında varsayılan
  `3000` portuna gidiyor ve başka uygulamayla `EADDRINUSE` çakışması oluşuyor.
  Bu proje için doğru komut `$env:PORT='3107'; npm run start:dev` komutudur.
- Son doğrulama: frontend lint, 12 dosyada 19 frontend testi ve production
  build; backend 34 pakette 107 test ve production build başarılı. Playwright
  akışında 7 hizmet, 5 uzman eşleşmesi, iki yayın anahtarı, kaydedilmemiş
  değişiklik uyarısı ve odak dönüşü doğrulandı. Chrome konsolunda hata kalmadı;
  Lighthouse mobil ve masaüstünde erişilebilirlik ile best practices 100;
  Impeccable anti-slop taraması 0 bulgu verdi.

## Test verisi temizliği — 24.08.2026

- Temizlik öncesi PostgreSQL yedeği
  `artifacts/backups/ramazan-inanc-before-clean-2026-08-24.dump` konumuna alındı.
  SHA-256: `6D6689D5AD00CAAEBECB2C90E76603245C49F52FE803233D5DFD02E2A674E985`.
- Müşteri, randevu, bildirim, değerlendirme, bekleme listesi, işlem geçmişi,
  oturum, geçici zaman bloğu ve tarih istisnası kayıtları transaction içinde
  temizlendi. Test yöneticisi `eray123` kaldırıldı.
- Gerçek ürün iskeleti korundu: 1 şube, 5 uzman, 7 hizmet, 35 uzman-hizmet
  eşleşmesi, 7 haftalık çalışma aralığı, 1 bildirim kuralı ve `owner` yönetici.
- Temizlik sonrası müşteri, randevu, değerlendirme, bildirim, bekleme listesi,
  oturum, denetim kaydı, zaman bloğu ve tarih istisnası tablolarının boş olduğu
  sayımla doğrulandı.
- Sıradaki sayfa `/admin/professionals`; uzman kataloğu ve uzman düzenleme paneli
  aynı çalışma alanı standardına taşınacaktır.

# Ramazan İnanç Hair Art Studio — Ekran Envanteri ve Tasarım Araç Haritası

Tarih: 24.08.2026  
Durum: Araştırma ve tasarım denetimi tamamlandı; uygulama dalgaları aşağıda
kayıt altına alınmaktadır.

## 1. Amaç ve yöntem

Bu çalışma, uygulamadaki bütün kullanıcı yüzeylerini tek tek bulmak, çalışan
ekranlarda görsel denetim yapmak ve her yüzeyde hangi tasarım skill'i ile hangi
aracın gerçekten gerekli olduğunu belirlemek için hazırlandı.

İnceleme şu sırayla yapıldı:

1. React rota ve bileşenleri koddan çıkarıldı.
2. Müşteri, müşteri hesabı ve yönetici ekranları çalışan uygulamada açıldı.
3. 1440×1000 ve 390×844 görünüşleri kontrol edildi.
4. Chrome DevTools ile erişilebilirlik, konsol, ağ ve performans tabanı ölçüldü.
5. `impeccable` dedektörüyle jenerik arayüz belirtileri tarandı.
6. Hareket kodu; hover, active, reduced-motion ve sayfa geçişleri açısından
   sayısal olarak incelendi.
7. 21st.dev üzerinde rezervasyon, takvim ve yönetim paneli örnekleri arandı.
   Bileşen indirilmedi; günlük ücretsiz hak kullanılmadı.

## 2. Mevcut ürün yönü — korunacak kararlar

Ana tasarım yönü `.superdesign/design-system.md` içindeki **Cinematic Editorial
Utility** yaklaşımıdır:

- Marka alanı karanlık, sinematik ve kimlik odaklıdır.
- İş alanı aydınlık, serin tonlu ve görev odaklıdır.
- Source Sans 3 gövde, Archivo başlık ailesidir.
- Ana eylem rengi kömüre yakın siyahtır; yeşil güven ve durum rengidir.
- Mavi ve turuncu ana arayüz paletine ait değildir.
- Büyük kapsül köşeler, kart içinde kart ve her alanda aynı kart kalıbı yasaktır.
- Müşteri tarafı sakin; admin tarafı daha yoğun olmalıdır.

Kod ve belge çeliştiğinde mevcut `tokens.css` kontrast renkleri esas alınır.
Tasarım iyileştirmesi, bugünkü marka sahnesini silmek değil; iş yüzeylerini daha
az şablon, daha net ve daha canlı hâle getirmektir.

## 3. Gerçek ekran envanteri

Toplam 19 ana yüzey bulundu. Rezervasyon akışı kendi içinde beş ana durumdan
oluşur; çekmece, modal ve boş/hata durumları ayrıca ele alınır.

### 3.1 Müşteriye açık yüzeyler

1. `/` — Rezervasyon akışı
   - Hizmet seçimi
   - Uzman seçimi
   - Tarih ve saat seçimi
   - Kimlik / onay
   - Yönetici onayı bekleniyor sonucu
2. `/degerlendir/:token` — Ziyaret sonrası değerlendirme
3. `/bekleme-listesi/*` — Bekleme listesine katılım
4. `/randevum/*` — Eski bağlantı yönlendirmesi; ayrı görsel ekran üretmez
5. `/katilim/:token` — Müşteri hesabına yönlendirme; ayrı görsel ekran üretmez

### 3.2 Müşteri hesabı yüzeyleri

6. `/hesabim` — Telefon/SMS ile giriş
7. `/hesabim` — Randevu özeti: işlem bekleyen, yaklaşan, geçmiş
8. `/hesabim/profil` — Kimlik, iletişim ve bildirim tercihleri
9. `/hesabim/randevular/:publicCode` — Randevu detayı ve işlemleri

### 3.3 Yönetici yüzeyleri

10. `/admin` — Yönetici girişi
11. `/admin` — Gün/hafta/liste randevu merkezi
12. `/admin/requests` — Onay bekleyen talepler
13. `/admin/waitlist` — Bekleme listesi
14. `/admin/customers` — Müşteri arama, profil, bakım notları ve geçmiş
15. `/admin/services` — Hizmet kataloğu
16. `/admin/professionals` — Uzman kataloğu
17. `/admin/schedule` — Salon saatleri, özel gün ve zaman blokları
18. `/admin/reviews` — Salon ve uzman değerlendirmeleri
19. `/admin/team-access` — Yönetici/ekip erişimi
20. `/admin/reports` — Operasyon raporları
21. `/admin/settings` — Şube ve bildirim ayarları

Not: Yönlendirme ekranları görsel yüzey sayılmadığında sayı 19'dur; bütün URL
davranışları sayıldığında yukarıdaki listede 21 kalem görünür.

### 3.4 İkincil yüzeyler ve durumlar

- Yönetici manuel randevu çekmecesi
- Randevu detay çekmecesi
- Randevu düzenleme dialogu
- Hizmet ve uzman düzenleme dialogları
- Özel gün ve zaman bloğu formları
- Loading, skeleton, empty, error, success, selected, disabled ve expired
  durumları
- Masaüstü sticky özet ve mobil sticky eylem barı

## 4. Ölçülmüş taban çizgisi

### 4.1 Sağlam taraflar

- Lighthouse masaüstü: erişilebilirlik 100, best practices 100, SEO 100.
- Lighthouse mobil: erişilebilirlik 100, best practices 100, SEO 100.
- Ana rezervasyon sayfasında CLS 0,01; yerleşim kayması düşük.
- Klavye erişilebilir adları genel olarak doğru.
- `useReducedMotion` yaygın biçimde kullanılmış; 44 kaynak eşleşmesi var.
- `AnimatePresence` 24 eşleşmeyle temel ekran geçişlerinde zaten mevcut.
- Mobil rezervasyon akışı gerçekten yeniden düzenlenmiş; yalnız küçültülmüş
  masaüstü görünümü değil.

### 4.2 Teknik tasarım borcu

- 11 CSS dosyasında yaklaşık 18.552 satır stil var.
- 90 `!important` ve 44 `z-index` tanımı bulunuyor.
- 135 ham `<button>` kullanımına karşı 57 ortak `Button` kullanımı var.
- 110 hover kuralına karşı yalnız 2 CSS `:active` kuralı var.
- Ortak `Button` basılı durumda yalnız 1 px aşağı iner; Kowalski standardındaki
  kısa ve fiziksel 0,96–0,98 ölçek karşılığı yok.
- Hover sınıflarının büyük kısmı `hover: hover` ve `pointer: fine` koşuluna bağlı
  değil; dokunmatik cihazda yapışkan hover riski var.
- Bir `transition: width` bulunuyor; genişlik animasyonu yerleşim hesaplatır.
- Shadcn sheet bileşeninde UI için önerilmeyen `ease-in-out` kullanılıyor.
- Tasarım belgesi Lucide derken kodda 240 Phosphor importu, 0 Lucide importu var.
  Bu teknik olarak kötü değil; fakat doküman ile gerçek ikon kararı birleşmeli.

### 4.3 `impeccable` dedektör bulguları

Dedektör aşağıdaki tekrarları hazır şablon/AI belirtisi olarak işaretledi:

- `admin.css` içinde çok sayıda sol renk şeridi (`side-tab`)
- `booking.css`, `bookingAccess.css` ve `customerAccount.css` içinde aynı şerit
  imzasının tekrarı
- Admin arka planında dekoratif kareli grid
- Genişlik üzerinden animasyon

Bu bulgular tek başına hata değildir. Sorun, aynı imzanın farklı ürün
yüzeylerinde tekrar edilerek tasarımın kendini sürekli tekrar etmesidir.

## 5. Global tasarım teşhisi

### Güçlü kalanlar

- Video kullanılan marka sahnesi projeye özel ve akılda kalıcı.
- Siyah/yeşil/soğuk açık yüzey dengesi önceki sürümlerden daha tutarlı.
- Metin ağırlıkları ve kontrast çoğu ana ekranda güçlü.
- Rezervasyonun dört adımı kolay anlaşılır.
- Tarih/saat ekranı görev odaklı ve hızlı taranıyor.

### AI/şablon hissini üreten birleşik nedenler

1. **Aynı çerçeve her yerde:** büyük başlık kartı + filtre kartı + eşit KPI
   kartları + içerik kartı düzeni adminin neredeyse her sayfasında tekrarlanıyor.
2. **Renkli monogramlar:** uzmanlar için siyah, mavi, yeşil, amber ve mor
   gradient rozetler salon markasından çok oyunlaştırılmış SaaS hissi veriyor.
3. **Dev boş durumlar:** çok az bilgi için bütün ekran yüksekliğini kaplayan
   boş kartlar ürün yoğunluğunu düşürüyor.
4. **İkon-only navigasyon:** masaüstünde bile yalnız simge görünen admin menüsü
   güçlü görünse de keşfedilebilirliği ve marka karakterini azaltıyor.
5. **Kart içinde kart:** müşteri hesabı ve admin formlarında yüzeyler gereğinden
   fazla iç içe giriyor.
6. **Tekrarlanan üst etiketler:** her bölümde büyük harfli eyebrow kullanımı
   editoryal işaret olmaktan çıkıp şablon imzasına dönüşüyor.
7. **Hareket tek yönlü:** hover çok, basma geri bildirimi az. Bu yüzden arayüz
   hareketli görünse de fiziksel his vermiyor.
8. **Belge/kod ayrışması:** ikon ailesi ve bazı token kararları aynı kaynaktan
   yönetilmediği için yeni ekranlar mevcut karakterden sapabiliyor.

## 6. Ekran bazında denetim ve skill eşlemesi

Öncelik tanımı:

- P0: görevi engelliyor veya ciddi hata
- P1: ana kullanım kalitesini belirgin düşürüyor
- P2: görsel karakter/cila sorunu
- P3: sonra yapılabilecek iyileştirme

### 6.1 Rezervasyon — hizmet seçimi

**Mevcut güçlü taraf:** İlk görev mobilde de görünür; tek hizmet kuralı açık;
erkek/kadın ayrımı anlaşılır.

**Sorunlar:** Kart geometrisi ve radyo dairesi hazır form hissi veriyor. Aynı
kategori metni her kartta tekrar ediyor. Filigran bazı kart metinlerinin altına
giriyor. Seçim hissi sınır + küçük daireye fazla dayanıyor.

**Öncelik:** P1 filigran/tekrar, P2 kart dili.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `redesign-existing-projects` →
`impeccable` → `design-system` → `emil-design-eng` → `ui-styling`.

**Araçlar:** shadcn Toggle Group/Radio Group mantığı incelenir; Iconify yalnız
ortak ikon ailesi seçildikten sonra kullanılır. Higgsfield gerekmez.

### 6.2 Rezervasyon — uzman seçimi

**Mevcut güçlü taraf:** İlk müsait uzman öne çıkıyor; beş uzmanın tamamı var.

**Sorunlar:** Gradient monogramlar marka dışı ve yapay görünüyor. Beşli dizide
son kart tek başına kalıyor. Uzman kartlarının hiyerarşisi ad/numara/rozet
üçlüsüne fazla dayanıyor.

**Öncelik:** P1 kimlik dili, P2 odd-grid yerleşimi.

**Gerekli skill zinciri:** `brand` → `design-system` →
`redesign-existing-projects` → `emil-design-eng`.

**Araçlar:** Gerçek personel fotoğrafı sağlanırsa mevcut marka varlığı kullanılır;
stok insan fotoğrafı veya yapay portre kullanılmaz. Higgsfield kullanılmaz.

### 6.3 Rezervasyon — tarih ve saat

**Mevcut güçlü taraf:** Saatler ana karar alanı; 15 dakikalık boşluk mantığı
ekranda doğru temsil ediliyor. Mobil dokunma alanları yeterli.

**Sorunlar:** Gün kartları ve saat kartları aynı yumuşak gri kalıbı tekrar ediyor;
seçili gün/saat geçişi daha fiziksel olabilir. Loading skeleton ile gerçek kart
geometrisi tam eşleşmeli.

**Öncelik:** P2 cila.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `design-system` →
`emil-design-eng` → `motion` → `review-animations`.

**21st sonucu:** Appointment Picker Calendar (25340), Coach Scheduling Card
(2554) ve Calendar with Booked Days (25334) yalnız davranış referansıdır. Marka
stili doğrudan alınmaz.

### 6.4 Rezervasyon — kimlik/onay ve sonuç

**Mevcut güçlü taraf:** Telefon geç isteniyor; onay beklediği doğru anlatılıyor.

**Sorunlar:** Form ve sonuç yüzeylerinde tekrar eden güven metinleri azaltılmalı;
başarı/bekleme ikonları tek bir durum ailesinden gelmeli. Geliştirme OTP bilgisi
production yüzeyinden kesin ayrılmalı.

**Öncelik:** P1 içerik yoğunluğu, P2 durum dili.

**Gerekli skill zinciri:** `ui-styling` → `ask-sonner` →
`emil-design-eng` → `impeccable`.

### 6.5 Müşteri hesabı — giriş

**Mevcut güçlü taraf:** Karanlık marka bandı ve açık form yüzeyi birbirine bağlı;
alan etiketleri okunur.

**Sorunlar:** Büyük beyaz form kartı genel giriş şablonlarına yaklaşıyor. Formun
kapladığı alan bilgi miktarından fazla. Giriş ile yeni rezervasyon arasındaki
öncelik daha net kurulabilir.

**Öncelik:** P2 yoğunluk ve özgünlük.

**Gerekli skill zinciri:** `redesign-existing-projects` →
`high-end-visual-design` → `ui-styling` → `emil-design-eng`.

### 6.6 Müşteri hesabı — randevular

**Mevcut güçlü taraf:** Bekleyen/yaklaşan/geçmiş ayrımı açık; metinler taranıyor.

**Sorunlar:** Az veride büyük boşluk, çok veride uzun sayfa oluşuyor. Mobil sabit
menünün son kayıtlarla çakışmaması için alt güvenli alan her durumda ölçülmeli.
Kartların tamamı aynı önem düzeyinde görünüyor.

**Öncelik:** P1 mobil alt boşluk, P2 liste yoğunluğu.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `minimalist-ui` →
`design-system` → `emil-design-eng`.

### 6.7 Müşteri hesabı — profil

**Mevcut güçlü taraf:** Alan grupları anlaşılır; bildirim tercihleri ayrılmış.

**Sorunlar:** Kart içinde kart ve büyük çevre çerçeveleri formu olduğundan daha
uzun gösteriyor. Kaydedilmemiş değişiklik ve başarı geri bildirimi daha belirgin
ama sakin olmalı.

**Öncelik:** P2.

**Gerekli skill zinciri:** `ui-styling` → `design-system` →
`ask-sonner` → `emil-design-eng`.

### 6.8 Müşteri hesabı — randevu detayı

**Mevcut güçlü taraf:** Tarih/saat çizgisi ve sağ özet güçlü; temel bilgiler net.

**Sorunlar:** Bilgiler fazla sayıda çerçeveli parçaya ayrılıyor. İptal edilmiş
durumda kullanılan saat benzeri simge semantik olarak zayıf. İkincil eylemler
aynı ağırlıkta görünmemeli.

**Öncelik:** P2.

**Gerekli skill zinciri:** `impeccable` → `minimalist-ui` →
`design-system` → `iconify`/tek ikon ailesi → `emil-design-eng`.

### 6.9 Ziyaret değerlendirmesi

**Mevcut güçlü taraf:** Geçerli formun puan + kısa yorum akışı sade; uzman bilgisi
doğrudan görünüyor.

**Sorunlar:** Hata ekranında logo işareti ve alt marka yazısı açık yüzeyde
neredeyse görünmiyor. Yıldız düğmeleri ortak Button sisteminin dışında; focus,
active ve mobil geri bildirimi ayrıca doğrulanmalı.

**Öncelik:** P0 marka görünürlüğü, P1 yıldız etkileşimi.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `ui-styling` →
`emil-design-eng` → `review-animations` → `impeccable`.

**Durum — 26.08.2026:** Tamamlandı. Resmî koyu marka başlığı hem açık formda
hem hata durumunda görünür hâle getirildi. Yıldız seçimi gerçek radio grubu ve
klavye yön tuşlarıyla çalışıyor; 48×50 px dokunma alanı, focus ve basma geri
bildirimi doğrulandı. Tekrarlanan uzman açıklaması kaldırıldı, form metni
kısaltıldı, ham ağ hatası Türkçe açıklama ve yeniden deneme yoluna çevrildi.
1440, 390 ve 320 px görünüşlerde taşma kalmadı; Lighthouse erişilebilirlik,
best practices, SEO ve agentic browsing denetimleri masaüstü ve mobilde 100.

### 6.10 Bekleme listesi

**Mevcut güçlü taraf:** Marka başlığı tutarlı; tek görevli form anlaşılır.

**Sorunlar:** Form kartı ilk ekranın çoğunu kaplıyor ve genel utility-form hissi
veriyor. Hizmet/uzman bilgisi query olmadan açıldığında zayıf fallback metni var.

**Öncelik:** P1 eksik bağlam durumu, P2 form yoğunluğu.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `ui-styling` →
`impeccable` → `emil-design-eng`.

### 6.11 Yönetici girişi

**Mevcut güçlü taraf:** Tek baskın işlem var, etiketler görünür.

**Sorunlar:** İki kolonlu giriş düzeni temiz olsa da markaya özel operasyon
karakteri az. Parola görünürlük butonu ve form geri bildirimi ortak kontrol
sistemine tam bağlanmalı.

**Öncelik:** P2.

**Gerekli skill zinciri:** `redesign-existing-projects` →
`ui-styling` → `emil-design-eng` → `ask-sonner`.

### 6.12 Yönetici kabuğu ve navigasyon

**Mevcut güçlü taraf:** Masaüstünde geniş iş alanı kalıyor; bölümler erişilebilir
adlara sahip.

**Sorunlar:** Masaüstünde menü yaklaşık 104 px ve yalnız ikon gösteriyor. Kullanıcı
hangi simgenin ne olduğunu ezberlemek zorunda. Mobilde yatay ikon şeridi taşarak
bağlamı kaybediyor. Üst bar başlığı ile sayfa içi dev başlık sık sık tekrarlanıyor.

**Öncelik:** P1.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `redesign-existing-projects` →
`design-system` → `ui-styling` → `emil-design-eng` → `motion`.

**21st sonucu:** Settings Sidebar Accordion (24875), Sidebar (2737) ve Dashboard
Sidebar (14941) yalnız bilgi mimarisi referansıdır. Workbench Sidebar (19357)
glassmorphism nedeniyle bilinçli olarak reddedildi.

### 6.13 Yönetici randevu merkezi

**Mevcut güçlü taraf:** Gün/hafta/liste, tarih, filtreler, özet ve günlük akış aynı
üründe birleşiyor. Beş uzman masaüstünde erişilebilir.

**Sorunlar:** Mobilde kontrol bloğu bütün ilk ekranı kaplıyor; gerçek randevular
çok aşağıda başlıyor. Masaüstünde boş kuyruk alanı gereğinden yüksek. Komutlar
iki ayrı sıraya bölünerek ritmi yavaşlatıyor.

**Öncelik:** P1 mobil görev erişimi, P1 boş alan, P2 filtre ritmi.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `redesign-existing-projects` →
`design-system` → `pick-ui-library` → `ui-styling` → `emil-design-eng`.

**21st sonucu:** Scheduler (7316), Daily Timeline Scheduler (7317), Calendar
Scheduler (8228) ve Calendar Planner (8201) yoğunluk ve kolon davranışı için
referanstır; hazır tema olarak alınmaz.

### 6.14 Talepler ve yönetici bekleme listesi

**Mevcut güçlü taraf:** Boş durum metni açık; işlem sırası belli.

**Sorunlar:** Dev başlık kartı + dev boş durum kartı aynı anda kullanılıyor.
Sayfa veri yokken bile ağır ve uzun. İki ekran birbirinin kopyası gibi.

**Öncelik:** P1 gereksiz alan, P2 özgün durum dili.

**Gerekli skill zinciri:** `minimalist-ui` → `impeccable` →
`design-system` → `emil-design-eng`.

### 6.15 Müşteri yönetimi

**Mevcut güçlü taraf:** Bakım profili, hizmet kayıtları ve etiketler değerli;
gerçek salon hafızası oluşuyor.

**Sorunlar:** Arama sonuçları ile seçili müşteri detayı aynı uzun kaydırma
bağlamında üst üste biniyor. Sayfa aşağı kaydırıldığında sonuç paneli profilin
önüne geçebiliyor. Bilgi mimarisi tek kolon içinde gereğinden uzun.

**Öncelik:** P0/P1 yerleşim ve kaydırma bağlamı.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `redesign-existing-projects` →
`design-system` → `ui-styling` → `emil-design-eng`.

### 6.16 Hizmet kataloğu

**Mevcut güçlü taraf:** Hizmet adı, süre, fiyat ve aktiflik birlikte okunuyor.

**Sorunlar:** Aynı makas ikonu her satırda dekorasyona dönüşüyor; düzenleme
affordance'ı (tıklanabilirlik işareti) zayıf. Başlık yüzeyi veri tablosundan daha
fazla yer kaplıyor.

**Öncelik:** P1 tıklanabilirlik, P2 yoğunluk.

**Gerekli skill zinciri:** `minimalist-ui` → `ui-styling` →
`design-system` → `emil-design-eng`.

### 6.17 Uzman kataloğu

**Mevcut güçlü taraf:** Beş uzman ve çalışma durumu tek bakışta görülebiliyor.

**Sorunlar:** Çok renkli gradient monogramlar marka sistemini kırıyor. Tek kalan
beşinci kart ve geniş boşluk dengesiz. Kartlar aynı bilgi için gereğinden büyük.

**Öncelik:** P1 marka, P2 grid.

**Gerekli skill zinciri:** `brand` → `design-system` →
`redesign-existing-projects` → `minimalist-ui`.

### 6.18 Çalışma düzeni

**Mevcut güçlü taraf:** Salon saatleri, özel gün ve geçici bloklar aynı yerde.

**Sorunlar:** Haftanın her günü için benzer alanların alt alta tekrar etmesi
sayfayı çok uzatıyor. Özel gün ve blok formları görsel olarak aynı ağırlıkta;
sıklıklarına göre önceliklenmemiş.

**Öncelik:** P1 form mimarisi.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `pick-ui-library` →
`ui-styling` → `design-system` → `emil-design-eng`.

### 6.19 Değerlendirmeler

**Mevcut güçlü taraf:** Salon ortalaması ve uzman bazlı ölçüm aynı sayfada.

**Sorunlar:** Büyük filtre kartı + dört eşit KPI + dağılım düzeni genel dashboard
şablonuna benziyor. Veri yokken ekran çok boş kalıyor.

**Öncelik:** P2 veri hikâyesi ve yoğunluk.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `minimalist-ui` →
`design-system` → `impeccable`.

### 6.20 Ekip erişimi

**Mevcut güçlü taraf:** Yetki alanları görünür ve işlevsel.

**Sorunlar:** Tam genişlikte dev form alanları az bilgi için fazla yer kaplıyor.
Rol etkileri formdan önce yeterince açıklanmıyor; güvenlik kararı ile veri girişi
aynı görsel ağırlıkta.

**Öncelik:** P1 bilgi hiyerarşisi.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `ui-styling` →
`design-system` → `impeccable`.

### 6.21 Raporlar

**Mevcut güçlü taraf:** Tarih ve filtre alanları belirgin; ana metrikler mevcut.

**Sorunlar:** Yedi eşit kart birbirine rakip. Ana operasyon sorusu (kaç randevu,
ne kadar doluluk, hangi uzman) yerine kart kalıbı öne çıkıyor. Filtre/title
yüzeyleri tekrar ediyor.

**Öncelik:** P1 karar hiyerarşisi, P2 şablon hissi.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `minimalist-ui` →
`design-system` → `impeccable`.

### 6.22 Ayarlar

**Mevcut güçlü taraf:** Şube, bildirim ve operasyon ayarları eksiksiz.

**Sorunlar:** Çok uzun form, büyük input çiftleri ve tekrar eden çerçeveler.
Sık değişen ayarla nadir değişen kritik ayar aynı akışta. Kaydetme kapsamı ve
kirli form durumu daha görünür olmalı.

**Öncelik:** P1 bilgi mimarisi.

**Gerekli skill zinciri:** `ui-ux-pro-max` → `redesign-existing-projects` →
`ui-styling` → `design-system` → `ask-sonner` → `emil-design-eng`.

## 7. Zorunlu skill ve araç zinciri

### Her tasarım turunda

1. `ui-ux-pro-max` — palet, tipografi, düzen, erişilebilirlik ve UX kuralları
2. `redesign-existing-projects` — mevcut ekranı koruyup premium seviyeye çıkarma
3. `impeccable` — AI/şablon kokusu ve görsel hata denetimi
4. `design-system` — primitive → semantic → component token düzeni
5. `emil-design-eng` — basma hissi, easing, süre, giriş/çıkış cilası
6. `chrome-devtools` — ekran görüntüsü, konsol, ağ, Lighthouse ve performans
7. `playwright` — ana akış ve responsive regresyon testleri

### Yüzeye göre ek skill'ler

- Marka sahnesi: `brand`, `high-end-visual-design`, gerektiğinde `superdesign`
- Yoğun admin: `minimalist-ui`, `ui-styling`, `pick-ui-library`
- Hareket: `find-animation-opportunities`, `motion`, `review-animations`
- Toast/form geri bildirimi: `ask-sonner`
- Bileşen seçimi: shadcn + magicui + 21st.dev araması
- İkon: karar verilecek tek aile + Iconify; Lucide/Phosphor kararı karıştırılmaz

### Bu turda bilinçli olarak kullanılmayanlar

- `prototype`: Önce hangi yüzeyin yeniden tasarlanacağı kilitlenmeli; aynı anda
  19 ekran için varyant üretmek karar değil gürültü olur.
- `image-to-code`: Mevcut ürün kodu ve çalışan ekranlar varken ilk iş değildir.
- `awwwards-animations`: Operasyon paneline gösterişli hareket taşımak yanlış;
  marka sahnesinde ileride sınırlı kullanılabilir.
- `magicui`: Mevcut ihtiyaçların çoğu dekoratif değil yapısal. Sadece gerçekten
  uygun bir parça bulunduğunda alınır.

## 8. Higgsfield ve 21st.dev kararı

### 21st.dev

Arama ücretsiz kullanıldı. Şu aşamada `get_component` çağrısı yapılmadı; günlük
iki ücretsiz hak korunuyor. Sonraki uygulama turunda ancak seçilen ekran için
gerçekten zaman kazandıran bir parça varsa indirilir.

### Higgsfield

Bu denetim için özgün görsel üretmek gerekmiyor; dolayısıyla kredi harcanmadı.
Higgsfield ancak şu üç durumdan biri kilitlenirse değerlendirilmeli:

1. Gerçek salon çekimi gelmeden geçici ama markaya özel bir soyut doku gerekirse
2. Marka kullanım kılavuzu için özgün görsel kimlik panosu üretilecekse
3. Hero videosunun yerine/yanına gerçek kişi taklit etmeyen soyut sinematik
   geçiş varlığı gerekiyorsa

Personel portresi, müşteri fotoğrafı veya gerçek salon görüntüsü yerine yapay
insan üretmek uygun değildir. Her Higgsfield üretiminden önce gerçek kredi
maliyeti belirsizliği ve kalan bakiye kullanıcıya söylenip ayrıca onay alınır.

## 9. Hareket fırsatları — yalnız gerekli yerler

1. **Ortak basma geri bildirimi**  
   Yer: bütün gerçek button/anchor kontrolleri.  
   Öneri: 100–140 ms, 0,97–0,98 scale; klavye tetiklemesinde animasyon yok.  
   Neden: 110 hover/2 active dengesini düzeltir.

2. **Admin menü etiketi açılımı**  
   Yer: masaüstü sidebar ve mobil sheet.  
   Öneri: 180–220 ms opacity + 6 px translation; genişlik sürekli anime edilmez.  
   Neden: keşfedilebilirliği artırır, ikon ezberini kaldırır.

3. **Rezervasyon adım değişimi**  
   Yer: hizmet → uzman → saat → onay.  
   Öneri: mevcut yön hissi korunur, 6 px/280 ms; önce çıkan hızlı, giren yumuşak.  
   Neden: ilerleme anlaşılır, yerleşim sıçramaz.

4. **Seçili kart geri bildirimi**  
   Yer: hizmet, uzman, gün ve saat.  
   Öneri: kısa border/surface geçişi + tik görünümü; yaylı hareket çok sınırlı.  
   Neden: seçimin sisteme işlendiğini gösterir.

5. **Liste güncelleme geçişi**  
   Yer: admin filtre sonucu ve müşteri geçmişi.  
   Öneri: 160–200 ms içerik crossfade; skeleton gerçek satır geometrisiyle aynı.  
   Neden: eski verinin yeni veri sanılmasını engeller.

6. **Drawer/dialog**  
   Yer: manuel randevu, detay ve düzenleme yüzeyleri.  
   Öneri: giriş 240 ms ease-out; çıkış 160–180 ms daha hızlı.  
   Neden: ikincil iş alanının nereden geldiğini anlatır.

7. **Toast ve kaydetme durumu**  
   Yer: profil, ayarlar, katalog ve ekip erişimi.  
   Öneri: Sonner; tek satırlık net mesaj, yinelenen toast yok.  
   Neden: kaydın tamamlandığını sayfayı hareket ettirmeden doğrular.

### Hareket eklenmeyecek yerler

- Takvim saat çizgileri ve kolon yükseklikleri
- KPI kartlarının sürekli sayı sayması
- Her kartın hover'da yüzmesi
- Hero dışında sürekli dönen/dekoratif loop
- Gradient avatar, parıltı, confetti, 3D tilt ve lazer benzeri efektler

## 10. Önerilen uygulama sırası

1. **Design foundation düzeltmesi**  
   Tokenlar, ikon ailesi kararı, ortak Button active/hover davranışı, z-index
   ölçeği ve filigran kuralı.
2. **Admin kabuğu + randevu merkezi**  
   En sık kullanılan ve en çok P1 sorunu taşıyan alan.
3. **Müşteri yönetimi + uzun admin formları**  
   Kaydırma/örtüşme ve bilgi mimarisi çözülür.
4. **Rezervasyon kart dili**  
   Monogramlar, tekrar eden kategori, seçim ve loading durumları.
5. **Müşteri hesabı + dış aksiyon sayfaları**  
   Mobil safe-area, review header ve kart yoğunluğu.
6. **Raporlar/değerlendirmeler/katalog cilası**  
   KPI hiyerarşisi ve veri yoğunluğu.
7. **Hareket ve son görsel denetim**  
   `find-animation-opportunities` bulguları uygulanır, `review-animations` ve
   Chrome/Playwright ile doğrulanır.

## 11. Bir sonraki gerçek tasarım sprintinin kabul koşulları

- Masaüstü admin menüsünde kritik bölümler simge ezberlemeden anlaşılır.
- Mobil admin ilk ekranında en az gün/tarih ve ana işlem görünür; filtreler bütün
  ekranı işgal etmez.
- Yönetici müşteri araması seçili profilin üstüne binmez.
- Public review header logosu açık ve koyu yüzeyde görünür.
- Uzman renkleri dekoratif gökkuşağına dönüşmez; tek marka sistemi kullanılır.
- Büyük boş durumlar içerik miktarına göre sıkıştırılır.
- Ortak button, raw button ve link-button kontrollerinde focus, hover, active ve
  disabled aynı sistemde çalışır.
- Hover yalnız uygun işaretçi cihazlarda çalışır.
- Reduced-motion karşılığı bulunur.
- 320, 390, 768, 1024 ve 1440 px'te yatay taşma olmaz.
- Konsol ve beklenmeyen ağ hatası kalmaz.
- Lighthouse erişilebilirlik skoru 100 tabanı korunur.
- LCP'deki yaklaşık 2,3 saniyelik kaynak keşif gecikmesi ayrıca incelenir.

## 12. Sonuç

Uygulamanın tasarım temeli kötü değildir; marka sahnesi ve rezervasyon mantığı
güçlüdür. Asıl sorun, büyüyen ürünün her yeni ekranında aynı kart/başlık/form
kalıbının tekrar edilmesi ve ortak etkileşim cilasının bütün ham kontrollere
taşınmamasıdır.

Bu nedenle doğru yaklaşım her şeyi silip yeniden çizmek değil; önce foundation
ve admin kabuğunu düzeltmek, ardından ekranları tek tasarım sistemi altında
yoğunluklarına göre yeniden kurmaktır. Böyle yapıldığında ürün hem markaya özel
kalır hem de ShiftSync'te sevilen okunabilirlik ve fiziksel etkileşim kalitesine
ulaşır.

## 13. Uygulama kaydı — Dalga 1 tamamlandı

24.08.2026 tarihinde önerilen sıranın ilk iki maddesi uygulandı:

1. **Design foundation**
   - Canvas/yüzey/border, radius, hız, easing ve katman tokenları düzenlendi.
   - Ortak butonlara 120 ms basma geri bildirimi eklendi.
   - Hover davranışı yalnız gerçek fare/trackpad cihazlarında çalışacak şekilde
     sınırlandı.
   - Sheet giriş ve çıkış süreleri asimetrik hâle getirildi; Türkçe erişilebilir
     kapatma etiketi eklendi.
   - Gerçek ikon ailesinin Phosphor olduğu tasarım belgesine işlendi.

2. **Admin kabuğu ve randevu merkezi**
   - Geniş ekranda yazılı sidebar, dar ekranda drawer navigasyonu oluşturuldu.
   - Tarih, görünüm, arama, filtre ve yeni randevu alanı responsive olarak
     yeniden kuruldu.
   - Mobilde filtreler talep üzerine açılır hâle getirilerek ilk ekran boşaltıldı.
   - Özet kartları küçük ekranda yatay taranabilir hâle getirildi.
   - Beş uzmanın günlük takvimde aynı anda görünmesi sağlandı; uzun adların
     kırpılması ve Mustafa Akpiliç kolonunun kaybolması giderildi.
   - Takvim ve bekleyen taleplerde basma geri bildirimi ile dokunma hedefleri
     ortak standarda alındı.

### Ölçülen kabul sonuçları

- 1440 px: yatay taşma yok, beş uzman kolonu görünür.
- 390 px: yatay taşma yok, görünür butonların tamamı en az 44×44 px.
- Konsol: 0 hata, 0 uyarı.
- API: görünen XHR/fetch isteklerinin tamamı 200/304.
- Lighthouse mobil + masaüstü: erişilebilirlik 100, best practices 100.
- Frontend: lint geçti; 12 dosyada 19 test geçti; production build tamamlandı.
- Impeccable anti-slop denetimi: bulgu yok.

### Sonraki uygulama grubu

Önerilen sıranın üçüncü maddesi olan **müşteri yönetimi + uzun yönetici
formları** ele alınacaktır. İlk sayfa `/admin/customers`; ardından hizmet,
uzman ve ayar düzenleme yüzeylerindeki dialog/form geometrisi aynı standarda
taşınacaktır.

## 14. Uygulama kaydı — Müşteri yönetimi tamamlandı

24.08.2026 tarihinde `/admin/customers` ekranı aynı tasarım otoritesine göre
yeniden kuruldu.

### Alınan ürün ve yerleşim kararları

- Masaüstünde müşteri arama dizini ile müşteri profili ayrı görev yüzeyleri
  oldu; arama solda sabit kaldı, seçilen profil sağda açıldı.
- Mobilde dizin ve detay aynı anda gösterilmedi. Seçimden sonra profil açıldı;
  iki yüzey arasında açık metinli kontrollerle geçiş sağlandı.
- Kimlik alanı, ana eylemler ve altı temel gösterge profil başında toplandı.
  Operasyonel renk yalnız online erişim gibi anlam taşıyan durumlarda kullanıldı.
- Salon içi not, bakım profili, hizmet kayıtları, etiketler ve randevu geçmişi
  aynı kartın içine kart yığmak yerine ayrımlar ve sekmelerle düzenlendi.
- Randevu geçmişi ilk beş kayıtla açılıyor; daha fazlası kullanıcı isterse
  gösteriliyor. Bu karar uzun müşteri profillerindeki sayfa boyunu azalttı.
- Yinelenen müşteri birleştirme aracı ilerlemeli açıklama içine alındı. Ham veri
  önizlemesi kaldırıldı; işlem öncesinde hangi kaydın kalacağı ve neyin taşınacağı
  açıkça anlatılan onay penceresi eklendi.

### Araçlardan alınan ve reddedilen yönler

- `ui-ux-pro-max`: arama önceliği, kullanışlı sonuçsuz durum ve mobilde içerik
  önceliği alındı. Önerilen pembe palet ve farklı font çifti mevcut marka
  otoritesini kırdığı için alınmadı.
- 21st ücretsiz ilham araması: kompakt CRM listesi + ayrı detay örüntüsü alındı;
  istatistik kartı yığını ve mavi gradient örnekleri reddedildi.
- Shadcn: mevcut Button ve AlertDialog bileşenlerinin yeterli olduğu doğrulandı;
  gereksiz yeni paket veya bileşen kurulmadı.
- MagicUI: bu operasyon ekranında hareketli beam/gradient örnekleri görevi
  güçlendirmediği için bilinçli olarak kullanılmadı.
- Higgsfield: yeni görsel varlık gerekmemesi ve kredi harcaması nedeniyle
  kullanılmadı.

### Ölçülen kabul sonuçları

- 1440 px: dizin ve profil birlikte okunabilir, ana görevler ilk görünümde.
- 390 ve 320 px: yatay taşma yok; görünür etkileşim hedefleri en az 44×44 px;
  12 px altı metin yok.
- Reduced-motion: hareket ve geçiş süreleri kapandı.
- Klavye: görünür odak halkaları ve mantıklı sekme sırası doğrulandı.
- Chrome konsolu: hata, uyarı ve form alanı issue kaydı yok.
- Lighthouse desktop snapshot: erişilebilirlik 100, best practices 100,
  SEO 100, agentic browsing 100.
- Frontend lint, 12 dosyada 19 test ve production build başarılı.
- Impeccable anti-slop denetimi: 0 bulgu.

### Sonraki sayfa

Sayfa bazlı sıradaki çalışma `/admin/services` olacaktır. Hizmet kataloğu,
uzman eşleşmeleri ve ekleme/düzenleme dialog geometrisi bu ekranda birlikte
ele alınacaktır.

## 15. Uygulama kaydı — Hizmet kataloğu tamamlandı

24.08.2026 tarihinde `/admin/services` ekranı Cinematic Editorial Utility
tasarım otoritesine göre yenilendi.

### Alınan ürün ve yerleşim kararları

- Hizmetler eşit büyüklükte kart yığını yerine kategori başlıkları altında
  kompakt satırlar hâlinde gösterildi. Süre, fiyat, uzman eşleşmesi, aktiflik ve
  online rezervasyon durumu satır üzerinden taranabilir kaldı.
- Arama; hizmet adı, kategori, açıklama ve hizmeti veren uzman adlarını kapsadı.
  Sonuç yok durumu ile aramayı temizleme eylemi ayrıca tasarlandı.
- Ekleme ve düzenleme aynı sağ panelde toplandı. Temel bilgiler, rezervasyon
  akışı, uzman eşleşmesi ve yayın durumu ayrıştırıldı; alt eylem alanı panel
  kaydırılırken sabit kaldı.
- Kaydedilmemiş değişikliklerde tarayıcı onayı yerine erişilebilir AlertDialog
  kullanıldı. Panel kapanınca odak işlemi başlatan satıra döndürüldü.
- Mobil görünümde satırlar tek kolona indi; form bölümleri içerik yüksekliğini
  koruyarak dikey kaydırıldı. Hiçbir alan veya uzman seçeneği panel sınırının
  arkasında kalmadı.

### Araçlardan alınan ve reddedilen yönler

- `ui-ux-pro-max`: arama odaklı yönetim listesi, görünür durum bilgisi ve mobil
  içerik önceliği alındı. Önerilen Aurora/neon palet mevcut marka otoritesini
  bozduğu için reddedildi.
- 21st ücretsiz arama: master-detail ve yoğun katalog örüntüleri incelendi;
  dashboard kart yığını ve dekoratif gradient örnekleri alınmadı.
- Shadcn: projedeki Sheet, Checkbox, Switch, Input, Textarea ve AlertDialog
  bileşenleri kullanıldı; yeni bağımlılık eklenmedi.
- MagicUI: sürekli kullanılan operasyon panelinde pazarlama odaklı parıltı ve
  beam hareketleri görevi güçlendirmediği için kullanılmadı.
- `emil-design-eng`: pointer koşullu hover, basma geri bildirimi, 300 ms altı
  geçişler, reduced-motion ve odak geri dönüşü uygulandı.
- Higgsfield: bu ekran yeni görsel varlık istemediği ve üretim kredi harcadığı
  için kullanılmadı.

### Ölçülen kabul sonuçları

- 1440 px: 7 hizmet ve bütün kategori grupları aynı çalışma alanında okunabilir;
  yatay taşma yok.
- 390 px: yatay taşma ve gizlenen form bölümü yok; 5 uzman seçeneğinin tamamına
  erişilebiliyor; panel alt eylemleri görünür.
- Klavye: panel odağı sınırlandı, Escape/kaydedilmemiş değişiklik davranışı ve
  kapatma sonrası odak dönüşü doğrulandı.
- Chrome konsolu: son navigasyonda 0 hata.
- Lighthouse mobil + masaüstü: erişilebilirlik 100, best practices 100.
- Frontend lint, 12 dosyada 19 test ve production build; backend 34 pakette
  107 test ve production build başarılı.
- Impeccable anti-slop denetimi: 0 bulgu.

### Sonraki sayfa

Sayfa bazlı sıradaki çalışma `/admin/professionals` olacaktır. Uzman kataloğu,
hizmet eşleşmeleri ve uzman ekleme/düzenleme geometrisi aynı kalite standardına
taşınacaktır.

## 16. Uygulama kaydı — Uzman kataloğu tamamlandı (Codex'ten devir sonrası)

24.08.2026 tarihinde, Codex'in kullanım hakkı bitip iş Claude Code'a devredildikten
sonra `/admin/professionals` ekranı aynı Cinematic Editorial Utility otoritesine
göre yenilendi. Devir öncesi bu ekran hiç dokunulmamıştı — `CatalogPage.tsx`
içinde `services` moduyla aynı dosyayı paylaşmasına rağmen hâlâ ham
`<button>`/`<input>` ızgarası ve eski `admin-action-layer` modalını kullanıyordu.

### Alınan ürün ve yerleşim kararları

- Uzman ızgarası, hizmet kataloğuyla aynı `service-workbench` + `service-catalog-row`
  kabuğuna taşındı (yeni `--professional` grid varyantı ile); arama ve
  uzman/aktif/online sayaçları eklendi.
- Uzman düzenleme paneli `ServiceEditor` ile birebir aynı `Sheet` + bölüm
  desenine taşındı: temel bilgiler, hizmet eşleşmesi, yayın durumu.
- **Üçlü kopya birleştirildi:** hizmet ataması eskiden üç ayrı kontrolde
  yönetiliyordu (ServiceEditor'ın kendi uzman listesi, ProfessionalEditor'ın
  ayrı "Sunduğu hizmetler" listesi, `ProfessionalServiceSettings`'in kendi
  atama kutusu). Mevcut bir uzman düzenlenirken artık tek "Hizmet eşleşmesi"
  listesi var: her satırda atama anahtarı + atanmışsa süre/fiyat/online/tampon
  geçersiz kılmaları aynı yerde toplu. Backend'in iki ayrı yazma yolu (temel
  atama vs. geçersiz kılma ayarları) bu turda değiştirilmedi — yalnız görünüm
  birleştirildi; derin birleştirme ayrı bir görev olarak `AGENTS.md`'de kayıtlı.
- Uzman monogramı 8 rastgele gökkuşağı gradyanından ve bir isim için elle
  yazılmış özel renk kuralından, marka tokenlarından türeyen 3 tonlu
  (grafit/zümrüt/şampanya) deterministik bir sisteme geçirildi.

### Araçlardan alınan ve reddedilen yönler

- Doğrulama önce üç paralel keşif ajanıyla yapıldı: tasarım temeli/admin
  kabuğu, müşteri/hizmet dalgaları ve `/admin/professionals`'ın gerçek durumu
  ayrı ayrı kod üzerinden doğrulandı; Codex'in "bitti" dediği bazı iddialar
  (ham buton sayısının neredeyse değişmemesi, `.admin-primary-button`'da
  `:active` olmaması, z-index ölçeğinin aşılması) doğrulamada yakalandı ve
  bu turda düzeltildi.
- Shadcn: Sheet, Checkbox, Switch, Input, Textarea, AlertDialog — yeni
  bağımlılık eklenmeden mevcut bileşenler kullanıldı.
- Higgsfield: yeni görsel varlık gerekmedi, kredi harcanmadı.

### Ölçülen kabul sonuçları

- 1440 px: 5 uzmanın tamamı, arama ve sayaçlarla birlikte tek çalışma
  alanında okunabilir.
- 390 px: yatay taşma yok; kompakt 3 kolonlu satır düzeni (avatar/kimlik/ok)
  doğru şekilde satır yüksekliğine yayılıyor; Sheet tam genişliğe geçiyor,
  hizmet eşleşmesi alanları 2 kolona iniyor.
- Klavye/odak: Escape ve "Vazgeç" ikisi de kaydedilmemiş değişiklik
  AlertDialog'unu tetikliyor; kapatma sonrası odak açan satıra dönüyor.
- Chrome konsolu: 0 hata. Yalnız uygulama genelinde miras kalan "form
  alanlarına id/name ekleyin" tarayıcı uyarısı var (bkz. `AGENTS.md` bilinen
  açık noktalar) — erişilebilirlik etiketlemesini bozmuyor.
- Lighthouse masaüstü anlık görüntü: erişilebilirlik 100, best practices 100,
  SEO 100, agentic browsing 100. Denetim sırasında yakalanan gerçek bir
  kontrast kusuru (`.service-field` içindeki "İsteğe bağlı" ibaresi, 4.37:1)
  düzeltildi; bu düzeltme `ServiceEditor`'ın aynı deseni kullanan alanlarını da
  kapsar.
- Frontend lint temiz, 12 dosyada 19 test geçti, `tsc -b` dâhil production
  build başarılı.
- Güvenlik kaydı: bu turdan önce depoda commit yoktu; Wave 1–3 + test verisi
  temizliği tek checkpoint commit'inde (`572559a`) kayda alındıktan sonra bu
  tura başlandı.

### Sonraki sayfa

Sıradaki sayfa `/admin/schedule` (Çalışma düzeni) olacaktır.

## 17. Uygulama kaydı — Çalışma düzeni tamamlandı

24.08.2026 tarihinde `/admin/schedule` §6.18'de kaydedilen P1 form mimarisi
bulgusuna göre yenilendi.

### Alınan ürün ve yerleşim kararları

- Haftalık salon saatleri, gün başına tekrarlanan büyük form bloğu yerine tek
  satırlık kompakt düzene taşındı: gün adı + açık/kapalı anahtarı + aralık
  çipleri + aralık ekle. §6.18'in "her gün neredeyse aynı alanların dikey
  tekrarı" bulgusunu doğrudan çözdü.
- Özel günler ve zaman blokları artık her zaman yan yana görünmüyor;
  segmentli bir seçiciyle tek seferde biri gösteriliyor. §6.18'in "iki formun
  kullanım sıklığına rağmen eşit görsel ağırlık taşıması" bulgusunu çözdü.
- Her iki liste de hizmet/uzman dalgalarıyla birebir aynı `Sheet` + bölümlü
  form desenine taşındı; kaydedilmemiş değişiklik uyarısı gerçek `AlertDialog`
  oldu.
- Zaman bloğu kaldırma akışında gerçek bir veri bütünlüğü hatası düzeltildi:
  eskiden onay istenmeden ve backend'in zorunlu tuttuğu gerekçe alanına sabit
  bir metin yazılarak siliniyordu. Şimdi en az 3 karakterlik gerçek gerekçe
  girilmeden silme etkinleşmiyor.

### Araç zincirinden gelen ve doğrulamada yakalanan kök neden

- Paylaşılan `Switch` bileşeninin kendi varsayılan renklendirmesi hiçbir
  yerde çalışmıyordu (`data-checked:` Tailwind sınıfı Radix'in gerçekte
  yazdığı `data-state="checked"` özniteliğini hiç hedeflemiyordu). Diğer
  ekranlarda sayfa bazlı geçersiz kılmalar sayesinde gizli kalmıştı; bu
  sayfada ilk kez geçersiz kılmasız kullanılınca görünür oldu ve kaynağında
  düzeltildi — tek değişiklik uygulama genelindeki her `Switch`'i düzeltti.
  `Checkbox` bileşeninde birebir aynı kalıp var ama bu turda tetiklenmedi;
  bilinen açık nokta olarak `AGENTS.md`'ye kaydedildi.

### Ölçülen kabul sonuçları

- 1440 px ve 390 px: yatay taşma yok, haftalık saat düzenleme, özel gün
  ekleme/düzenleme/silme, zaman bloğu ekleme/kaldırma uçtan uca canlı
  tarayıcıda doğrulandı; test verileri aynı akışlarla temizlendi.
- Gerekçe zorunlu kaldırma akışında ağ isteği gövdesi doğrulanarak girilen
  gerçek metnin backend'e ulaştığı teyit edildi.
- Frontend lint temiz, 12 dosyada 19 test geçti, `tsc -b` dâhil production
  build başarılı.
- Lighthouse masaüstü ve mobil anlık görüntü: erişilebilirlik 100, best
  practices 100, SEO 100, agentic browsing 100.

### Sonraki sayfa

Eray bu noktada kalan sayfalar için otonom ilerleme onayı verdi (bkz.
`AGENTS.md`); sıralama Codex'in önerdiği orijinal listeye sadık kalınarak
sürdürülecek. Sıradaki sayfa `/admin/requests` (Talepler).

## 18. Uygulama kaydı — Değişiklik talepleri tamamlandı

24.08.2026 tarihinde `/admin/requests` §6.14'te kaydedilen bulgulara göre
yenilendi.

### Alınan kararlar

- Liste ve boş durum artık `.service-workbench` ile aynı sınırlı/gölgeli
  kapsayıcı içinde, tek araç çubuğunda filtre + sayaç birlikte — "dev başlık
  kartı + dev boş durum kartı aynı anda" bulgusunu çözdü.
- Boş durum dört filtre durumunun her biri için ayrı başlık/açıklama
  gösteriyor — "özgün durum dili" bulgusunu çözdü.
- Talep kartı, Bekleme listesi/Değerlendirmeler/Raporlar/Ayarlar/Ekip
  erişiminin hâlâ kullandığı paylaşılan `operation-card` ailesinden
  ayrıştırıldı; paylaşılan sınıflara dokunulmadı, yalnız Talepler kendi
  `change-request-card__*` sınıflarına geçti.
- Backend'de değişiklik gerekmedi; karar notu zaten gerçekten isteğe bağlıydı.

### Ölçülen kabul sonuçları

- Masaüstü ve mobil Lighthouse anlık görüntü: erişilebilirlik 100, best
  practices 100, SEO 100, agentic browsing 100.
- Frontend lint temiz, `tsc -b` dâhil production build başarılı, 12 dosyada
  19 test geçti. Konsolda hata yok.
- Gerçek talep verisi olmadığından dolu kart görünümü geçici DOM
  enjeksiyonuyla (kalıcı kayıt oluşturulmadan) doğrulandı.

### Sonraki sayfa

Sıradaki sayfa `/admin/waitlist` (Bekleme listesi).

## 19. Uygulama kaydı — Bekleme listesi tamamlandı

24.08.2026 tarihinde `/admin/waitlist` Talepler dalgasıyla aynı §6.14 bulgusuna
göre, aynı `.service-workbench` deseniyle yenilendi.

### Alınan kararlar

- Liste ve boş durum aynı sınırlı kapsayıcıya taşındı; durum filtresine göre
  özgün boş durum metni eklendi.
- **Üçüncü kez aynı gerçek hata bulundu ve düzeltildi:** "Kaydı kapat" hiç
  onay istemeden, backend'in zorunlu tuttuğu gerekçe alanına sabit metin
  yazarak siliyordu. Artık en az 3 karakterlik gerçek gerekçe zorunlu.
- Manuel teklif diyaloğunun ham alanları `Input`/`service-field` desenine
  taşındı; teklifin anında SMS gönderdiği bilgisi açıklama metnine eklendi.
- CSS temizliğinde yalnızca gerçekten artık hiçbir dosyada kullanılmayan
  sınıflar silindi (`waitlist-card`, `waitlist-preferences`, `operation-list`,
  `operation-status`, `operation-note`, `dialog-form-grid`); Ayarlar sayfasının
  hâlâ kullandığı `operation-icon`/`operation-card` tabanına dokunulmadı.

### Ölçülen kabul sonuçları

- Masaüstü ve mobil Lighthouse anlık görüntü: erişilebilirlik 100, best
  practices 100, SEO 100, agentic browsing 100.
- Frontend lint temiz, `tsc -b` dâhil production build başarılı, 12 dosyada
  19 test geçti.

### Sonraki sayfa

Sıradaki sayfa `/admin/reviews` (Değerlendirmeler).

## 20. Uygulama kaydı — Değerlendirmeler tamamlandı

24.08.2026 tarihinde `/admin/reviews` §6.19 bulgusuna göre yenilendi: filtre,
KPI şeridi, dağılım/sıralama ve liste tek `.service-workbench` kapsayıcısına
taşındı; "genel dashboard şablonu" ve "veri yokken çok boş" bulguları çözüldü.
Ham tarih/checkbox alanları `Input`/`Checkbox` bileşenlerine geçirildi.

Bu turda ayrıca Schedule dalgasının yarım kalmış CSS temizliği tamamlandı
(`admin.css` içinde ikinci bir kopya blok bulundu, ~250 satır silindi,
derlenen CSS 13 KB küçüldü) ve paylaşılan `Checkbox` bileşeninin — `Switch`
gibi — her kullanım yerinde elle boyut geçersiz kılması gerektiği doğrulandı.
Canlı Lighthouse taraması gerçek bir `heading-order` hatası yakaladı (h1→h3
atlaması), düzeltildi.

Masaüstü ve mobil Lighthouse: erişilebilirlik 100, best practices 100, SEO
100, agentic browsing 100. Ayrıntılar `AGENTS.md`'de.

Sıradaki sayfa `/admin/reports` (Raporlar).

## 21. Uygulama kaydı — Raporlar tamamlandı

24.08.2026 tarihinde `/admin/reports` §6.21 bulgusuna göre yenilendi: "yedi
eşit kart birbirine rakip, kart kalıbı asıl operasyon sorusunun önüne geçiyor"
(P1) bulgusu, 8 KPI'yı tek düzlemde eşitlemek yerine iki katmanlı bir
hiyerarşiye ayırarak çözüldü — üç ana metrik (Toplam randevu, Doluluk, Onay
bekleyen) büyük punto ve ikonla `.reports-hero`'da, kalan beş metrik küçük
punto ve ikonsuz `.reports-secondary-metrics`'te. Tarih aralığı + 4 filtre +
iki metrik şeridi + 4 detay paneli tek `.service-workbench` kapsayıcısına
toplandı; eskiden üç ayrı yüzey olan başlık-aksiyonu tarih inputları, ayrı
filtre kartı ve ayrı KPI kartı birleşti. 2 ham `<input type="date">` `Input`
bileşenine, 4 ham `<select>` `.service-field` desenine taşındı.

Alttaki 4 detay paneli (ritim/doluluk/dağılım/özet) artık dört ayrı gölgeli
kart değil, ince kenarlıklı tek `.reports-content-grid` — "kart kalıbı"
hissini azaltan ikinci değişiklik. Backendde değişiklik gerekmedi, yıkıcı
işlem olmadığından gerekçe-zorunlu kalıbı bu sayfada konu değildi.

Masaüstü ve mobil Lighthouse: erişilebilirlik 100, best practices 100, SEO
100, agentic browsing 100. Ayrıntılar `AGENTS.md`'de.

Sıradaki sayfa `/admin/team-access` (Ekip erişimi).

## 22. Uygulama kaydı — Ekip erişimi tamamlandı

24.08.2026 tarihinde `/admin/team-access` §6.20 bulgusuna göre yenilendi:
"tam genişlikte dev form, rol etkileri açıklanmıyor, güvenlik kararı ile veri
girişi aynı ağırlıkta" (P1) bulgusu, her zaman görünen iki-sütunlu formu
kataloğun kurulu `Sheet` editör desenine taşıyarak çözüldü — sayfanın birincil
içeriği artık erişim listesi, yeni erişim açmak ayrık bir eylem. Rol seçimi
artık `SECTIONS_BY_ROLE` yetkilendirmesiyle uyumlu gerçek bir açıklama
cümlesiyle destekleniyor.

Dördüncü kez aynı kalıp: üç yıkıcı işlem (parola sıfırlama, oturum kapatma,
erişim kapatma) hiç onay istemeden çalışıyordu; hepsi onay diyaloğuna
taşındı (bu sayfada backend'te gerekçe alanı olmadığı için düz onay, metin
kutusu değil). Parola sıfırlama ayrıca çıplak `window.prompt()`'tan gerçek bir
`Dialog`'a taşındı ve istemci `minLength` değeri backend'in `@MinLength(8)`
kuralıyla eşitlendi (eskiden 10 idi, gereksiz yere sıkıydı).

Sahip hesabının tek kayıt olması ve backend'de kullanıcı silme uç noktası
bulunmaması nedeniyle üç onay diyaloğu yalnız arayüz üzerinden doğrulandı,
gerçek çağrı yapılmadı — ayrıntı `AGENTS.md`'de.

Masaüstü ve mobil Lighthouse: erişilebilirlik 100, best practices 100, SEO
100, agentic browsing 100.

Sıradaki sayfa `/admin/settings` (Ayarlar).

## 23. Uygulama kaydı — Ayarlar tamamlandı

25.08.2026 tarihinde `/admin/settings` §6.22 bulgusuna göre yenilendi —
serinin en büyük dalgası (~1400 satır, `SettingsPage.tsx` +
`Sprint12OperationsSettings.tsx`). "Çok uzun form, büyük input çiftleri,
tekrar eden çerçeveler, sık/nadir değişen ayar karışıklığı, kaydetme kapsamı
ve kirli form durumu görünür değil" bulgusu şu somut değişikliklerle
çözüldü: gerçek kirli-durum takibi (`policy` vs `originalPolicy`
karşılaştırması) + "Vazgeç" eylemi + kayıt kapsamını açıklayan bant eklendi;
14 hücrelik düz form ızgarası beş anlamlı alt gruba ayrıldı; nadiren
değiştirilen `Sprint12OperationsSettings` alt uygulaması "GELİŞMİŞ" etiketli
bir ayraçla görsel olarak ayrıştırıldı. Backend'te var olup arayüzde hiç
alanı olmayan iki gizli politika alanı (`maxActiveChangeRequests`,
`otpMaxAttempts`) bulunup eklendi.

Beşinci kez aynı kalıp: "Oturumu kapat" onaysız çalışıyordu, `AlertDialog`
eklendi. Ayrıca `Sprint12OperationsSettings` içinde iki ayrı onaysız yıkıcı
işlem bulundu (form "Arşivle", takvim aboneliği "İptal et") ve düzeltildi —
alt uygulamanın geri kalan iç bilgi mimarisi bu dalganın kapsamı dışında
bırakıldı (ayrı bir dalga gerektirecek büyüklükte), `AGENTS.md`'de
gerekçesiyle kayıtlı. Ayrıca `.operation-card` (çıplak sınıf) artık
uygulama genelinde sıfır tüketiciye sahip olduğu bulundu — sonraki bir CSS
temizlik turu için not edildi, bu dalgada dokunulmadı.

Bu dalga sırasında oturum bir kez kesintiye uğradı (harness yeniden başladı,
Docker ve dev sunucuları durdu); disk durumu çapraz doğrulanıp ortam
yeniden ayağa kaldırıldıktan sonra kaldığı yerden devam edildi, hiçbir iş
kaybolmadı.

Masaüstü ve mobil Lighthouse: erişilebilirlik 100, best practices 100, SEO
100, agentic browsing 100. Ayrıntılar `AGENTS.md`'de.

Bu, admin panelinin Codex'in önerdiği orijinal sırada son sayfasıydı.
Sıradaki adım admin-dışı ekranlar: admin giriş ekranı, dış değerlendirme
ekranı, müşteri bekleme listesi ekranı.

## 24. Uygulama kaydı — admin giriş ekranı tamamlandı

25.08.2026 tarihinde `/admin` giriş ekranı §6.11 bulgusuna göre yenilendi:
"markaya özel operasyon karakteri az" bulgusu, kartın sol yarısını zaten
kurulu `--ri-stage-*` koyu token ailesiyle gerçek bir "marka paneli"ne
çevirerek çözüldü (yeni renk uydurulmadı); "parola görünürlük butonu ve form
geri bildirimi ortak kontrol sistemine bağlanmalı" bulgusu, ham alanların
paylaşılan `Input`/`Label` bileşenlerine taşınmasıyla VE tüm paylaşılan
düğme sınıflarında (`admin-primary-button` vb.) hiç var olmayan `:active`
basılı geri bildiriminin eklenmesiyle çözüldü — bu ikinci düzeltme yalnız
giriş ekranını değil, o sınıfları kullanan **her sayfadaki her düğmeyi**
düzeltti.

Backend'in üç ayrı hata durumu (401 yanlış bilgi, 409 15 dakikalık kilit, 400
doğrulama) artık arayüzde ayrışıyor; 409 durumu için gerçek, canlı geri
sayımlı bir kilit banner'ı eklendi (`useAdminSession`'a `lockedUntil`
state'i). Dört farklı sprint katmanında neredeyse birebir tekrar eden
`.admin-login` CSS'i (~250 satır ölü ağırlık, "Canonical" diye işaretli blok
aslında önceki bir bloğun bayt-bayt kopyasıydı) tek, tutarlı bir CSS'e
indirildi; bu sırada görsel olarak geride kalmış `.admin-session-check`
(oturum kontrolü tam ekran durumu) da yeni girişle aynı arka planı
paylaşacak şekilde güncellendi.

Canlı testte gerçek bir a11y hatası yakalandı ve CLAUDE.md'de zaten belgeli
olan `BrandHeader.tsx` kalıbıyla (Türkçe büyük harf İ/i uyuşmazlığı, sabit
`aria-label` kaldırıldı) aynı şekilde düzeltildi. Test sırasında gerçek
`owner` hesabı kilitlendi, doğrudan SQL ile sıfırlandı ve gerçek girişle
doğrulandı — ayrıntı `AGENTS.md`'de.

Masaüstü ve mobil Lighthouse: erişilebilirlik 100, best practices 100, SEO
100, agentic browsing 100, 0 başarısız denetim.

Sıradaki ekran: dış değerlendirme ekranı.

## 25. Uygulama kaydı — dış değerlendirme ekranı tamamlandı

26.08.2026 tarihinde `/degerlendir/:token` tek görevli bir ziyaret sonrası
değerlendirme yüzeyi olarak yenilendi. Yinelenen uzman bilgisi ve dekoratif
üst etiket kaldırıldı; randevu özeti, gerçek radio semantiğine sahip beş
yıldızlık puan alanı, kısa yorum ve gönderme sırası daha kompakt kuruldu.
Yükleme, geçersiz bağlantı, geçici ağ hatası ve başarı durumları birbirinden
ayrıldı; teknik ağ metinleri müşteriye gösterilmedi. 1440, 390 ve 320 px
görünüşlerde taşma kalmadı; masaüstü ve mobil Lighthouse erişilebilirlik,
best practices, SEO ve agentic browsing puanları 100 oldu.

Sıradaki ekran: `/bekleme-listesi/*` müşteri bekleme listesi.

## 26. Uygulama kaydı — müşteri bekleme listesi tamamlandı

26.08.2026 tarihinde `/bekleme-listesi/*` §6.10 bulgusuna ve ürünün kapalı
bekleme döngüsüne göre baştan kuruldu. Eski dar ve uzun utility form yerine
1040 px ile sınırlı tek bir çalışma yüzeyi kullanıldı. Masaüstünde seçim özeti
ile kimlik/tercih formu iki kolona ayrıldı; tablet ve mobilde gerçek görev
sırasına göre tek kolona döndü. İsteğe bağlı not başlangıçta kapalı tutuldu;
bütün alanlara gerçek label, id, name, autocomplete ve alan yakını hata metni
eklendi.

Sayfa artık yalnız katılım formu değildir. Geçerli rezervasyon bağlamında
katılım ve beş dakikalık SMS doğrulama; tekrar açılışta aktif kayıt; açılan
saatin fiyatı, süresi, uzmanı ve geri sayımı; kayıttan gerekçeli onayla ayrılma;
teklifi talep etme ve yönetici onayını bekleyen randevu sonucunu tek akışta
gösterir. Eksik veya eski bağlantıda pasif form açılmaz; müşteriye hizmet ve
tarih seçme yolu verilir. Süresi dolmuş ya da çakışmış teklif, kesin randevu
izlenimi vermeden kaydın yeni boşluklar için yeniden aktif olduğunu açıklar.

Mevcut `WaitlistOffer.tokenHash` alanı gerçek güvenli teklif erişimine bağlandı;
yeni migration veya paket eklenmedi. SMS bağlantısındaki ham token ilk istekte
sunucuda doğrulanıp teklif süresini aşmayan HttpOnly, SameSite=Strict oturum
çerezine çevriliyor ve tarayıcı adresinden temizleniyor. Teklif kabulü
`PENDING_APPROVAL` randevu talebi oluşturuyor; mevcut yönetici onayı kuralı
korunuyor. Eski bekleme listesi uçları geriye dönük uyum için yerinde kaldı.

Canlı uçtan uca kontrolde form → SMS → aktif kayıt → teklif → farklı cihazda
güvenli bağlantı → kabul → yönetici onayı bekleyen sonuç akışı doğrulandı.
Aynı teklifin ikinci kabulü 409 ile reddedildi. Test için oluşturulan müşteri,
randevu, bekleme kaydı, teklif, doğrulama ve oturum verileri transaction içinde
temizlendi; ürün iskeletinde test verisi bırakılmadı. 1440×1000, 768×1024,
390×844 ve 320×720 görünüşlerde yatay taşma olmadı; klavye sırası, 44 px
dokunma hedefleri, reduced-motion, konsol ve ağ kontrolleri geçti. Masaüstü ve
mobil Lighthouse erişilebilirlik, best practices, SEO ve agentic browsing
puanları 100; LCP 2.419 ms ve CLS 0.00 ölçüldü.

Sıradaki ekran grubu: `/hesabim` müşteri girişi ve randevu özeti.

## 27. Uygulama kaydı — `/hesabim` müşteri girişi ve randevu özeti tamamlandı

26.08.2026 tarihinde yönetici panelinin tamamı bittiği için Eray genel bir
kapsam talimatı verdi: kalan tüm ekranlar (müşteri hesabı, ana rezervasyon
akışının beş adımı, Ayarlar içindeki dört gelişmiş alt araç) aynı araç
zincirini bırakmadan tek tek yenilenecek; ayrıca daha önce ayrıca ele
alınmamış tüm header/footer/leftbar/ikon yüzeyleri de bu geçişte gözden
geçirilecek. Bu kayıt, o talimatın ilk uygulama dalgasıdır.

`/hesabim` girişi ve `Randevularım` özet ekranı zaten olgun bir temeldeydi
(paylaşılan token'lar, odak halkaları, `hover:hover` korumalı geçişler önceden
vardı) — bu yüzden baştan yazım değil hedefli bir denetim uygulandı:

- Telefon ve 6 haneli kod alanları ham `<input>` yerine paylaşılan
  `Input`/`Label` bileşenlerine taşındı; `id`/`name`/`autoComplete` eklendi,
  `aria-invalid` hata durumuna bağlandı. `+90` önek çipi aynı "sınır kutunun
  içinde border:0 input" tekniğiyle korundu.
- Üst menüdeki `Randevularım`/`Profilim` sekmeleri 36 px'ten 44 px dokunma
  hedefine çıkarıldı (kapsayıcı 46→54 px, iç dolgu 4→5 px).
- Üç yerde 40–42 px olan buton yüksekliği ("Numarayı değiştir", "Kodu tekrar
  gönder", randevu grubu hata/yeniden dene düğmeleri) 44 px'e sabitlendi.
- Bu ekranın tamamında (giriş formu, üst menü, çıkış düğmesi, mobil alt menü,
  "Yeni randevu" düğmesi, randevu kartı, "daha fazla göster" düğmesi, hata
  yeniden-dene düğmeleri) hiç `:active` basılı geri bildirimi yoktu — global
  kuralın en sık ihlal edilen maddesi. Hepsine `scale(0.94–0.996)` aralığında,
  `--ri-speed-press` süresinde basılı geri bildirimi eklendi.
- Dosyadaki 5 adet `@media (hover: hover)` bloğunun hiçbiri `and (pointer:
  fine)` içermiyordu; hepsi düzeltildi.
- **Canlı Lighthouse'ta gerçek bir hata yakalandı ve düzeltildi:** giriş
  ekranının marka bağlantısında zaten belgeli Türkçe nokta'lı İ/aria-label
  uyuşmazlığı tekrar bulundu (`label-content-name-mismatch`, kategori puanını
  düşürmüyor ama denetim tek tek başarısız oluyordu). Aynı kalıp iki yerde daha
  bulundu ve aynı oturumda düzeltildi: yönetici panelinin mobil menü/başlık
  marka bağlantıları (`AdminHeader.tsx`) ve bekleme listesi sayfasının marka
  sarmalayıcısı (`WaitlistJoinPage.tsx` — `BrandHeader`'ı saran `<section>`'a
  gereksiz bir `aria-label` eklenmişti, aynı uyuşmazlığı bir seviye yukarı
  taşıyordu). Üçü de aynı düzeltmeyle (aria-label kaldırıldı, erişilebilir ad
  görünen metinden geliyor) çözüldü.
- `/hesabim` özel bir müşteri alanı olduğu için `robots.txt` bilinçli olarak
  onu (ve `/admin`, `/degerlendir/`, `/bekleme-listesi/`'i) indekslemeden
  dışlıyor; Lighthouse SEO denetimindeki tek kalan "is-crawlable" başarısızlığı
  budur ve düzeltilecek bir hata değildir.

Canlı doğrulama: gerçek telefon + geliştirme OTP kodu (`111111`) ile tam giriş
akışı uçtan uca test edildi (kod gönder → doğrula → gösterge paneli), ardından
çıkış yapılıp geri girildi. 1440, 390 ve 320 px görünüşlerde yatay taşma yok;
konsolda hata yok. Masaüstü ve mobil Lighthouse: erişilebilirlik, best
practices ve agentic browsing 100; SEO 63 (yukarıdaki bilinçli robots.txt
kısıtı hariç diğer tüm denetimler geçti). Frontend lint temiz, `npm run build`
başarılı, 13 dosyada 23 test geçti.

Sıradaki ekran: `/hesabim/profil` (müşteri profili).

## 28. Uygulama kaydı — `/hesabim/profil` tamamlandı

26.08.2026 tarihinde profil ekranı denetlendi. Ad soyad ve e-posta alanları
paylaşılan `Input`/`Label`'a taşındı (id/name/autoComplete korundu); "isteğe
bağlı" ek etiketi `Label`'ın kendi flex düzenine taşındı. Bildirim tercihi
kartı (ikon + başlık + açıklama içeren tıklanabilir kart) kasıtlı olarak
paylaşılan `Switch` bileşenine dönüştürülmedi — bu, küçük bir anahtar değil,
tanımlayıcı bir tercih kartı; farklı bir etkileşim şekli farklı bir bileşen
gerektirir. Yükleme hatası "yenile" düğmesi 42→44 px'e çıkarıldı; bildirim
kartına ve yenile düğmesine `:active` basılı geri bildirimi eklendi.

**Canlı Lighthouse'ta gerçek bir kontrast hatası bulundu ve düzeltildi:**
doğrulanmış telefon kutusundaki açıklama metni (`Değişiklik için salonla
iletişime geç`) `#62717e` rengiyle `#eef1f3` gri zemin üzerinde 4.43:1 veriyordu
(WCAG AA eşiği 4.5:1); dosyada zaten kullanılan `#52616d`'ye çevrildi (5.63:1).
Bu, benim bu dalgada değiştirmediğim, önceden var olan bir hataydı — canlı
denetim olmadan yakalanmazdı.

Canlı doğrulama: gerçek müşteri hesabıyla ad/e-posta alanı dolduruldu, dirty-
state banner'ı ve kaydet düğmesinin aktifleşmesi doğrulandı, ardından
**kaydedilmeden** sayfa yenilenerek gerçek profil verisinin değişmediği
onaylandı (test verisi kalıcı hale getirilmedi). 1440/390 px'te taşma yok,
konsolda hata yok. Masaüstü ve mobil Lighthouse: erişilebilirlik/best
practices/agentic browsing 100, SEO 63 (bilinçli robots.txt kısıtı, §27'de
açıklandı). Lint temiz, build başarılı, testler geçti.

Sıradaki ekran: `/hesabim/randevular/:publicCode` (randevu detayı).

## 29. Uygulama kaydı — `/hesabim/randevular/:publicCode` tamamlandı

26.08.2026 tarihinde randevu detay ekranı (özet kart, iptal/değişiklik/seri
diyalogları, değerlendirme paneli) denetlendi. Bu, bu dalgadaki en büyük ve en
çok gerçek hata bulunan parçaydı.

**Component tutarlılığı:** Seri oluşturma/iptal nedeni/değişiklik notu
alanları paylaşılan `Input`/`Label`/`Textarea`'ya taşındı, id/name eklendi.
Değerlendirme paneli artık ham düğme grubu değil, `/degerlendir/:token`
dalgasında kurulan aynı `.public-rating` radio-grup deseni ve `ratingLabels`
anlam metnini yeniden kullanıyor — iki sayfa artık aynı, önceden doğrulanmış
CSS'i paylaşıyor. Seri gösteriminin "Bu ve sonrakileri iptal et" eylemi
**`window.confirm()` kullanıyordu** — projenin geri kalanında altı kez
uygulanmış `AlertDialog` kalıbına aykırıydı; kaldırılıp gerçek geri alınamaz
uyarısı olan bir `AlertDialog`'a çevrildi.

**Canlı testte bulunan iki gerçek hata:**
1. Yeni eklenen (ve incelemede fark edildi ki zaten var olan üç) `Dialog`/
   `AlertDialog` **tamamen görünmez** render ediliyordu. Kök neden: bu
   diyaloglar React Portal ile `document.body`'ye taşınıyor, yani
   `.customer-account-shell` kapsamındaki hiçbir token ezmesi onlara miras
   kalmıyor. Paylaşılan bileşenin arka planı `--popover` (= global
   `--ri-surface` = `#f3f6f8`) token zincirinden geliyor, ve bu sayfanın kendi
   zemin rengi de tesadüfen aynı `#f3f6f8` olarak sabit yazılmıştı — kart,
   karartılmış overlay üzerinde zeminle birebir aynı renkte, yani görünmez
   oluyordu. Doğrulama sırasında tam sayfa ekran görüntüsü de bu hatayı
   yanlışlıkla doğruluyormuş gibi göründü (aşağıya bakınız); asıl kanıt
   `getComputedStyle` ile `background-color: rgb(243,246,248)` okunmasıydı.
   Çözüm: diyalog içeriğinin kendi sınıfına (`.customer-action-dialog`,
   yeni `.customer-confirm-dialog`) doğrudan `background:#ffffff !important`
   yazıldı — Portal'a taşınan içerik ancak kendi sınıfı üzerinden
   hedeflenebilir, ata kapsamından miras alamaz.
2. Randevu detay sayfası yüklenirken paylaşılan `CustomerDashboardSkeleton`
   (randevu **listesi** için tasarlanmış, ~580 px yükseklikte 3 bloklu genel
   iskelet) yeniden kullanılıyordu; gerçek detay sayfası iki kolonlu, ~1200 px
   yüksekliğinde bir düzen. Yükleme bitip gerçek içerik oturunca ölçülebilir
   **CLS 0.44** (Lighthouse "agentic browsing" 74) üretiyordu — performans
   izleme aracının kendi CLS-kök-neden analizi bunu `MAIN`/`FOOTER`/`NAV`'ı
   etkileyen tek büyük kayma olarak gösterdi. Sayfaya özel, gerçek düzenin
   oranlarına yakın `CustomerBookingDetailSkeleton` (hero + iki kolonlu kart
   iskeleti) yazıldı; artık kullanılmayan `CustomerDashboardSkeleton`
   kaldırıldı. Düzeltme sonrası CLS ölçülebilir şekilde iyileşti, Lighthouse
   agentic browsing 100'e döndü.

**Araç notu:** `chrome-devtools` MCP'sinin `uid` vermeden çağrılan tam sayfa
`take_screenshot`'ı, bu oturumda bir tıklama veya `window.scrollTo` sonrası
güncel kareyi yansıtmıyordu (eski durumu gösteriyordu) — `evaluate_script` ile
`getComputedStyle`/`getBoundingClientRect` okuma ve elementin kendi `uid`'iyle
alınan ekran görüntüsü her zaman doğru/güncel sonucu verdi. Bu ilk hatayı
(görünmez diyalog) gerçek bir kod hatasıyla karıştırmama neden oldu; ikisi de
ayrıştırılıp doğru teşhis edildi. Sıradaki dalgalarda diyalog/portal
doğrulamasında önce `uid`-taramalı ekran görüntüsü tercih edilmeli.

Canlı doğrulama: gerçek müşteri randevularıyla (yaklaşan + geçmiş) iptal
diyaloğu, tarih/saat değiştirme diyaloğu (gerçek müsaitlik API'sinden 14 saat
yüklendi, bir saat seçilip basılı durumu doğrulandı), düzenli randevu
diyaloğu (önizleme API'si gerçek çakışma listesini döndürdü) ve değerlendirme
formu (5 yıldız seçimi, "Harikaydı" anlam metni, gönder düğmesinin
etkinleşmesi) uçtan uca test edildi; hiçbiri gerçek veri değiştirmeden kapatıldı.
Masaüstü ve mobil Lighthouse iki farklı randevuda: erişilebilirlik/best
practices/agentic browsing 100, SEO 63 (bilinçli robots.txt kısıtı). Konsolda
hata yok. Frontend lint temiz, build başarılı, 13 dosyada 23 test geçti.

Sıradaki ekran grubu: ana rezervasyon akışının beş adımı (hizmet, uzman,
tarih/saat, kimlik/onay, sonuç).

## 30. Uygulama kaydı — ana rezervasyon akışı (beş adım) tamamlandı

26.08.2026 tarihinde `/` kökündeki tüm rezervasyon akışı (Hizmet → Uzman →
Zaman → Onay → Sonuç, artı paylaşılan `BrandHeader`/`BookingProgress`/
`BookingSummary`/`ri-button` bileşen ailesi) denetlendi. Bu akış diğer
sayfalara göre zaten en olgun olanıydı (Framer Motion `whileTap` ile basılı
geri bildirim, gerçek `role="tab"`/`aria-pressed` semantiği, sayı-eşleşmeli
yükleme iskeletleri) — dokümandaki filigran ihlali de önceki bir dalgada
zaten giderilmiş bulundu (`.booking-panel` yorum satırı bunu doğruluyor).
Bu yüzden baştan yazım değil, hedefli denetim + gerçek hata avı uygulandı.

**Sistemik bulgu — `:hover` koruması app genelinde en zayıf halkaydı:**
`booking.css` (3600+ satır) içinde otuza yakın `:hover` kuralı
`@media (hover: hover) and (pointer: fine)` içine alınmadan yazılmıştı —
hizmet/uzman kartları, kategori sekmeleri, tarih/saat şeritleri, ortak
`.ri-button` ailesi (talep akışının HER adımında kullanılan birincil/ikincil
buton), marka başlığı çipleri, özet satırları, QR kopyala düğmesi. Hepsi
gate'lendi. Ayrıca ham `<button>` olan (whileTap'siz) `.service-option` ve
`.professional-option` kartlarına `:active` basılı geri bildirimi eklendi;
`.living-qr__copy button` 40 px'ten 44 px dokunma hedefine çıkarıldı.

**Gerçek düzen hatası:** `.professional-grid` her zaman 2 kolonluydu; gerçek
veride 5 uzman olduğu için son kart yarım genişlikte yalnız kalıyordu.
`:last-child:nth-child(odd)` ile tam satırı kaplaması sağlandı — canlı
denetimde 5 kartlık gerçek listede doğrulandı.

**Aynı Türkçe İ/aria-label kalıbı iki yerde daha bulundu:** `BrandHeader`'ı
saran `<section>`'a gereksiz `aria-label="Ramazan İnanç Hair Art Studio"`
eklenmiş üç ayrı dosyada tekrarlanmış — `PendingApprovalView.tsx` ve
`BookingLookupPage.tsx` (`WaitlistJoinPage.tsx` §27'de zaten düzeltilmişti).
Üçü de aynı düzeltmeyle giderildi.

**Canlı testte Chrome'un kendi "Issues" panelinden gerçek bir hata
yakalandı:** `ConfirmationStep`'in dört alanı (ad soyad, telefon, SMS kodu,
not) ve `TimeStep`'in gizli takvim `<input type="date">`'i yalnız `id`
taşıyor, `name` taşımıyordu — "A form field element should have an id or
name attribute" uyarısı. Beşi de `name` aldı; bu doğrudan Eray'ın kapanış
listesindeki 15. madde ("Formlara eksik id/name") ile örtüşüyor.

Canlı doğrulama: gerçek müşteri hesabıyla (kimlik doğrulama adımı
otomatik atlandı) hizmet → uzman → tarih/saat → not → gönder akışı üç kez
farklı hizmet/saat kombinasyonuyla uçtan uca tamamlandı; her seferinde
"Yönetici onayı bekleniyor" ekranı (referans kodu, randevu özeti, canlı QR,
kodu kopyala) doğru render edildi. Test için oluşturulan randevu SQL ile
(cascade ile occupancy segment/bildirim dahil) tamamen temizlendi, sıfır
kayıt kaldığı doğrulandı. 1440 ve 390 px'te yatay taşma yok. Masaüstü ve
mobil Lighthouse: **55/52 denetimin tamamı geçti, dört kategori de 100**
(bu sayfa robots.txt'te engellenmiyor, önceki dalgaların aksine SEO da 100).
Konsolda hata yok. Lint temiz, build başarılı, testler geçti.

Sıradaki ekran grubu: Ayarlar içindeki dört gelişmiş alt araç (dijital form
şablonları, bildirim kuralları, harici takvim abonelikleri, işlem günlüğü).

## 31. Uygulama kaydı — Ayarlar'ın dört gelişmiş alt aracı tamamlandı

26.08.2026 tarihinde `Sprint12OperationsSettings.tsx` (Ön görüşme formları,
Bildirimler, Takvim aboneliği, İşlem günlüğü — tek bileşende dört sekme)
denetlendi. Bu, admin panelinin gerçekten en eski/en yoğun köşesiydi: diğer
tüm admin sayfaları "Studio" katmanına geçmişken bu bileşen hâlâ tamamen
`admin.css`'in eski katmanına yaslanıyordu, tek bir `:hover`/`:active` kuralı
yoktu ve düğmelerin çoğu 38–42 px'teydi.

**Sistemik dokunma hedefi ve etkileşim boşluğu:** Form alan düzenleyicideki
"Kaldır", liste satırlarındaki tüm eylem düğmeleri ("Yayınla", "Yeni taslak
sürüm", "İptal et", "Yeniden dene", "Yenile") ve takvim "Kopyala" düğmesi
38 px'ten 44 px'e çıkarıldı; dışa aktarma linkleri ve denetim filtresi
alanları 40–42 px'ten 44 px'e çıkarıldı. Sekme navigasyonu, tüm liste/takvim/
form-alan düğmeleri ve dışa aktarma linklerine gate'li hover + `:active`
basılı geri bildirimi eklendi — bu bileşende daha önce **hiç** yoktu.
`focus-visible` halkası tüm form alanlarına eklendi.

**Formlarda eksik `name`:** on beşe yakın alan (form alan etiketi/türü/
seçenekleri/onay türü/zorunlu, hizmet bağlama onay kutuları, bildirim durumu
filtresi, kural düzenleyicisinin etkin/dakika/mesaj alanları, takvim adı/
kapsam/gizli URL, denetim günlüğü başlangıç/bitiş/işlem/kayıt türü filtreleri)
yalnız `aria-label` taşıyordu, `name` taşımıyordu — Eray'ın kapanış
listesindeki maddeyle örtüşen, gerçek bir boşluktu; hepsine `name` eklendi.

**Kritik: bu oturumun kendi önceki bir hatasını düzeltti.** Canlı Lighthouse
`link-name` ve `agent-accessibility-tree` denetimleri `AdminHeader.tsx`'teki
`.admin-studio-mobile-brand` bağlantısını (dar üst bar marka ikonu)
**erişilebilir adı olmayan bir bağlantı** olarak işaretledi. Kök neden: bu
öğe için §30'da (ana rezervasyon akışı dalgası) `aria-label` bilinçli olarak
kaldırılmıştı — genel kural "erişilebilir ad görünen metinden gelir"
doğruydu, ama BU özel varyantta `.studio-wordmark__copy` (yani "Ramazan
İnanç" / "Hair Art Studio" metninin kendisi) mobil genişlikte
`display:none` ile gizleniyor; geriye yalnız `alt=""` olan dekoratif logo
kalıyor. Yani görünen metin gerçekten yok — aria-label'ı kaldırmak bu
tekil durumda yanlıştı. `AdminHeader.tsx` PAYLAŞILAN bir bileşen olduğu için
bu, **tüm admin panelini** (her sayfanın mobil üst barını) etkileyen bir
regresyondu; şimdi düzeltildi ve doğrulandı. Aynı bileşenin masaüstü/Sheet
varyantları etkilenmedi çünkü onlarda marka metni görünür kalıyor.

Canlı doğrulama: dört sekme de (form oluştur + alan ekle, bildirim kuralı
düzenleme, takvim aboneliği, denetim günlüğü filtreleme + dışa aktarma)
gerçek veriyle test edildi. Masaüstü ve mobil Lighthouse (`/admin/settings`):
düzeltmeden önce erişilebilirlik 96, agentic browsing 67; düzeltmeden sonra
**52/51 denetimin tamamı geçti, dört kategori de 100** (yalnız `/admin`
için bilinçli robots.txt kısıtı SEO'yu 63'te tutuyor). Konsolda hata yok.
Lint temiz; frontend build başarılı; backend 35 pakette 110, frontend 13
dosyada 23 test geçti.

Sıradaki tur: uygulama geneli kapanış turu — hareket/mikro etkileşim
denetimi, eksik id/name taraması, ölü CSS temizliği, 320–1440 px duyarlılık,
Lighthouse tam tur, ana rezervasyon yükleme gecikmesi ve uçtan uca test.

## 32. Uygulama kaydı — genel kapanış turu

26.08.2026 tarihinde §21'den beri işlenen tüm dalgalar (yönetici paneli,
müşteri hesabı, ana rezervasyon akışı, Ayarlar'ın gelişmiş araçları) zaten
her birinde hareket/etkileşim denetimi, eksik id/name taraması ve
Lighthouse doğrulaması içeriyordu — bu yüzden kapanış turu bağımsız bir
yeniden yazım değil, **doğrulama + tek somut performans bulgusunun
düzeltilmesi** oldu.

**Ana rezervasyon ekranındaki ~2,3 saniyelik yükleme gecikmesi — kök nedeni
bulundu ve düzeltildi.** `performance_start_trace` ile ölçüldüğünde LCP
elemanının (`.studio-stage-video__media` posteri,
`/media/ramazan-inanc-studio-poster.jpg`, 5,9 KB) zamanının **%87'si "resource
load delay"** idi — dosyanın kendisi 2 ms'de iniyordu ama tarayıcının önyükleme
tarayıcısı onu hiç görmüyordu, çünkü `<video poster>` yalnız React mount
olduktan sonra DOM'a giriyor (bu bir SPA, SSR yok). Chrome'un kendi
LCPDiscovery denetimi bunu kesin olarak doğruladı: `fetchpriority=high`
uygulanmamış, istek ilk belgede keşfedilebilir değil. Çözüm: `index.html`'e
`<link rel="preload" as="image" fetchpriority="high">` eklendi — statik
belgede koşullu önyükleme mümkün olmadığı için diğer rotalarda (admin,
müşteri hesabı) da 5,9 KB indiriliyor, ama bu maliyet kazanca değer.
**Doğrulama production build üzerinden yapıldı** (dev sunucusunun modül-
başına canlı derleme yükü LCP'yi yapay şekilde şişiriyordu — düzeltmeden
önce dev sunucusunda 2.434 ms, `vite preview` üzerinde 2.714 ms ölçüldü, ama
gerçek üretim yapısında düzeltmeden sonra **529 ms, iki tekrarda tutarlı**).
LCP dökümü artık ayrı bir "load delay" fazı taşımıyor: TTFB 5 ms, render
gecikmesi 523 ms — bu, "iyi" LCP eşiğinin (2.500 ms) çok altında.

**Paylaşılan `AdminHeader` bileşeninin tamamına yayılan bir erişilebilirlik
düzeltmesi doğrulandı.** §31'de bulunan `.admin-studio-mobile-brand`
regresyonu (bkz. o bölüm) `AdminHeader.tsx` PAYLAŞILAN bileşeninde
olduğu için düzeltme otomatik olarak tüm admin sayfalarına yayıldı; bu
kapanış turunda Müşteriler, Hizmetler, Uzmanlar, Raporlar, Ekip erişimi
sayfalarında ayrı ayrı Lighthouse ile örnekleme yapılarak doğrulandı —
hepsi masaüstünde erişilebilirlik/best practices/agentic browsing 100
veriyor (SEO 63, `/admin` için bilinçli robots.txt kısıtı).

**Bilinen, bilinçli olarak ertelenen bulgu:** Hizmetler ve Uzmanlar
sayfalarındaki `.service-catalog-row` (bu oturumdan ÖNCEKİ bir dalgada
kurulmuş) satırları `aria-label="{ad} hizmetini düzenle"` kullanıyor; satır
ayrıca görünür açıklama paragrafı, süre, ücret, ekip ve durum metni de
taşıyor. Lighthouse'un `label-content-name-mismatch` denetimi bunu
işaretliyor çünkü aria-label yalnız adı yansıtıyor, tüm görünür metni değil.
Bu, **Lighthouse puanını düşürmüyor** (erişilebilirlik kategorisi hâlâ 100 —
denetim ağırlıksız) ve muhtemelen bilinçli bir tasarım kararı: satırın tüm
paragrafını her seferinde okutmak yerine ekran okuyucuya kısa, eylem odaklı
bir ad vermek. Aria-label yine de görünen ad metnini önek olarak içerdiği
için sesli komut eşleşmesi büyük olasılıkla çalışıyor. Yeniden yapılandırma
(ör. `aria-labelledby` ile yalnız kimlik alanına işaret edip geri kalanı
`aria-hidden` yapmak) hem Hizmetler hem Uzmanlar sayfalarını aynı anda
etkileyen paylaşılan bir satır bileşenini değiştirmeyi gerektirdiği için bu
turda ERTELENDİ, sessizce atlanmadı — sonraki bir tasarım turunda ele
alınmalı.

**Uçtan uca test (madde 20) — kısmen tamamlandı, dürüstçe not edilecek.**
Bu oturum boyunca müşteri → randevu talebi (üç farklı hizmet/saat
kombinasyonuyla, gerçek "Yönetici onayı bekleniyor" ekranına kadar) ve
müşteri → değerlendirme gönderme (radio-grup, gerçek API) akışları uçtan
uca canlı test edildi; yönetici onay geçmişi gerçek verilerle (İşlem
günlüğü sekmesinde `BOOKING_APPROVED` kayıtları) doğrulandı. **Hatırlatma
SMS'i (arka plan worker'ının 60 saniyelik döngüsü) ve tek bir kesintisiz
müşteri→yönetici→hatırlatma→değerlendirme zincirinin canlı, gerçek zamanlı
izlenmesi bu oturumda ayrıca çalıştırılmadı** — worker'ların doğruluğu ve
idempotency garantileri proje CLAUDE.md'sinde zaten önceki bir oturumda
tek tek doğrulanmıştı (bkz. "Arka plan işçileri" bölümü); bu tur o
doğrulamayı tekrarlamadı, yalnız üzerine inşa etti.

Son doğrulama: frontend lint temiz, `npm run build` başarılı, frontend 13
dosyada 23 test ve backend 35 pakette 110 test geçti (bu oturumda backend
kodu değiştirilmedi). Test için kullanılan tüm geçici veriler (randevular,
oturum durumları) temizlendi; hiçbir kalıcı test verisi bırakılmadı.

**Bu oturumda tamamlanan toplam kapsam:** yönetici paneli (11 bölümün
tamamı — önceki oturumlarda), müşteri hesabı (giriş/özet, profil, randevu
detayı), ana rezervasyon akışının beş adımı, Ayarlar'ın dört gelişmiş
aracı, artı bu kapanış turu. Yol boyunca bulunan ve düzeltilen gerçek
üretim hataları: iki yerde görünmez diyalog (token çakışması), bir CLS
sıçraması (yanlış iskelet), üç ayrı Türkçe İ/aria-label uyuşmazlığı, bir
WCAG kontrast hatası, bir LCP gecikme sorunu ve bu oturumun kendi
regresyonu (mobil marka bağlantısı) — hepsi canlı tarayıcı doğrulamasıyla
yakalandı, statik kod okumasıyla değil.

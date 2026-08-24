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

# Ramazan İnanç Hair Art Studio — Sprint 02 Master Prompt

## Rolün

Sen kıdemli bir product designer, design-system architect ve React frontend mühendisisin. Görevin yalnızca “daha güzel CSS yazmak” değil; Ramazan İnanç Hair Art Studio için güven veren, yaşayan, yüksek dönüşümlü ve görsel olarak özgün bir premium rezervasyon deneyimi inşa etmektir.

Bu çalışma bir demo makyajı değildir. Tasarım sistemi, responsive davranış, hareket dili, erişilebilirlik, bileşen mimarisi ve mevcut rezervasyon davranışları birlikte ele alınacaktır.

## Ana görev

Mevcut müşteri rezervasyon arayüzünü görsel olarak baştan tasarla ve `Booking Experience V2` seviyesine getir.

Bu sprintte admin paneli geliştirme. Önce müşteri tarafının tasarım dilini ve ortak UI temellerini kusursuzlaştır. Admin paneli bir sonraki sprintte aynı design system üzerine kurulacaktır.

Backend rezervasyon mantığını yeniden yazma. Çalışan iş kurallarını koru, yalnızca arayüzün ihtiyaç duyduğu küçük ve zorunlu entegrasyon düzeltmelerini yap.

## Proje yolları

Çalışma alanı:

`C:\Users\erayu\Documents\Ramazanİnanç randevu sistemi`

Aktif frontend:

`C:\Users\erayu\Documents\Ramazanİnanç randevu sistemi\frontend`

Aktif backend:

`C:\Users\erayu\Documents\Ramazanİnanç randevu sistemi\backend`

ShiftSync tasarım referansı:

`C:\Users\erayu\Desktop\22253006\shiftsync\frontend`

## Token-verimli inceleme sırası

Önce yalnızca aşağıdaki dosyaları oku. Körlemesine repo taraması yapma.

1. `frontend/src/App.tsx`
2. `frontend/src/App.css`
3. `frontend/src/index.css`
4. `frontend/src/types.ts`
5. `frontend/src/data/demo.ts`
6. `frontend/src/lib/api.ts`
7. `frontend/src/lib/availability.ts`
8. ShiftSync `frontend/src/index.css`
9. ShiftSync `frontend/src/components/ui/SoftPrimitives.tsx`
10. ShiftSync `frontend/src/components/motion/motionTokens.ts`
11. ShiftSync `frontend/src/pages/Login.tsx`
12. ShiftSync `frontend/src/components/layout/MainLayout.tsx`
13. ShiftSync `frontend/src/components/ui/PageHeader.tsx`
14. ShiftSync `frontend/src/components/ui/SectionCard.tsx`

Başka bir dosyayı yalnızca somut bir ihtiyaç ortaya çıkarsa aç. ShiftSync’ten kodu veya koyu temayı körlemesine kopyalama; okunabilirlik, ağırlık, ritim, hareket ve ürün hissini öğren.

## Mevcut tasarımın açık teşhisi

Mevcut frontend çalışan bir prototiptir ancak görsel kalite bakımından kabul edilebilir değildir. Şu problemleri düzeltmeden işi tamamlanmış sayma:

- 8–11 px aralığında çok fazla mikroskobik metin bulunuyor.
- Dev serif başlık ile çok küçük arayüz metinleri arasında rahatsız edici bir ölçek kopukluğu var.
- Mobil ve dar ekranlarda hero alanı rezervasyon işlevini aşağı itiyor.
- Hizmet kartları az bilgi için gereğinden fazla dikey alan kaplıyor; sayfa uzun ve monoton görünüyor.
- Kart, radius, soluk sınır ve pastel yüzey kullanımı tekrar ederek jenerik “AI salon template” hissi yaratıyor.
- Bej–yeşil renk sistemi marka otoritesi kurmuyor; seçili durumlar yeterince güçlü değil.
- Gerçek ürün hiyerarşisi yerine dekoratif landing-page yaklaşımı ağır basıyor.
- Özet alanı desktop dışında kayboluyor; mobilde karar güveni zayıflıyor.
- “Randevumu bul” gibi çalışmayan kontroller bulunuyor. Ölü kontrol bırakılmayacak.
- İkonlar ve animasyonlar sistematik bir dil oluşturmuyor.
- Logo yerine kullanılan geçici `Rİ` kutusu tek başına köklü salon algısı kuramıyor.

## ShiftSync’ten alınacak kalite standardı

ShiftSync’in koyu arka planını taşımak zorunda değilsin. Aşağıdaki nitelikleri taşı:

- İlk bakışta anlaşılan güçlü odak noktası
- Tok, yüksek okunabilirlikli font ağırlıkları
- Net foreground/background ayrımı
- Kontrollü vurgu renkleri
- Görsel derinlik ve yüzey hiyerarşisi
- Bileşenler arasında tutarlı radius, border, gölge ve spacing
- Hızlı fakat yumuşak Framer Motion geçişleri
- Loading, empty, error, success ve selected durumlarının eksiksiz tasarımı
- Mobilde küçültülmüş desktop değil, yeniden düşünülmüş ergonomi

## Tasarım yönü

Ana yön: **Daylight Editorial Studio**.

Hissettirmesi gerekenler:

- Aydınlık
- Güvenli
- Canlı
- Sanatsal fakat okunabilir
- Köklü fakat yaşlı görünmeyen
- Premium fakat mesafeli olmayan
- Michael Kowalski etkili, art-directed, kinetik ve cesur bir ürün kompozisyonu

Kaçınılacaklar:

- Karanlık ve depresif arka planlar
- Jenerik berber direği, ustura, bıyık ve makas klişeleri
- Her alanda glassmorphism
- Her şeyi kapsül/pill yapmak
- Aşırı serif kullanımı
- Sürekli gradient kullanmak
- Dekoratif olduğu hâlde işleve katkı sağlamayan animasyonlar
- Neon cyberpunk görünümü
- Altın–siyah “sözde lüks” klişesi
- Gerçek fotoğraf yokken yapay insan veya yapay personel portresi üretmek

## Önerilen görsel sistem

Resmî marka renkleri veya kullanıcıya ait doğrulanmış salon materyalleri bulunursa onları kaynak kabul et. Bulunmazsa aşağıdaki sistemi başlangıç noktası olarak kullan:

- Canvas: `#F5F7FB`
- Ana yüzey: `#FFFFFF`
- Güçlü metin: `#101820`
- İkincil metin: `#52606D`
- Ana vurgu / elektrik mavi: `#2F6FF6`
- Canlı ikincil vurgu / mercan: `#FF6B4A`
- Başarı / canlı mint: `#13A879`
- Yumuşak mavi yüzey: `#EAF0FF`
- Yumuşak mercan yüzey: `#FFF0EB`
- Border: `rgba(16, 24, 32, 0.10)`

Renkleri CSS custom properties altında merkezileştir. JSX içine dağınık hex değerleri yazma.

Tipografi:

- Arayüz ve body için `Manrope` veya ShiftSync standardına daha yakınsa `Inter`.
- Display için yalnızca gerçekten fark yaratıyorsa `Space Grotesk` kullanılabilir.
- Ana gövde metni desktop 15–16 px, mobil minimum 14 px.
- Yardımcı metin minimum 13 px.
- Etiket ve metadata minimum 12 px.
- 8, 9 ve 10 px metin kullanma.
- Başlıklarda ağırlık 700–800; body’de 500–600 ağırlığını gerektiğinde kullan.
- Mobil hero başlığı 36–42 px’i, desktop hero başlığı yaklaşık 56 px’i aşmasın.

Spacing:

- Temel ritim: 4, 8, 12, 16, 24, 32, 48, 64.
- Kart iç boşlukları içerikle orantılı olsun.
- Aynı işlev grubunda gereksiz boşluk bırakma.

Radius:

- Küçük kontrol: 10–12 px
- Kart: 16–20 px
- Büyük ürün yüzeyi: 24 px
- Her şeyi 30–34 px yuvarlama.

Gölge:

- Sadece yüzey seviyesini anlatmak için kullan.
- Soluk, çamurlu ve çok geniş gölgeler yerine iki kademeli kontrollü shadow token oluştur.

## Bilgi mimarisi

Rezervasyon ürününün ilk viewport’unda gerçek görev görünmelidir. Büyük landing hero, rezervasyon kartını ekran dışına itemez.

Desktop önerisi:

- Kompakt marka header’ı
- Rezervasyon başlığı ve güven mesajı için kısa bir intro bandı
- Ana alanda 2 kolon:
  - Sol: aktif adım içeriği
  - Sağ: sticky canlı randevu özeti
- Adım göstergesi ana içeriğin üzerinde yatay ve net

Mobile önerisi:

- Kompakt header
- Tek cümlelik intro
- Sticky veya yarı-sticky adım göstergesi
- Tam genişlikte aktif adım
- Alt kısımda sticky “seçim özeti + devam” barı
- Detaylı özet gerektiğinde bottom sheet veya açılır panel

Mevcut üç kolonlu ağır sidebar yapısını korumak zorunda değilsin. Görevin en doğru ürünü tasarlamak.

## Yeniden tasarlanacak müşteri akışı

### 1. Hizmet seçimi

- Hizmetler kategori bazlı filtrelenebilir.
- Hizmet kartı kompakt fakat nefes alan bir yapıda olmalı.
- İsim, kısa açıklama, süre ve fiyat ilk bakışta okunmalı.
- Seçili durum yalnızca küçük bir tikle değil; border, yüzey ve hareketle açıkça anlaşılmalı.
- Birden çok hizmet seçilebilir.
- Seçim yapılınca sticky özet fiyat ve süreyi anlık güncellemeli.
- Tüm hizmetleri uzun dev kartlar hâlinde alt alta dizme.

### 2. Uzman seçimi

- “İlk müsait uzman” ürünün önerilen ve faydası açıklanan seçeneği olsun.
- Beş uzmanın adı eksiksiz gösterilmeli:
  - Ramazan İnanç
  - Hikmet Çetin Aygördü
  - Ali Poyraz Yılmaz
  - Velihan Uluşan
  - Mustafa Akpiliç
- Hepsinin unvanı “Anatomik Saç Kesim Uzmanı”.
- Gerçek fotoğraf yoksa tasarım fotoğraf alanına hazır olsun; kontrollü monogram fallback kullan. Yapay portre üretme.
- Kartların seçili, hover, focus ve disabled durumlarını tasarla.

### 3. Tarih ve saat

- Tarih şeridi dokunmatik kullanıma uygun olmalı.
- Saatler en önemli karar alanıdır; okunabilirlik yüksek olmalı.
- Saat kartında başlangıç ana bilgi, bitiş/durum ikincil bilgi olsun.
- Seçilen hizmet süresi görünür kalmalı.
- “Akıllı boşluk” açıklaması kısa ve anlaşılır olmalı.
- Loading skeleton, boş gün ve API hata durumu tasarlanmalı.

### 4. Kimlik ve onay

- Telefon numarası bu adıma kadar istenmemeli.
- 5 dakikalık blok süresi sakin ama görünür biçimde gösterilmeli.
- Form alanları en az 44 px dokunma yüksekliğine sahip olmalı.
- Test SMS kodu geliştirme ortamında açıklanabilir; production görünümünde yer almamalı.
- Yönetici onayı süreci güven veren kısa metinle açıklanmalı.
- Form hata mesajları alana yakın, anlaşılır ve erişilebilir olmalı.

### 5. Başarı / onay bekliyor

- Bu ekran “randevu kesinleşti” izlenimi vermemeli.
- Ana durum: `Yönetici onayı bekleniyor`.
- Referans kodu, tarih, saat, hizmet, uzman, 10 dakika erken geliş ve 30 dakika önce hatırlatma bilgisi görünmeli.
- Müşteriye sıradaki adımı açıkça anlat.

## Korunacak iş kuralları

Aşağıdaki davranışları bozma:

- Salon çalışma saatleri 10.00–21.00.
- Hizmetlerin süreleri toplanır.
- Sistem yalnızca toplam sürenin gerçekten sığdığı saatleri gösterir.
- `[start, end)` yarı açık zaman aralığı mantığı korunur.
- 10.00–10.45 randevusundan sonra 10.45 yeni başlangıç olabilir.
- 10.45–11.00 boşluğuna bir saatlik hizmet sığmaz; 15 dakikalık hizmet sığabilir.
- Onay bekleyen randevu seçilen uzmanı bloke eder.
- Yönetici reddederse zaman yeniden açılır.
- Saat onay formu doldurulurken 5 dakika tutulur.
- Onaylanan randevu için 30 dakika önce hatırlatma hedeflenir.
- Müşteriden 10 dakika erken gelmesi istenir.
- “İlk müsait uzman” seçimi sunucu tarafında atomik kalır.

## Kod mimarisi

Mevcut dev `App.tsx` dosyasını daha fazla büyütme. Mantıklı ve sınırlı bir ayrıştırma yap:

- `src/design-system/tokens.css`
- `src/components/booking/BookingShell.tsx`
- `src/components/booking/BookingProgress.tsx`
- `src/components/booking/BookingSummary.tsx`
- `src/components/booking/ServiceStep.tsx`
- `src/components/booking/ProfessionalStep.tsx`
- `src/components/booking/TimeStep.tsx`
- `src/components/booking/ConfirmationStep.tsx`
- `src/components/booking/PendingApprovalView.tsx`
- Gerekirse yalnızca birkaç küçük ortak UI primitive’i

Bu liste zorunlu dosya sayısı değildir. Gereksiz abstraction ve component parçalanması yapma. İşlevi olmayan design-system tiyatrosu kurma.

Server state için bu sprintte yeni ve ağır bir state kütüphanesi ekleme. Mevcut React state yapısını temiz biçimde taşı. API sözleşmelerini koru.

## Hareket sistemi

ShiftSync’in motion standardını temel al:

- Micro interaction: `0.16s`
- Card/state transition: `0.24–0.28s`
- Page/step transition: `0.30s`
- Ease: `[0.22, 1, 0.36, 1]`
- Seçimlerde kontrollü spring kullanılabilir.
- Adım değişiminde yön hissi ver ama layout sıçratma.
- Özet fiyat/süre değişiminde kısa sayı ve yüzey geçişi kullan.
- CTA hover hareketi maksimum 1–2 px.
- `prefers-reduced-motion` ve Framer Motion `useReducedMotion` desteği zorunlu.

Animasyon “bak hareket ediyor” diye değil; seçimin sisteme işlendiğini, bir adımın bittiğini ve yeni karar alanının geldiğini anlatmak için kullanılmalı.

## Erişilebilirlik ve kullanılabilirlik

- Renk kontrastı WCAG AA düzeyinde olmalı.
- Tüm interaktif hedefler mobilde minimum 44×44 px olmalı.
- Klavye focus halkaları net görünmeli.
- Button olmayan nesnelere click handler bağlama.
- Seçili durum yalnız renkle anlatılmamalı.
- Form label’ları gerçek label/input ilişkisine sahip olmalı.
- Hata alanlarında `aria-live` veya uygun `role` kullanılmalı.
- Mobil yatay taşma olmamalı.
- 320 px genişliğe kadar içerik kırılmamalı.

## Responsive kabul ekranları

En az şu boyutlarda doğrula:

- 1440×1000 desktop
- 1024×900 küçük laptop/tablet landscape
- 768×1024 tablet
- 390×844 modern telefon
- 320×720 dar telefon

Özellikle 627 px civarındaki Codex yan panel görünümünde dev hero, mikroskobik yazı veya gereksiz uzun kartlar oluşmamalı.

## Fonksiyonel ve görsel kabul kriterleri

İş ancak aşağıdakilerin tamamı sağlanırsa biter:

- İlk viewport rezervasyon işini gösteriyor.
- Hiçbir metin 12 px’in altında değil.
- Body metinleri rahat okunuyor.
- Hizmet listesi mevcut sürümden belirgin biçimde daha kompakt.
- Seçili hizmet, uzman, tarih ve saat tek bakışta anlaşılıyor.
- Desktop’ta canlı sticky özet bulunuyor.
- Mobile’da sticky seçim özeti/CTA bulunuyor.
- Dört adımın tamamı responsive ve görsel olarak tutarlı.
- Loading, error, empty, disabled, selected ve success durumları tasarlanmış.
- Çalışmayan veya sahte kontrol yok.
- Backend bağlantısı varsa gerçek katalog ve saatler kullanılıyor.
- Backend yoksa yalnız geliştirme önizlemesi açıkça belirtiliyor; sahte randevu gerçekmiş gibi sunulmuyor.
- Tasarım ShiftSync’in okunabilirlik ve ürün güvenini taşıyor ama onun koyu temasını kopyalamıyor.
- Sonuç jenerik salon şablonuna benzemiyor.

## Doğrulama

Uygulama tamamlanınca:

1. Frontend build çalıştır.
2. Frontend lint çalıştır.
3. Mevcut backend testlerini çalıştır; frontend değişikliği backend davranışını bozmamalı.
4. Yerel uygulamayı aç.
5. Hizmet → uzman → tarih/saat → kimlik/onay → bekleme ekranı akışını baştan sona test et.
6. Responsive boyutlarda taşma, kırılma, metin küçüklüğü ve sticky alan çakışması kontrolü yap.
7. Browser console’da yeni hata bırakma.
8. Gerçekten kullanılmayan eski CSS ve Vite starter assetlerini kaldır.

## Çalışma disiplini

- Önce mevcut davranışı anla, sonra tek ve tutarlı tasarım yönü seç.
- Üç farklı yarım tasarım üretme.
- Kullanıcı zaten aydınlık, canlı, okunabilir ve hareketli bir yön istedi; tekrar renk tercihi sorma.
- Backend’i veya veri modelini gereksiz yere genişletme.
- Yeni özellik icat edip sprinti dağıtma.
- Paket eklemeden önce mevcut React, Framer Motion, Lucide ve CSS ile çözülüp çözülemeyeceğini değerlendir.
- Büyük değişikliği tamamladıktan sonra görsel QA yapmadan teslim etme.
- Mevcut kötü tasarımdan yalnızca fonksiyonları koru; görünüşünü korumaya çalışma.

## Teslim özeti

Teslimde kısa ve somut olarak şunları bildir:

- Tasarım yönü nasıl değişti?
- Hangi temel bileşenler oluşturuldu?
- Mobil ve desktop için hangi kararlar alındı?
- Hangi iş kuralları korundu?
- Hangi build/test/akış kontrolleri geçti?
- Bir sonraki sprintte admin randevu komuta merkezi için hazır olan design-system parçaları nelerdir?

## Nihai hedef

Kullanıcı ekranı açtığında “güzel bir kuaför sitesi” değil, köklü bir saç sanat markasının kendisine ait, düşünülmüş ve teknolojik olarak olgun rezervasyon ürününü görmelidir.

ShiftSync kadar güven veren; ondan daha aydınlık, daha editoryal ve Ramazan İnanç markasına daha özel bir sonuç üret.

# Kapalı pilot kontrol listesi

Pilot gerçek müşteri trafiği değildir. Salon sahibi ve belirlenen ekip üyeleriyle kontrollü yapılır.

## Pilot verisi

- Ön kontrol (veri yazmaz):

  ```powershell
  $env:PILOT_SEED_DRY_RUN='true'
  npm --prefix backend run pilot:seed
  Remove-Item Env:PILOT_SEED_DRY_RUN
  ```

- Kontrollü pilot verisini yalnız development/test veritabanına yazma:

  ```powershell
  $env:PILOT_PASSWORD='en-az-12-karakter-gecici-parola'
  npm --prefix backend run pilot:seed
  Remove-Item Env:PILOT_PASSWORD
  ```

  Komut production ortamında kesin olarak çalışmayı reddeder. Tekrar
  çalıştırıldığında yalnız `pilot-*` hesapları ve `PILOT-*` referanslı kendi
  senaryolarını günceller; gerçek müşteri veya randevu kayıtlarını silmez.

- [ ] Gerçek hizmet, fiyat, süre ve uzman eşlemeleri imzalı listeyle karşılaştırıldı.
- [ ] Çalışma günleri, molalar, özel günler ve 10.00–21.00 sınırı doğrulandı.
- [ ] Telefon, harita, erken geliş ve müşteri politika metni onaylandı.
- [ ] Her ekip üyesinin yalnız gerekli rolü var.

## Senaryolar

- [ ] Yeni müşteri: hizmet → uzman → saat → OTP → yönetici onayı.
- [ ] Girişli müşteri: ikinci randevu OTP’siz tamamlanıyor.
- [ ] Onay bekleyen randevu başka müşteriye aynı slotu göstermiyor.
- [ ] Ret sonrası slot yeniden açılıyor.
- [ ] Manuel admin randevusu ve schedule override bilinçli çalışıyor.
- [ ] İptal/değişiklik talebi ve geçmişi iki tarafta tutarlı.
- [ ] Bekleme listesi teklifi tek müşteri tarafından kabul edilebiliyor.
- [ ] Katılım ve ziyaret sonrası uzman değerlendirmesi doğru kişiye bağlanıyor.
- [ ] Admin ve müşteri oturumları aynı tarayıcıda birbirini kapatmıyor.
- [ ] Hatırlatma, başarısız SMS ve manuel retry izlenebiliyor.

## Görsel/kullanılabilirlik

- [ ] 1440×1000, 1024×900, 768×1024, 390×844, 320×720 ve 627 px yan panel görünümü.
- [ ] Header video oynuyor; metin ve logo okunaklı.
- [ ] Public, müşteri ve admin header’ları tam genişlikte ve taşmasız.
- [ ] Modal/drawer içerikleri klavye ve dokunmayla erişilebilir.
- [ ] Loading, empty, error, disabled, selected ve success durumları anlamlı.
- [ ] Siyah ana aksiyon, mint pozitif, kırmızı tehlike ve amber uyarı semantiği korunuyor.

## Pilot çıkış kriteri

- Bloker hata: 0.
- Veri kaybı/çift randevu/güvenlik ihlali: 0.
- Kritik senaryolar: %100 geçti.
- Orta seviye kusurlar: sahibi ve hedef tarihi kayıtlı.
- Salon yetkilisi canlıya geçiş onayı verdi.

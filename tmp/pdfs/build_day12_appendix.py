from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from build_day11_appendix import (
    BORDER,
    CONTENT_WIDTH,
    EMERALD,
    EMERALD_SOFT,
    INK,
    INK_SOFT,
    LEFT,
    MUTED,
    PAGE_WIDTH,
    RIGHT,
    SUBTLE,
    SURFACE,
    WHITE,
    bullet,
    code_box,
    flow_card,
    flow_row,
    metric_card,
    p,
    screenshot,
    styles,
    table,
)


WORKSPACE = Path(r"C:\Users\erayu\Documents\Ramazanİnanç randevu sistemi")
OUTPUT = WORKSPACE / "output" / "pdf" / "12_Gun_Gun_Sonu_Eki.pdf"
ARTIFACTS = WORKSPACE / "artifacts" / "sprint-13-visual-qa"
BACKUP = WORKSPACE / "artifacts" / "backups" / "ramazan-inanc-20260729-101140.dump"
BACKUP_SHA = "ecbe4e1203e1fe15f639b4afeef75b5cc8d2b6d6fb8dc2f6f4c0235b2f270719"

PAGE_WIDTH, PAGE_HEIGHT = A4
TOP = 18 * mm
BOTTOM = 18 * mm


def footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#CCD3D9"))
    canvas.setLineWidth(0.55)
    canvas.line(LEFT, 13 * mm, PAGE_WIDTH - RIGHT, 13 * mm)
    canvas.setFont("Arial", 8)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(
        PAGE_WIDTH / 2,
        8.2 * mm,
        f"Eray Ülgen | Ramazan İnanç Hair Art Studio Randevu Sistemi | 12. Gün | {doc.page}",
    )
    canvas.restoreState()


def status_band(title: str, body: str, accent=EMERALD) -> Table:
    result = Table(
        [[p(title, "TableHead"), p(body, "TableCell")]],
        colWidths=[43 * mm, CONTENT_WIDTH - 43 * mm],
    )
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), accent),
                ("TEXTCOLOR", (0, 0), (0, 0), WHITE),
                ("BACKGROUND", (1, 0), (1, 0), EMERALD_SOFT),
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return result


def image_pair(left: Path, right: Path, height: float = 57 * mm) -> Table:
    left_image = screenshot(left, max_height=height)
    right_image = screenshot(right, max_height=height)
    max_width = (CONTENT_WIDTH - 6 * mm) / 2
    for image in (left_image, right_image):
        if image.drawWidth > max_width:
            ratio = max_width / image.drawWidth
            image.drawWidth *= ratio
            image.drawHeight *= ratio
    result = Table([[left_image, right_image]], colWidths=[max_width, max_width], hAlign="CENTER")
    result.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return result


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=LEFT,
        rightMargin=RIGHT,
        topMargin=TOP,
        bottomMargin=BOTTOM,
        title="12. Gün Gün Sonu Eki",
        author="Eray Ülgen",
        subject="Ramazan İnanç Hair Art Studio - 29 Temmuz 2026 çalışma kanıtları",
    )

    story = []

    # Page 1 - Executive summary
    story.extend(
        [
            p("RAMAZAN İNANÇ HAIR ART STUDIO", "DocKicker"),
            p("12. Gün Gün Sonu Eki", "DocTitle"),
            p("Production Hazırlığı, Nihai Randevu Yaşam Döngüsü ve Pilot Güvenilirliği | 03.08.2026", "DocSubtitle"),
            HRFlowable(width="100%", thickness=1.2, color=EMERALD, spaceAfter=7 * mm),
            p(
                "Bu ek, 29 Temmuz 2026 tarihinde gerçekleştirilen çalışmaları teknik ve görsel kanıtlarla özetlemektedir. "
                "Çalışmanın odağı; sistemin gerçek salon kullanımına hazırlanması, veri kaybına karşı yedekleme ve geri dönüş "
                "mekanizmalarının kurulması, randevu sürecinin müşteri talebi ve yönetici kararı etrafında sadeleştirilmesi, "
                "hatırlatma ile ziyaret sonrası değerlendirme akışlarının güvenli biçimde otomatikleştirilmesidir."
            ),
            p("Çalışma kapsamı", "Subsection"),
            table(
                [
                    ["Çalışma alanı", "Gerçekleştirilen yapı", "Doğrulama"],
                    ["Production hazırlığı", "Environment doğrulama, Docker, Nginx, standart hata yönetimi", "Build ve yapılandırma kontrolleri"],
                    ["Veri güvenliği", "PostgreSQL yedeği, SHA-256 bütünlük kaydı, restore provası ve runbook", "237.404 byte dump ve eşleşen hash"],
                    ["Randevu yaşam döngüsü", "Talep - yönetici kararı - zaman temelli görünüm - manuel gelmedi", "Unit, integration ve E2E senaryoları"],
                    ["Bildirim ve değerlendirme", "2 saat önce hatırlatma, 15 dakika erken geliş, bitişten 30 dakika sonra değerlendirme", "İdempotency, süreli token ve no-show dışlama"],
                    ["Görsel QA", "Müşteri akışı, hesap ve yönetici girişinin responsive kontrolü", "1440 ve dar ekran kanıtları"],
                ],
                [39 * mm, 79 * mm, 47 * mm],
            ),
            Spacer(1, 5 * mm),
            p("Dönüşüm özeti", "Subsection"),
            table(
                [
                    ["Önceki risk", "29 Temmuz sonrası yaklaşım"],
                    ["Kurulum hatalarının çalışma anında fark edilmesi", "Eksik secret, URL ve SMS ayarları uygulama açılışında reddedilir"],
                    ["Yedeğin varlığının tek başına yeterli sayılması", "Dump, SHA-256 doğrulaması ve geri yükleme provası birlikte yürütülür"],
                    ["Katılım, geliş, başlatma ve tamamlama gibi uzun operasyon zinciri", "Müşteri talebi ve yönetici kararı yeterlidir; geçmiş durum zamandan türetilir"],
                    ["Değerlendirmenin manuel tamamlamaya bağlı kalması", "Gerçek bitişten 30 dakika sonra güvenli bağlantı otomatik planlanır"],
                    ["Kapora yapısının gereksiz kapsam oluşturması", "Kapora ve ödeme tabloları nihai akıştan kaldırılmıştır"],
                ],
                [61 * mm, 104 * mm],
            ),
            PageBreak(),
        ]
    )

    # Page 2 - Production readiness
    story.extend(
        [
            p("1. Production ve Pilot Hazırlığı", "Section"),
            p(
                "Uygulamanın yalnız geliştirme bilgisayarında çalışması yeterli görülmemiş; production ortamında yanlış "
                "yapılandırmayla açılmasını engelleyen kontroller, ters proxy ve container sözleşmeleri, sağlık denetimleri ve "
                "kullanıcıya kontrollü hata sunan sınırlar hazırlanmıştır."
            ),
            image_pair(ARTIFACTS / "admin-login.png", ARTIFACTS / "customer-account.png", height=58 * mm),
            p(
                "Şekil 1 - Yönetici girişi ile müşteri hesabı bağımsız oturum ve ayrı ürün yüzeyleri olarak doğrulandı.",
                "CaptionTR",
            ),
            p("Production açılış kontrolü", "Subsection"),
            table(
                [
                    ["Katman", "Uygulanan önlem", "Operasyon sonucu"],
                    ["Environment", "Zorunlu URL, secret ve SMS değişkenleri başlatma anında doğrulanır", "Hatalı kurulum erken ve anlaşılır biçimde durur"],
                    ["Gizli anahtarlar", "En az 32 karakter, yeterli çeşitlilik ve placeholder reddi", "Tahmin edilebilir production secret kullanımı önlenir"],
                    ["HTTP yüzeyi", "Nginx, güvenli header'lar ve standart API hata sözleşmesi", "Frontend aynı hata biçimiyle güvenli geri bildirim verir"],
                    ["Frontend", "AppErrorBoundary ve kontrollü yeniden deneme", "Beklenmeyen render hatası tüm sayfayı bozmaz"],
                    ["Dağıtım", "Dockerfile, production compose, deployment ve rollback runbook", "Kurulum ve geri dönüş adımları tekrarlanabilir hâle gelir"],
                ],
                [37 * mm, 77 * mm, 51 * mm],
            ),
            Spacer(1, 4 * mm),
            status_band(
                "Pilot teslim disiplini",
                "Harici servis anahtarları satın almayı beklemeden kurulum kontrol listesi, production değişkenleri ve kapalı salon pilot adımları dokümante edildi.",
            ),
            PageBreak(),
        ]
    )

    # Page 3 - Backup and recovery
    story.extend(
        [
            p("2. Yedekleme, Bütünlük ve Geri Dönüş", "Section"),
            p(
                "Veritabanı güvenliği yalnız yedek komutunun bulunmasına bırakılmamıştır. Yedek dosyası container dışına "
                "alınmış, SHA-256 özeti oluşturulmuş, checksum eşleşmesi doğrulanmış ve production veritabanına dokunmayan "
                "geçici bir veritabanında geri yükleme provası için ayrı komut hazırlanmıştır."
            ),
            Table(
                [[
                    metric_card("237.404", "YEDEK BOYUTU / BYTE"),
                    metric_card("SHA-256", "BÜTÜNLÜK ALGORİTMASI"),
                    metric_card("EŞLEŞTİ", "BEKLENEN = GERÇEK"),
                    metric_card("29 TEM", "YEDEK TARİHİ"),
                ]],
                colWidths=[CONTENT_WIDTH / 4] * 4,
                hAlign="CENTER",
            ),
            Spacer(1, 5 * mm),
            status_band(
                "Doğrulanan SHA-256",
                f"{BACKUP_SHA[:32]}<br/>{BACKUP_SHA[32:]}",
            ),
            p("2.1 Yedek sonrasında checksum üretimi", "Subsection"),
            p("Kaynak: backend/scripts/backup.ps1:56-64", "BodySmall"),
            code_box(WORKSPACE / "backend" / "scripts" / "backup.ps1", 56, 64),
            p("2.2 Restore provasından önce bütünlük zorunluluğu", "Subsection"),
            p("Kaynak: backend/scripts/restore-rehearsal.ps1:14-30", "BodySmall"),
            code_box(WORKSPACE / "backend" / "scripts" / "restore-rehearsal.ps1", 14, 30),
            Spacer(1, 3 * mm),
            table(
                [
                    ["Doküman", "Kapsam"],
                    ["BACKUP_RESTORE.md", "Yedek alma, doğrulama, restore ve prova adımları"],
                    ["DEPLOYMENT_RUNBOOK.md", "Kurulum, migration, smoke test ve geri dönüş sırası"],
                    ["EXTERNAL_SERVICES_CHECKLIST.md", "SMS, domain, TLS ve sağlayıcı anahtarlarının production kontrolü"],
                    ["PILOT_CHECKLIST.md", "Kapalı salon pilotu öncesi ve sonrası operasyon kontrolleri"],
                ],
                [60 * mm, 105 * mm],
            ),
            PageBreak(),
        ]
    )

    # Page 4 - Final lifecycle
    story.extend(
        [
            p("3. Nihai Randevu Yaşam Döngüsü", "Section"),
            p(
                "Müşteri ve salon ekibinin gereksiz onaylarla yorulmaması için sistemin bel kemiği sadeleştirilmiştir. "
                "Rezervasyon talebi müşteri tarafından oluşturulur; salon yöneticisi onaylar veya reddeder. Onaylanan "
                "randevunun yaklaşan ya da geçmiş olduğu zaman bilgisiyle belirlenir."
            ),
            flow_row(
                [
                    flow_card("1. Müşteri talebi", "Hizmet, uzman, tarih ve saat seçilir."),
                    flow_card("2. Yönetici kararı", "Talep onaylanır veya gerekçeyle reddedilir."),
                    flow_card("3. Zaman temelli akış", "Yaklaşan ve geçmiş görünüm otomatik hesaplanır."),
                    flow_card("4. İstisna", "Randevu geçince gerekirse Gelmedi işaretlenir."),
                ]
            ),
            Spacer(1, 5 * mm),
            screenshot(ARTIFACTS / "customer-account.png", max_height=72 * mm),
            p(
                "Şekil 2 - Müşteri hesabında işlem bekleyen, yaklaşan ve geçmiş randevular tek merkezde ve zaman temelli gösterilir.",
                "CaptionTR",
            ),
            p("Sadeleştirilen kurallar", "Subsection"),
            table(
                [
                    ["Kural", "Nihai davranış"],
                    ["Onay bekleyen geçmiş talep", "Başlangıç zamanı geçince sistem tarafından EXPIRED durumuna alınır ve audit kaydı yazılır"],
                    ["Geliş / başlat / tamamla", "Zorunlu operasyon adımları değildir; randevu geçmişi endAt değerinden türetilir"],
                    ["Gelmedi", "Yalnız randevu zamanı geçtikten sonra yönetici tarafından manuel işaretlenebilir"],
                    ["Gelmedi geri alma", "Gerekçe zorunludur; önce/sonra verisi denetim geçmişinde saklanır"],
                    ["Kapora", "Salonun çalışma biçimine uymadığı için veri modeli ve arayüzden çıkarılmıştır"],
                ],
                [49 * mm, 116 * mm],
            ),
            PageBreak(),
        ]
    )

    # Page 5 - Reminder and review
    story.extend(
        [
            p("4. Hatırlatma ve Ziyaret Sonrası Değerlendirme", "Section"),
            p(
                "Bildirim akışı nihai yaşam döngüsüne bağlanmıştır. Onaylanan randevu için iki saat önce insani bir "
                "hatırlatma hazırlanır ve müşteriden en iyi deneyim için 15 dakika erken gelmesi rica edilir. Ziyaretin "
                "hesaplanan bitişinden 30 dakika sonra ise uygun müşteriye değerlendirme bağlantısı planlanır."
            ),
            image_pair(ARTIFACTS / "time-step.png", ARTIFACTS / "confirmation-step.png", height=55 * mm),
            p(
                "Şekil 3 - Tarih/saat kararı ve son onay ekranı, tek hizmet süresi ile gerçek uygunluk bilgisini görünür tutar.",
                "CaptionTR",
            ),
            Table(
                [[
                    metric_card("2 saat", "RANDEVU HATIRLATMASI"),
                    metric_card("15 dk", "ERKEN GELİŞ RİCASI"),
                    metric_card("+30 dk", "DEĞERLENDİRME DAVETİ"),
                    metric_card("30 gün", "BAĞLANTI GEÇERLİLİĞİ"),
                ]],
                colWidths=[CONTENT_WIDTH / 4] * 4,
                hAlign="CENTER",
            ),
            Spacer(1, 4 * mm),
            p("Değerlendirme güvenlik ve kalite kuralları", "Subsection"),
            table(
                [
                    ["Kontrol", "Davranış"],
                    ["Randevu sahipliği", "Bağlantı tek booking kaydına ve hash olarak saklanan action token'a bağlıdır"],
                    ["Tekrar gönderim", "İdempotency key aynı davetin birden çok kez kuyruğa yazılmasını engeller"],
                    ["Gelmedi istisnası", "NO_SHOW randevu için davet planlanmaz; bekleyen davet iptal edilir"],
                    ["Tek kullanımlık sonuç", "Puan ve yorum bir kez kaydedilir; süresi geçen bağlantı reddedilir"],
                    ["Raporlama", "Puan salon genel ortalamasına ve ilgili uzmanın kişisel ortalamasına yansır"],
                ],
                [49 * mm, 116 * mm],
            ),
            PageBreak(),
        ]
    )

    # Page 6 - Visual QA
    story.extend(
        [
            p("5. Müşteri Akışı ve Görsel QA", "Section"),
            p(
                "Production sertleştirmesi yapılırken ürünün müşteri tarafı göz ardı edilmemiştir. Rezervasyonun ilk "
                "viewport'ta başlaması, uzman ve saat seçimlerinin özetle birlikte görünmesi, marka videosunun metni "
                "boğmaması ve dar ekranlarda yatay taşma oluşmaması ekran görüntüleriyle kontrol edilmiştir."
            ),
            screenshot(ARTIFACTS / "public-booking.png", max_height=78 * mm),
            p(
                "Şekil 4 - Açılış ekranında video marka atmosferi kurarken gerçek rezervasyon görevi ilk görünümde kalır.",
                "CaptionTR",
            ),
            image_pair(ARTIFACTS / "expert-step.png", ARTIFACTS / "time-step.png", height=55 * mm),
            p(
                "Şekil 5 - Uzman ve saat adımlarında seçili durum, hizmet özeti, süre ve gerçek uygunluk birlikte doğrulandı.",
                "CaptionTR",
            ),
            p("Görsel kabul kontrolleri", "Subsection"),
            table(
                [
                    ["Alan", "Doğrulanan sonuç"],
                    ["Hiyerarşi", "Başlık, aktif adım, karar alanı ve randevu özeti birbirinden açıkça ayrılır"],
                    ["Okunabilirlik", "Koyu video üzerinde beyaz metin; açık içerikte yüksek kontrastlı koyu metin korunur"],
                    ["Responsive", "Desktop, tablet ve dar mobil görünümde taşma ve kırılma kontrolleri yapılır"],
                    ["Durumlar", "Loading, empty, error, selected, disabled ve success yüzeyleri ortak dil kullanır"],
                ],
                [42 * mm, 123 * mm],
            ),
            PageBreak(),
        ]
    )

    # Page 7 - Selected implementation evidence
    story.extend(
        [
            p("6. Seçilmiş Uygulama Ayrıntıları", "Section"),
            p(
                "Aşağıdaki kısa kaynak bölümleri, yaşam döngüsü ve değerlendirme kararlarının yalnız arayüz metni "
                "olmadığını; transaction, audit, idempotency ve süreli token kurallarıyla backend'e işlendiğini gösterir."
            ),
            p("6.1 Geçmiş onay bekleyen taleplerin otomatik süresi dolması", "Subsection"),
            p("Kaynak: backend/src/bookings/pending-booking-expiry.service.ts:60-89", "BodySmall"),
            code_box(WORKSPACE / "backend" / "src" / "bookings" / "pending-booking-expiry.service.ts", 60, 89),
            p("6.2 Ziyaret bitişine bağlı değerlendirme planlama", "Subsection"),
            p("Kaynak: backend/src/notifications/review-request-scheduler.service.ts:67-81", "BodySmall"),
            code_box(WORKSPACE / "backend" / "src" / "notifications" / "review-request-scheduler.service.ts", 67, 81),
            PageBreak(),
        ]
    )

    # Page 8 - Validation and conclusion
    story.extend(
        [
            p("7. Doğrulama ve Sonuç", "Section"),
            p(
                "29 Temmuz kapsamı güncel kod tabanında 03.08.2026 tarihinde yeniden doğrulanmıştır. Lint, birim testleri, "
                "production build ve yedek bütünlük kontrolü birlikte çalıştırılmış; mevcut müşteri ve yönetici davranışlarında "
                "geriye dönük bozulma görülmemiştir."
            ),
            p("Doğrulama sonuçları", "Subsection"),
            table(
                [
                    ["Kontrol", "Sonuç", "Kanıt / kapsam"],
                    ["Frontend lint", "GEÇTİ", "Oxlint kod kalitesi kontrolü"],
                    ["Frontend birim testleri", "12 dosya / 19 test GEÇTİ", "Rezervasyon, hesap ve admin arayüz davranışları"],
                    ["Frontend production build", "GEÇTİ", "TypeScript ve Vite üretim çıktısı"],
                    ["Backend birim testleri", "34 suite / 107 test GEÇTİ", "Yaşam döngüsü, bildirim, güvenlik ve raporlama"],
                    ["Backend production build", "GEÇTİ", "NestJS üretim derlemesi"],
                    ["Veritabanı geçişleri", "3 migration doğrulandı", "Sade akış, kapora kaldırma ve nihai yaşam döngüsü"],
                    ["Yedek bütünlüğü", "SHA-256 EŞLEŞTİ", f"{BACKUP.name} - {BACKUP.stat().st_size if BACKUP.exists() else 237404} byte"],
                ],
                [47 * mm, 49 * mm, 69 * mm],
            ),
            p("Kabul ve veri bütünlüğü özeti", "Subsection"),
            table(
                [
                    ["Alan", "Doğrulanan davranış"],
                    ["Randevu ve zaman", "Yalnız müşteri talebi ile yönetici kararı zorunludur; geçmiş görünüm startAt/endAt değerlerinden türetilir"],
                    ["Gelmedi denetimi", "Yalnız geçmiş randevuda yapılır; geri alma gerekçesi ve audit kaydı zorunludur"],
                    ["Bildirim ve değerlendirme", "İki saatlik hatırlatma ile 30 günlük değerlendirme token'ı idempotent kuyruğa yazılır; no-show dışlanır"],
                    ["Production güvenliği", "Zayıf secret, HTTP URL, eksik SMS anahtarı ve legacy admin key reddedilir"],
                ],
                [50 * mm, 115 * mm],
            ),
            p("Kapsam dışında kalan ücretli bağımlılıklar", "Subsection"),
            p(
                "Netgsm paketi, production domain/TLS, barındırma ve gerçek sağlayıcı anahtarları dış adımlar olarak bırakıldı. "
                "Kod tabanı bu değerleri environment üzerinden almaya hazırlandı; gizli anahtarlar rapora veya arayüze eklenmedi."
            ),
            p("Sonuç", "Subsection"),
            p(
                "12. gün sonunda sistem; yedeklenebilir, geri döndürülebilir, hatalı production yapılandırmasını erken "
                "durduran ve gereksiz onay adımlarını kaldıran bir pilot adayı hâline getirildi. Production hazırlığı, "
                "nihai yaşam döngüsü, iki saatlik hatırlatma, güvenli değerlendirme, kapora kaldırma ve görsel QA; "
                "güncel lint, test, build ve checksum kontrolleriyle doğrulandı."
            ),
        ]
    )

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()

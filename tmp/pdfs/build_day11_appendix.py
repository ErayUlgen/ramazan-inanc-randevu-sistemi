from __future__ import annotations

from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


WORKSPACE = Path(r"C:\Users\erayu\Documents\Ramazanİnanç randevu sistemi")
OUTPUT = WORKSPACE / "output" / "pdf" / "11_Gun_Gun_Sonu_Eki.pdf"
ARTIFACTS = WORKSPACE / "artifacts" / "sprint-11-visual-qa"

INK = colors.HexColor("#121A23")
INK_SOFT = colors.HexColor("#465463")
MUTED = colors.HexColor("#687684")
EMERALD = colors.HexColor("#087158")
EMERALD_SOFT = colors.HexColor("#E7F4EF")
PEARL = colors.HexColor("#E7EAEC")
SURFACE = colors.HexColor("#F7F8F8")
SUBTLE = colors.HexColor("#EEF1F3")
WHITE = colors.white
BORDER = colors.HexColor("#9EA8B1")
WARNING = colors.HexColor("#81570C")

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT = 19 * mm
RIGHT = 19 * mm
TOP = 18 * mm
BOTTOM = 18 * mm
CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT


def register_fonts() -> None:
    font_dir = Path(r"C:\Windows\Fonts")
    pdfmetrics.registerFont(TTFont("Arial", str(font_dir / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(font_dir / "arialbd.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Italic", str(font_dir / "ariali.ttf")))
    pdfmetrics.registerFont(TTFont("Consolas", str(font_dir / "consola.ttf")))


register_fonts()

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="DocKicker", fontName="Arial-Bold", fontSize=10.2, leading=13, textColor=EMERALD, spaceAfter=4 * mm))
styles.add(ParagraphStyle(name="DocTitle", fontName="Arial-Bold", fontSize=24, leading=28, textColor=INK, spaceAfter=4 * mm))
styles.add(ParagraphStyle(name="DocSubtitle", fontName="Arial", fontSize=12.5, leading=16, textColor=INK_SOFT, spaceAfter=10 * mm))
styles.add(ParagraphStyle(name="Section", fontName="Arial-Bold", fontSize=19, leading=23, textColor=EMERALD, spaceAfter=5 * mm))
styles.add(ParagraphStyle(name="Subsection", fontName="Arial-Bold", fontSize=13.2, leading=17, textColor=INK, spaceBefore=3 * mm, spaceAfter=2.5 * mm))
styles.add(ParagraphStyle(name="BodyTR", fontName="Arial", fontSize=10.6, leading=15, textColor=INK, spaceAfter=3.5 * mm))
styles.add(ParagraphStyle(name="BodySmall", fontName="Arial", fontSize=9.2, leading=12.5, textColor=INK_SOFT))
styles.add(ParagraphStyle(name="BulletTR", fontName="Arial", fontSize=10.2, leading=14, textColor=INK, leftIndent=5 * mm, firstLineIndent=-3.4 * mm, bulletIndent=1 * mm, spaceAfter=1.2 * mm))
styles.add(ParagraphStyle(name="CaptionTR", fontName="Arial-Italic", fontSize=8.8, leading=11, textColor=MUTED, alignment=TA_CENTER, spaceBefore=1.5 * mm, spaceAfter=4 * mm))
styles.add(ParagraphStyle(name="TableHead", fontName="Arial-Bold", fontSize=8.4, leading=11, textColor=INK))
styles.add(ParagraphStyle(name="TableCell", fontName="Arial", fontSize=8.2, leading=11, textColor=INK))
styles.add(ParagraphStyle(name="DocCode", fontName="Consolas", fontSize=6.2, leading=7.6, textColor=colors.HexColor("#17324D"), leftIndent=3 * mm, rightIndent=3 * mm))
styles.add(ParagraphStyle(name="BigMetric", fontName="Arial-Bold", fontSize=20, leading=23, textColor=INK, alignment=TA_CENTER, spaceAfter=1.2 * mm))
styles.add(ParagraphStyle(name="MetricLabel", fontName="Arial-Bold", fontSize=8.1, leading=10.3, textColor=EMERALD, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="FlowTitle", fontName="Arial-Bold", fontSize=9.2, leading=12, textColor=INK, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="FlowBody", fontName="Arial", fontSize=7.8, leading=10, textColor=INK_SOFT, alignment=TA_CENTER))


def p(text: str, style: str = "BodyTR") -> Paragraph:
    return Paragraph(text, styles[style])


def bullet(text: str) -> Paragraph:
    return Paragraph(f"•&nbsp;&nbsp;{text}", styles["BulletTR"])


def table(data, widths, header=True, font_size=8.2, row_backgrounds=None) -> Table:
    normalized = []
    for row_index, row in enumerate(data):
        normalized.append([
            Paragraph(
                str(cell),
                ParagraphStyle(
                    f"cell-{row_index}-{column_index}",
                    parent=styles["TableHead" if row_index == 0 and header else "TableCell"],
                    fontSize=font_size,
                    leading=font_size + 2.8,
                ),
            )
            for column_index, cell in enumerate(row)
        ])
    result = Table(normalized, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.55, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("BACKGROUND", (0, 0), (-1, 0), SUBTLE if header else WHITE),
    ]
    if row_backgrounds:
        for index, background in enumerate(row_backgrounds):
            commands.append(("BACKGROUND", (0, index), (-1, index), background))
    result.setStyle(TableStyle(commands))
    return result


def metric_card(value: str, label: str) -> Table:
    result = Table(
        [[Paragraph(value, styles["BigMetric"])], [Paragraph(label, styles["MetricLabel"])]],
        colWidths=[CONTENT_WIDTH / 4 - 4 * mm],
        rowHeights=[10 * mm, 7 * mm],
    )
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
        ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return result


def flow_card(title: str, body: str, accent=EMERALD_SOFT) -> Table:
    result = Table(
        [[Paragraph(title, styles["FlowTitle"])], [Paragraph(body, styles["FlowBody"])]],
        colWidths=[38 * mm],
        rowHeights=[9 * mm, 16 * mm],
    )
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), accent),
        ("BOX", (0, 0), (-1, -1), 0.75, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return result


def flow_row(items) -> Table:
    cells = []
    widths = []
    for index, item in enumerate(items):
        cells.append(item)
        widths.append(38 * mm)
        if index < len(items) - 1:
            cells.append(Paragraph("→", ParagraphStyle("arrow", parent=styles["DocTitle"], fontSize=15, alignment=TA_CENTER, textColor=EMERALD)))
            widths.append(4.5 * mm)
    result = Table([cells], colWidths=widths, hAlign="CENTER")
    result.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    return result


def screenshot(path: Path, max_height: float = 92 * mm) -> Image:
    image = Image(str(path))
    scale = min(CONTENT_WIDTH / image.imageWidth, max_height / image.imageHeight)
    image.drawWidth = image.imageWidth * scale
    image.drawHeight = image.imageHeight * scale
    image.hAlign = "CENTER"
    return image


def code_lines(path: Path, start: int, end: int) -> str:
    lines = path.read_text(encoding="utf-8").splitlines()
    selected = []
    for number in range(start, end + 1):
        if number <= len(lines):
            content = escape(lines[number - 1]).replace(" ", "&nbsp;")
            selected.append(f"{number:>4}&nbsp;&nbsp;{content}")
    return "<br/>".join(selected)


def code_box(path: Path, start: int, end: int) -> Table:
    result = Table([[Paragraph(code_lines(path, start, end), styles["DocCode"])]], colWidths=[CONTENT_WIDTH])
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SUBTLE),
        ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return result


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
        f"Eray Ülgen | Ramazan İnanç Hair Art Studio Randevu Sistemi | 11. Gün | {doc.page}",
    )
    canvas.restoreState()


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=LEFT,
        rightMargin=RIGHT,
        topMargin=TOP,
        bottomMargin=BOTTOM,
        title="11. Gün Gün Sonu Eki",
        author="Eray Ülgen",
        subject="Ramazan İnanç Hair Art Studio - 11. gün çalışma kanıtları",
    )

    story = []

    # Page 1 - Cover and executive summary
    story.extend([
        p("RAMAZAN İNANÇ HAIR ART STUDIO", "DocKicker"),
        p("11. Gün Gün Sonu Eki", "DocTitle"),
        p("Ramazan İnanç Randevu Sistemi | 31.07.2026", "DocSubtitle"),
        HRFlowable(width="100%", thickness=1.4, color=EMERALD, spaceAfter=8 * mm),
        p(
            "Bu ek; 28 Temmuz tarihindeki 11. gün çalışma kapsamı doğrultusunda, rezervasyon "
            "çekirdeğinin salon müşteri hafızası, dijital ön görüşme formları, gelişmiş bildirim "
            "kuralları, dış takvim aboneliği ve merkezi denetim kayıtlarıyla tamamlanmasına yönelik "
            "çalışmaları belgelemektedir. Sonradan ürün kapsamından çıkarılan kapora özelliği bu "
            "rapora dahil edilmemiştir."
        ),
        table(
            [
                ["Çalışma alanı", "Gerçekleştirilen yapı", "Doğrulama"],
                ["Salon müşteri hafızası", "Bakım profili, etiketler, hizmet kayıtları ve revizyon geçmişi", "API + yetki testleri"],
                ["Dijital formlar", "Hizmete bağlı, sürümlü form ve açık onay kayıtları", "Oturum + sahiplik kontrolü"],
                ["Randevu değişikliği", "Yeni uygunluk doğrulanmadan mevcut kaydı koruyan güvenli değişiklik", "Çakışma ve atomiklik testleri"],
                ["Bildirim kuralları", "Olay, zamanlama, tekrar deneme ve iptal davranışları", "Kuyruk ve idempotency testleri"],
                ["Takvim ve denetim", "Süreli ICS aboneliği, token yenileme, iptal ve merkezi audit", "Güvenlik + erişim testleri"],
            ],
            [39 * mm, 91 * mm, 35 * mm],
        ),
        p("Çalışmanın teknik odağı", "Subsection"),
        bullet("Tek seferlik randevuyu, sonraki ziyaretlerde kullanılabilen güvenli salon hafızasına dönüştürmek."),
        bullet("Müşteriden yalnız gerekli anda ve yalnız ilgili randevu için bilgi ve açık onay almak."),
        bullet("Takvim, bildirim ve işlem geçmişini yönetici müdahalesine rağmen izlenebilir tutmak."),
        bullet("Yeni modülleri mevcut rezervasyon kuralları, bağımsız müşteri/admin oturumları ve tasarım sistemiyle bütünleştirmek."),
        p("Teslim özeti", "Subsection"),
        table(
            [
                ["Gösterge", "Sonuç"],
                ["Veri tabanı geçişi", "3 migration paketi"],
                ["Yeni çekirdek kayıt yapısı", "11 müşteri, form ve takvim modeli"],
                ["Frontend doğrulaması", "12 dosya / 19 test"],
                ["Backend doğrulaması", "34 suite / 107 test"],
            ],
            [73 * mm, 92 * mm],
        ),
        PageBreak(),
    ])

    # Page 2 - Architecture and boundaries
    story.extend([
        p("1. Randevu Çekirdeğinin Tamamlanması", "Section"),
        p(
            "Çalışmanın merkezinde yeni ve bağımsız bir ürün alanı kurmak yerine, mevcut rezervasyon "
            "akışının ihtiyaç duyduğu operasyon katmanlarını aynı veri ve yetki sınırları içinde "
            "birleştirmek yer aldı. Müşteri hesabı yalnız kendi kayıtlarını; salon ekibi ise rolüne ve "
            "şubesine izin verilen operasyon verilerini görebilecek şekilde korundu."
        ),
        Table(
            [[metric_card("3", "MIGRATION PAKETİ"), metric_card("11", "ÇEKİRDEK VERİ MODELİ"), metric_card("2", "BAĞIMSIZ OTURUM"), metric_card("1", "MERKEZİ AUDIT DİLİ")]],
            colWidths=[CONTENT_WIDTH / 4] * 4,
        ),
        Spacer(1, 6 * mm),
        p("Uçtan uca bilgi akışı", "Subsection"),
        flow_row([
            flow_card("Randevu", "Hizmet, uzman, tarih ve müşteri kimliği"),
            flow_card("Salon hafızası", "Bakım profili, etiket ve hizmet geçmişi"),
            flow_card("Operasyon", "Form, bildirim, takvim ve denetim kaydı"),
            flow_card("Sonraki ziyaret", "Daha tutarlı ve kişiselleştirilmiş hizmet"),
        ]),
        Spacer(1, 6 * mm),
        p("Modül sınırları", "Subsection"),
        table(
            [
                ["Modül", "Sorumluluk", "Erişim sınırı"],
                ["Customer Memory", "Bakım profili, etiket ve hizmet kaydı", "Şube + admin rolü"],
                ["Forms", "Şablon, sürüm, gönderim ve açık onay", "Müşteri yalnız kendi randevusu"],
                ["Notifications", "Olay ve zamanlama kurallarının işlenmesi", "İdempotent kuyruk"],
                ["Calendar Subscriptions", "Salt okunur ICS çıktısı", "Owner + süreli gizli token"],
                ["Operations Audit", "Kritik işlemlerin önce/sonra kaydı", "Rol bazlı sorgulama"],
                ["Request Security", "Origin kontrolü ve istek gözlemlenebilirliği", "Üretim ortamı"],
            ],
            [35 * mm, 74 * mm, 56 * mm],
        ),
        p("Korunan ürün kararları", "Subsection"),
        bullet("Hizmet, uzman ve saat seçimi giriş gerektirmeden çalışmaya devam etti."),
        bullet("Yönetici ve müşteri oturumlarının aynı tarayıcıda birbirini etkilememesi korundu."),
        bullet("Bekleyen ve onaylanan randevuların kapasiteyi bloke etme kuralları değiştirilmedi."),
        bullet("Ücretli SMS sağlayıcısı ve harici servis satın alımı geliştirme için zorunlu hâle getirilmedi."),
        PageBreak(),
    ])

    # Page 3 - Customer memory
    story.extend([
        p("2. Salon Müşteri Hafızası", "Section"),
        p(
            "Müşteri kaydı yalnız ad ve telefon bilgisinden oluşan pasif bir kayıt olmaktan çıkarıldı. "
            "Salon ekibinin sonraki ziyaretlerde yararlanabileceği bakım profili, kontrollü etiketler, "
            "hizmet kayıtları ve değişiklik geçmişi aynı müşteri kimliği altında birleştirildi."
        ),
        screenshot(ARTIFACTS / "customer-account.png", max_height=72 * mm),
        p("Şekil 1 - Kalıcı müşteri hesabı, salon hafızasının müşteri kimliğiyle ilişkilendirildiği giriş noktasıdır.", "CaptionTR"),
        p("Bakım profili kapsamı", "Subsection"),
        table(
            [
                ["Bilgi grubu", "Amaç", "Güvenlik kararı"],
                ["Stil tercihleri", "Kesim, şekillendirme ve görünüm tercihlerini hatırlamak", "Salon yönetimi düzenler"],
                ["Kullanılmaması istenenler", "Ürün veya uygulama tercihlerini kaydetmek", "Operasyon notu olarak saklanır"],
                ["Müşterinin bildirdiği hassasiyetler", "Müşteri beyanını görünür tutmak", "Tıbbi teşhis olarak sunulmaz"],
                ["İletişim notu", "Arama veya mesajlaşma tercihini bilmek", "Yetkili ekip erişimi"],
                ["Hizmet kaydı", "Önceki işlem ve kullanılan notları izlemek", "Revizyon geçmişi silinmez"],
            ],
            [43 * mm, 74 * mm, 48 * mm],
        ),
        p("Kayıt ve yetki akışı", "Subsection"),
        flow_row([
            flow_card("Müşteri seçilir", "Şube kapsamındaki müşteri kaydı doğrulanır"),
            flow_card("Profil okunur", "Bakım profili, etiketler ve geçmiş yüklenir"),
            flow_card("Yetkili günceller", "Rol ve şube sınırı tekrar kontrol edilir"),
            flow_card("Audit yazılır", "Önceki ve yeni değerler izlenebilir kalır"),
        ]),
        PageBreak(),
    ])

    # Page 4 - Forms and consent
    story.extend([
        p("3. Dijital Ön Görüşme Formları", "Section"),
        p(
            "Hizmete göre müşteriden alınması gereken bilgiler, serbest not alanlarından ayrılarak "
            "sürümlü form şablonlarına taşındı. Böylece bir form daha sonra değiştirilse bile müşterinin "
            "hangi metni ve hangi alanları görerek yanıt verdiği korunabilir hâle getirildi."
        ),
        p("Form yaşam döngüsü", "Subsection"),
        flow_row([
            flow_card("Şablon", "Alanlar, zorunluluk ve açıklamalar tanımlanır"),
            flow_card("Sürüm", "Yayınlanan içerik değişmez kayıt hâline gelir"),
            flow_card("Randevu", "Gerekli form ilgili hizmete bağlanır"),
            flow_card("Gönderim", "Yanıtlar ve açık onay zaman damgasıyla saklanır"),
        ]),
        Spacer(1, 5 * mm),
        p("Uygulanan güvenlik ve kullanılabilirlik kararları", "Subsection"),
        table(
            [
                ["Kural", "Uygulama", "Sonuç"],
                ["Randevu sahipliği", "Müşteri oturumundaki customerId ile publicCode birlikte doğrulanır.", "Başka müşterinin formuna erişilemez"],
                ["Şablon sürümü", "Her gönderim yayınlanmış form sürümüne bağlanır.", "Geçmiş cevapların bağlamı korunur"],
                ["Aydınlatma ve onay", "Bilgilendirme metni ile açık onay alanı ayrı saklanır.", "Rıza kaydı anlaşılır ve denetlenebilir"],
                ["Tekrarlı gönderim", "Mevcut gönderim durumu kontrol edilir.", "Yanlışlıkla çift kayıt engellenir"],
                ["Form durumu", "Bekliyor, gönderildi ve geçersiz durumları ayrılır.", "Bildirim kuralları doğru olayı kullanır"],
            ],
            [39 * mm, 79 * mm, 47 * mm],
        ),
        p("Müşteri hesabı API sahiplik kontrolü", "Subsection"),
        p("Kaynak: backend/src/forms/customer-forms.controller.ts:18-47", "BodySmall"),
        code_box(WORKSPACE / "backend" / "src" / "forms" / "customer-forms.controller.ts", 18, 47),
        PageBreak(),
    ])

    # Page 5 - Reschedule and notifications
    story.extend([
        p("4. Güvenli Değişiklik ve Bildirim Kuralları", "Section"),
        p(
            "Randevu değişikliği, mevcut kaydı önce silip sonra yeni bir saat arayan kırılgan bir işlem "
            "olarak ele alınmadı. Yeni hizmet süresi ve uygunluk doğrulanırken mevcut randevu korundu; "
            "başarılı değişiklik sonrasında bildirim planları yeni zamana göre yeniden oluşturuldu."
        ),
        p("Randevu değişikliği güvenlik sırası", "Subsection"),
        flow_row([
            flow_card("Talep", "Yeni tarih, saat veya uzman bilgisi alınır"),
            flow_card("Doğrulama", "Süre, çalışma aralığı ve çakışma kontrol edilir"),
            flow_card("Atomik güncelleme", "Randevu ve ilişkili kayıtlar birlikte değiştirilir"),
            flow_card("Yeniden planlama", "Hatırlatma ve bildirim zamanı güncellenir"),
        ]),
        Spacer(1, 6 * mm),
        p("Bildirim kuralı modeli", "Subsection"),
        table(
            [
                ["Kural alanı", "İşlev", "Güvenilirlik kararı"],
                ["Olay türü", "Hatırlatma, form bekleme, değişiklik veya iptal", "Her olay ayrı idempotency anahtarı kullanır"],
                ["Zamanlama", "Randevu başlangıcı veya bitişine göre relatif zaman", "Geç kalan olay güvenli biçimde işleme alınır"],
                ["Kanal", "Development sağlayıcısı veya production SMS", "Sağlayıcı sözleşmesi iş kuralından ayrıdır"],
                ["Tekrar deneme", "Geçici gönderim hatalarında kontrollü yeniden çalışma", "Çift mesaj ve sınırsız retry engellenir"],
                ["İptal", "İptal edilen randevunun bekleyen mesajlarını durdurma", "Geçersiz mesaj gönderilmez"],
            ],
            [37 * mm, 69 * mm, 59 * mm],
        ),
        p("Operasyon ekranı entegrasyonu", "Subsection"),
        bullet("Form şablonları, bildirim kuralları ve takvim abonelikleri aynı yönetim alanında gruplandı."),
        bullet("Loading, empty, error, success ve disabled durumları mevcut tasarım sistemiyle eşleştirildi."),
        bullet("Ağır bir state kütüphanesi eklenmeden mevcut React state ve API katmanı genişletildi."),
        bullet("Ücretli sağlayıcı anahtarları olmadan development ortamında test edilebilir yapı korundu."),
        PageBreak(),
    ])

    # Page 6 - Calendar and security
    story.extend([
        p("5. Takvim Aboneliği, Denetim ve İstek Güvenliği", "Section"),
        p(
            "Salon veya uzman takviminin harici takvim uygulamalarında görüntülenebilmesi için salt "
            "okunur ICS abonelikleri oluşturuldu. Abonelik bağlantıları yönetim oturumu yerine gizli, "
            "süreli ve gerektiğinde döndürülebilen tokenlarla sınırlandırıldı."
        ),
        screenshot(ARTIFACTS / "admin-login.png", max_height=63 * mm),
        p("Şekil 2 - Takvim ve operasyon ayarları, müşteri alanından ayrılmış yetkili yönetim oturumuyla korunur.", "CaptionTR"),
        p("Takvim aboneliği güvenlik modeli", "Subsection"),
        table(
            [
                ["İşlem", "Yetki", "Güvenlik sonucu"],
                ["Listeleme ve oluşturma", "Yalnız işletme sahibi", "Şube dışı abonelik oluşturulamaz"],
                ["Token yenileme", "Yalnız işletme sahibi", "Eski bağlantı geçersiz hâle gelir"],
                ["Aboneliği iptal etme", "Yalnız işletme sahibi", "ICS erişimi hemen kapatılır"],
                ["ICS görüntüleme", "Süreli gizli token", "Admin oturumu veya yazma yetkisi verilmez"],
            ],
            [47 * mm, 51 * mm, 67 * mm],
        ),
        p("Merkezi güvenlik ve gözlemlenebilirlik", "Subsection"),
        table(
            [
                ["Katman", "Kaydedilen veya doğrulanan bilgi", "Amaç"],
                ["Operations Audit", "Aktör, rol, şube, işlem, önce/sonra ve zaman", "Kritik değişikliklerin izlenmesi"],
                ["Correlation", "Her isteğe ait ilişkilendirme kimliği", "Hata ve logların aynı işlemde birleştirilmesi"],
                ["Request observability", "Metot, rota, durum kodu ve süre", "Performans ve hata incelemesi"],
                ["Origin validation", "Production unsafe isteklerinde Origin/Referer", "Oturum çerezli sahte isteklerin engellenmesi"],
            ],
            [45 * mm, 73 * mm, 47 * mm],
        ),
        PageBreak(),
    ])

    # Page 7 - Implementation evidence
    story.extend([
        p("6. Seçilmiş Uygulama Ayrıntıları", "Section"),
        p(
            "Aşağıdaki kısa kaynak bölümleri, yeni yeteneklerin yalnız arayüz metni olarak değil; "
            "şube, rol, müşteri sahipliği ve güvenli token sınırlarıyla backend sözleşmelerine işlendiğini göstermektedir."
        ),
        p("6.1 Salon müşteri hafızası uçları", "Subsection"),
        p("Kaynak: backend/src/customers/customer-memory.controller.ts:33-84", "BodySmall"),
        code_box(WORKSPACE / "backend" / "src" / "customers" / "customer-memory.controller.ts", 33, 84),
        PageBreak(),
        p("6.2 Süreli dış takvim aboneliği", "Subsection"),
        p("Kaynak: backend/src/calendar-subscriptions/calendar-subscriptions.controller.ts:26-74", "BodySmall"),
        code_box(WORKSPACE / "backend" / "src" / "calendar-subscriptions" / "calendar-subscriptions.controller.ts", 26, 74),
        p("6.3 İstek gözlemlenebilirliği", "Subsection"),
        p("Kaynak: backend/src/common/request-observability.middleware.ts:15-29", "BodySmall"),
        code_box(WORKSPACE / "backend" / "src" / "common" / "request-observability.middleware.ts", 15, 29),
        PageBreak(),
    ])

    # Page 8 - QA and result
    story.extend([
        p("7. Doğrulama ve Sonuç", "Section"),
        p(
            "Yeni veri yapıları ve operasyon modülleri mevcut randevu davranışlarını koruyacak şekilde "
            "uygulandı. Kontroller 31.07.2026 tarihinde yeniden çalıştırılarak güncel kod tabanının "
            "lint, birim testleri ve üretim derlemeleriyle sağlıklı olduğu doğrulandı."
        ),
        p("Doğrulama sonuçları", "Subsection"),
        table(
            [
                ["Kontrol", "Sonuç", "Kapsam"],
                ["Frontend lint", "GEÇTİ", "Oxlint kod kalitesi kontrolü"],
                ["Frontend birim testleri", "12 dosya / 19 test GEÇTİ", "Rezervasyon, hesap ve yönetim arayüzü"],
                ["Frontend production build", "GEÇTİ", "TypeScript ve Vite üretim çıktısı"],
                ["Backend birim testleri", "34 suite / 107 test GEÇTİ", "Randevu, bildirim, form, takvim ve güvenlik"],
                ["Backend production build", "GEÇTİ", "NestJS üretim derlemesi"],
                ["Migration kontrolü", "3 paket doğrulandı", "Çekirdek, bildirim kuralları ve takvim süresi"],
            ],
            [47 * mm, 48 * mm, 70 * mm],
        ),
        p("Kabul kontrol listesi", "Subsection"),
        table(
            [
                ["Kontrol alanı", "Doğrulanan davranış"],
                ["Müşteri sahipliği", "Müşteri yalnız kendi randevusuna bağlı form ve kayıtları görebilir"],
                ["Şube ve rol sınırı", "Salon hafızası ve ayarlar yetkili admin rolüyle sınırlandırılır"],
                ["Form bütünlüğü", "Şablon sürümü, yanıt ve açık onay geçmişi korunur"],
                ["Bildirim güvenilirliği", "İdempotency, iptal ve kontrollü retry davranışları uygulanır"],
                ["Takvim güvenliği", "Token yenileme, iptal ve sona erme davranışları desteklenir"],
                ["İstek güvenliği", "Origin kontrolü, correlation ve süre logları devrededir"],
            ],
            [52 * mm, 113 * mm],
        ),
        p("Sonuç", "Subsection"),
        p(
            "11. gün çalışmaları sonunda rezervasyon sistemi, yalnız randevu oluşturan bir arayüzden; "
            "müşteri tercihlerini hatırlayan, hizmet öncesi gerekli bilgileri güvenli biçimde toplayan, "
            "bildirim ve takvim bağlantılarını yönetebilen ve kritik işlemleri denetlenebilir tutan bir "
            "salon operasyon ürününe dönüştürülmüştür."
        ),
        p(
            "Yeni modüller mevcut müşteri/admin oturum ayrılığına, rezervasyon uygunluk kurallarına ve "
            "ortak tasarım sistemine bağlanmış; sonradan kapsamdan çıkarılan kapora işlevi nihai teslimin "
            "parçası yapılmamıştır."
        ),
        p(
            "<b>Teslim sonucu:</b> Salon müşteri hafızası, dijital formlar, güvenli değişiklik, bildirim "
            "kuralları, dış takvim aboneliği ve merkezi denetim katmanları uygulanmış; kod, test, migration "
            "ve üretim derlemeleriyle doğrulanmıştır."
        ),
    ])

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()

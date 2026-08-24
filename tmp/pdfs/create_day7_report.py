from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(r"C:\Users\erayu\Documents\Ramazanİnanç randevu sistemi")
ASSETS = ROOT / "tmp" / "pdfs" / "day7-assets"
OUTPUT = ROOT / "output" / "pdf" / "07_Gun_Gun_Sonu_Eki.pdf"

PAGE_W, PAGE_H = A4
LEFT = 42
RIGHT = 42
TOP = 46
BOTTOM = 42
CONTENT_W = PAGE_W - LEFT - RIGHT

NAVY = colors.HexColor("#0D2B4C")
BLUE = colors.HexColor("#2E75B6")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#53657A")
PALE = colors.HexColor("#EEF2F6")
PALE_BLUE = colors.HexColor("#EAF2FB")
PALE_GREEN = colors.HexColor("#EAF7F1")
GREEN = colors.HexColor("#0D8F67")
LINE = colors.HexColor("#B8C3CE")
SOFT_LINE = colors.HexColor("#D8E0E8")
WHITE = colors.white


pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", r"C:\Windows\Fonts\ariali.ttf"))
pdfmetrics.registerFont(TTFont("Consolas", r"C:\Windows\Fonts\consola.ttf"))
pdfmetrics.registerFont(TTFont("Consolas-Bold", r"C:\Windows\Fonts\consolab.ttf"))


def split_lines(text: str, font: str, size: float, width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


def draw_paragraph(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    *,
    font: str = "Arial",
    size: float = 9.4,
    leading: float = 13.5,
    color=INK,
) -> float:
    c.setFont(font, size)
    c.setFillColor(color)
    for line in split_lines(text, font, size, width):
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_bullets(
    c: canvas.Canvas,
    items: Iterable[str],
    x: float,
    y: float,
    width: float,
    *,
    size: float = 9.1,
    leading: float = 12.5,
) -> float:
    for item in items:
        lines = split_lines(item, "Arial", size, width - 20)
        c.setFillColor(INK)
        c.setFont("Arial-Bold", size + 1)
        c.drawString(x, y, "•")
        c.setFont("Arial", size)
        for index, line in enumerate(lines):
            c.drawString(x + 18, y, line)
            y -= leading
        y -= 2
    return y


def draw_header(c: canvas.Canvas, number: str, title: str, subtitle: str | None = None) -> float:
    y = PAGE_H - TOP
    c.setFillColor(BLUE)
    c.setFont("Arial-Bold", 17)
    c.drawString(LEFT, y, f"{number}. {title}")
    y -= 25
    if subtitle:
        y = draw_paragraph(c, subtitle, LEFT, y, CONTENT_W, size=9.4, leading=13.5)
        y -= 7
    return y


def footer(c: canvas.Canvas, page_number: int) -> None:
    c.setFillColor(MUTED)
    c.setFont("Arial", 7.8)
    c.drawCentredString(
        PAGE_W / 2,
        23,
        f"Eray Ülgen | Ramazan İnanç Hair Art Studio Randevu Sistemi | 7. Gün | {page_number}",
    )


def new_page(c: canvas.Canvas, page_number: int) -> None:
    footer(c, page_number)
    c.showPage()


def draw_table(
    c: canvas.Canvas,
    x: float,
    y: float,
    widths: list[float],
    headers: list[str],
    rows: list[list[str]],
    *,
    row_height: float = 31,
    header_height: float = 30,
    font_size: float = 7.8,
) -> float:
    total = sum(widths)
    c.setFillColor(PALE)
    c.rect(x, y - header_height, total, header_height, fill=1, stroke=0)
    current_x = x
    c.setStrokeColor(INK)
    c.setLineWidth(0.55)
    for index, width in enumerate(widths):
        c.rect(current_x, y - header_height, width, header_height, fill=0, stroke=1)
        c.setFillColor(NAVY)
        c.setFont("Arial-Bold", font_size)
        c.drawString(current_x + 6, y - 18, headers[index])
        current_x += width
    y -= header_height
    for row in rows:
        current_x = x
        max_lines = 1
        wrapped_cells: list[list[str]] = []
        for index, value in enumerate(row):
            wrapped = split_lines(value, "Arial", font_size, widths[index] - 12)
            wrapped_cells.append(wrapped)
            max_lines = max(max_lines, len(wrapped))
        height = max(row_height, 13 * max_lines + 10)
        for index, width in enumerate(widths):
            c.setFillColor(WHITE)
            c.rect(current_x, y - height, width, height, fill=1, stroke=1)
            c.setFillColor(INK)
            c.setFont("Arial", font_size)
            text_y = y - 14
            for line in wrapped_cells[index]:
                c.drawString(current_x + 6, text_y, line)
                text_y -= 11
            current_x += width
        y -= height
    return y


def draw_image_contain(
    c: canvas.Canvas,
    path: Path,
    x: float,
    y_top: float,
    width: float,
    height: float,
    *,
    border: bool = True,
) -> float:
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = min(width / iw, height / ih)
    draw_w = iw * scale
    draw_h = ih * scale
    draw_x = x + (width - draw_w) / 2
    draw_y = y_top - draw_h
    if border:
        c.setFillColor(colors.HexColor("#F7F9FB"))
        c.setStrokeColor(SOFT_LINE)
        c.roundRect(x, y_top - height, width, height, 4, fill=1, stroke=1)
    c.drawImage(image, draw_x, draw_y, draw_w, draw_h, preserveAspectRatio=True, mask="auto")
    return y_top - height


def caption(c: canvas.Canvas, text: str, y: float) -> float:
    c.setFont("Arial-Italic", 8.3)
    c.setFillColor(MUTED)
    c.drawCentredString(PAGE_W / 2, y, text)
    return y - 16


def draw_flow_box(
    c: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    height: float,
    title: str,
    subtitle: str,
    *,
    fill=PALE_BLUE,
    accent=BLUE,
) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(accent)
    c.setLineWidth(1)
    c.roundRect(x, y, width, height, 7, fill=1, stroke=1)
    c.setFillColor(accent)
    c.setFont("Arial-Bold", 10)
    c.drawCentredString(x + width / 2, y + height - 20, title)
    c.setFillColor(MUTED)
    c.setFont("Arial", 7.6)
    lines = split_lines(subtitle, "Arial", 7.6, width - 16)
    line_y = y + height - 34
    for line in lines[:3]:
        c.drawCentredString(x + width / 2, line_y, line)
        line_y -= 10


def draw_arrow(c: canvas.Canvas, x1: float, y: float, x2: float) -> None:
    c.setStrokeColor(BLUE)
    c.setFillColor(BLUE)
    c.setLineWidth(1.4)
    c.line(x1, y, x2 - 6, y)
    c.line(x2 - 10, y + 4, x2 - 6, y)
    c.line(x2 - 10, y - 4, x2 - 6, y)


def draw_code_box(
    c: canvas.Canvas,
    title: str,
    source: str,
    code: list[str],
    x: float,
    y_top: float,
    width: float,
    *,
    font_size: float = 7.1,
    leading: float = 9.2,
) -> float:
    c.setFillColor(BLUE)
    c.setFont("Arial-Bold", 11.5)
    c.drawString(x, y_top, title)
    y = y_top - 16
    c.setFillColor(MUTED)
    c.setFont("Arial-Italic", 7.4)
    c.drawString(x, y, f"Kaynak: {source}")
    y -= 10
    height = 18 + len(code) * leading
    c.setFillColor(colors.HexColor("#F4F6F8"))
    c.setStrokeColor(INK)
    c.setLineWidth(0.55)
    c.rect(x, y - height, width, height, fill=1, stroke=1)
    c.setFillColor(NAVY)
    c.setFont("Consolas", font_size)
    text_y = y - 13
    for line in code:
        c.drawString(x + 8, text_y, line)
        text_y -= leading
    return y - height - 18


def page_one(c: canvas.Canvas) -> None:
    y = PAGE_H - 62
    c.setFillColor(BLUE)
    c.setFont("Arial-Bold", 10.5)
    c.drawString(LEFT, y, "RAMAZAN İNANÇ HAIR ART STUDIO")
    y -= 25
    c.setFillColor(NAVY)
    c.setFont("Arial-Bold", 18)
    c.drawString(LEFT, y, "7. Gün Gün Sonu Eki")
    y -= 24
    c.setFillColor(MUTED)
    c.setFont("Arial", 10.5)
    c.drawString(LEFT, y, "Ramazan İnanç Randevu Sistemi | 27.07.2026")
    y -= 34
    c.setStrokeColor(BLUE)
    c.setLineWidth(1.2)
    c.line(LEFT, y, PAGE_W - RIGHT, y)
    y -= 29
    intro = (
        "Bu ek; gelen iş teklifi doğrultusunda başlatılan Ramazan İnanç Hair Art Studio randevu sisteminin "
        "ürün araştırması, web-first teknik temeli, müşteri rezervasyon akışı, yönetici karar merkezi ve "
        "doğrulamalı bildirim altyapısı çalışmalarını belgelemektedir. Görseller çalışan uygulamadan alınmış; "
        "kaynak kod alıntıları kritik iş kurallarını temsil eden kısa bölümlerle sınırlandırılmıştır."
    )
    y = draw_paragraph(c, intro, LEFT, y, CONTENT_W, size=9.5, leading=14)
    y -= 12
    y = draw_table(
        c,
        LEFT,
        y,
        [128, 276, 107],
        ["Çalışma alanı", "Gerçekleştirilen yapı", "Doğrulama"],
        [
            ["Ürün ve mimari", "React, NestJS, PostgreSQL ve Prisma tabanlı web-first temel", "Build + API"],
            ["Müşteri akışı", "Hizmet, uzman, gerçek uygunluk, 5 dakikalık hold ve talep", "Tarayıcı akışı"],
            ["Zamanlama", "10.00-21.00 çalışma aralığı, süre toplamı ve [start, end) çakışma kuralı", "Edge-case testleri"],
            ["Yönetici merkezi", "Bekleyen talebi inceleme, onaylama, reddetme ve zamanın yeniden açılması", "Karar senaryoları"],
            ["Kapalı döngü", "SMS doğrulama, güvenli randevu erişimi, outbox ve 30 dk hatırlatma", "Unit + servis"],
        ],
        row_height=30,
        font_size=7.25,
    )
    y -= 16
    c.setFillColor(NAVY)
    c.setFont("Arial-Bold", 10.5)
    c.drawString(LEFT, y, "Çalışmanın teknik odağı")
    y -= 18
    y = draw_bullets(
        c,
        [
            "Müşterinin üyelik zorunluluğu olmadan hizmet, uzman ve gerçek uygun saat seçebilmesi.",
            "Onay bekleyen randevunun seçilen uzmanı bloke etmesi; ret kararında zamanın yeniden açılması.",
            "10:00-10:45 sonrasında 10:45 başlangıcına izin veren yarı açık [start, end) zaman modeli.",
            "Randevu erişiminin telefon doğrulaması ve imzalı, süreli oturumla sınırlandırılması.",
        ],
        LEFT,
        y,
        CONTENT_W,
        size=8.7,
        leading=11.4,
    )
    y -= 3
    c.setFillColor(NAVY)
    c.setFont("Arial-Bold", 10.5)
    c.drawString(LEFT, y, "Dönüşüm özeti")
    y -= 10
    draw_table(
        c,
        LEFT,
        y,
        [106, 185, 220],
        ["Alan", "Önceki risk", "Yeni yaklaşım"],
        [
            ["Randevu", "Telefon ve mesaj trafiği", "Gerçek uygunlukla self-servis talep"],
            ["Çakışma", "Aynı saate çift kayıt", "Servis + veritabanı koruması"],
            ["Karar", "Dağınık yönetici iletişimi", "Tek karar kuyruğu ve durum geçmişi"],
            ["Hatırlatma", "Manuel takip", "İdempotent SMS kuyruğu"],
        ],
        row_height=26,
        font_size=7.4,
    )
    footer(c, 1)


def page_two(c: canvas.Canvas) -> None:
    y = draw_header(
        c,
        "1",
        "Proje Geçişi ve Teknik Temel",
        "Gelen iş teklifi doğrultusunda Vitrinova Commerce Suite çalışmaları geçici olarak durduruldu ve Ramazan İnanç Hair Art Studio için tek markalı, başlangıçta tek şubeli fakat çok şubeye hazır bir randevu ürünü başlatıldı.",
    )
    y -= 8
    box_y = y - 104
    box_w = 142
    gap = 28
    draw_flow_box(c, LEFT, box_y, box_w, 82, "React Frontend", "Müşteri rezervasyonu ve yönetici arayüzü")
    draw_arrow(c, LEFT + box_w + 4, box_y + 41, LEFT + box_w + gap - 4)
    draw_flow_box(c, LEFT + box_w + gap, box_y, box_w, 82, "NestJS API", "İş kuralları, güvenlik ve transaction sınırı")
    draw_arrow(c, LEFT + 2 * box_w + gap + 4, box_y + 41, LEFT + 2 * box_w + 2 * gap - 4)
    draw_flow_box(
        c,
        LEFT + 2 * (box_w + gap),
        box_y,
        box_w,
        82,
        "PostgreSQL + Prisma",
        "Randevu, katalog ve çakışma bütünlüğü",
        fill=PALE_GREEN,
        accent=GREEN,
    )
    y = caption(c, "Şekil 1 - İlk gün kurulan web-first uygulama mimarisi.", box_y - 20)
    y -= 5
    c.setFillColor(NAVY)
    c.setFont("Arial-Bold", 12)
    c.drawString(LEFT, y, "Veri modelinin ana bileşenleri")
    y -= 20
    y = draw_table(
        c,
        LEFT,
        y,
        [117, 196, 198],
        ["Model", "Sorumluluk", "Korunan kural"],
        [
            ["Branch", "Şube, saat aralığı ve politika", "10.00-21.00, 10 dk erken geliş, onay zorunluluğu"],
            ["Service", "Hizmet süresi ve fiyatı", "Randevu toplamının sunucuda hesaplanması"],
            ["Professional", "Uzman ve hizmet eşleşmesi", "Yalnız hizmeti sunan aktif uzmanın seçilmesi"],
            ["Booking", "Hold, onay, ret ve zaman aralığı", "Aktif durumlarda uzman çakışmasının engellenmesi"],
            ["BookingItem", "Randevu anındaki hizmet snapshot'ı", "Sonraki fiyat değişikliğinin geçmişi bozmaması"],
        ],
        row_height=38,
        font_size=7.55,
    )
    y -= 18
    c.setFillColor(NAVY)
    c.setFont("Arial-Bold", 12)
    c.drawString(LEFT, y, "Kurulum kararları")
    y -= 20
    draw_bullets(
        c,
        [
            "Mobil uygulama kapsam dışı bırakılarak responsive web ürünü önceliklendirildi.",
            "Server state için ağır bir istemci kütüphanesi eklenmedi; API sözleşmeleri sade tutuldu.",
            "PostgreSQL btree_gist desteğiyle aynı uzmana ait aktif randevular veritabanı seviyesinde korundu.",
            "Demo katalog gerçek salon akışını gösterecek hizmet, uzman, süre ve fiyat verileriyle hazırlandı.",
        ],
        LEFT,
        y,
        CONTENT_W,
    )
    footer(c, 2)


def page_three(c: canvas.Canvas) -> None:
    y = draw_header(
        c,
        "2",
        "Müşteri Rezervasyon Deneyimi",
        "Müşterinin görevi ilk ekranda görünür tutuldu. Hizmet ve uzman seçimi; süre, fiyat ve canlı özetle birlikte dört adımlı, responsive bir rezervasyon akışına dönüştürüldü.",
    )
    y -= 5
    y = draw_image_contain(
        c,
        ASSETS / "public-expert-selection-22jul.png",
        LEFT,
        y,
        CONTENT_W,
        288,
    )
    y = caption(
        c,
        "Şekil 2 - Hizmet seçiminin ardından uzman seçimi ve canlı randevu özeti.",
        y - 11,
    )
    y -= 7
    c.setFillColor(NAVY)
    c.setFont("Arial-Bold", 11)
    c.drawString(LEFT, y, "Ürün kararları")
    y -= 18
    draw_bullets(
        c,
        [
            "Ramazan İnanç, Hikmet Çetin Aygördü, Ali Poyraz Yılmaz, Velihan Uluşan ve Mustafa Akpiliç sisteme eklendi.",
            "\"İlk müsait uzman\" seçeneği, mümkün olan en geniş saat aralığını sunan önerilen seçenek olarak konumlandırıldı.",
            "Seçili hizmetlerin toplam süresi ve fiyatı sağdaki canlı özet alanında anlık gösterildi.",
            "Kullanıcıdan telefon numarası yalnız son onay adımında istendi.",
        ],
        LEFT,
        y,
        CONTENT_W,
        size=8.9,
        leading=12,
    )
    footer(c, 3)


def page_four(c: canvas.Canvas) -> None:
    y = draw_header(
        c,
        "3",
        "Saat Ayırma ve Doğrulamalı Talep",
        "Seçilen saat beş dakika süreyle tutuldu. Müşteri bilgileri ve SMS doğrulama kodu tamamlanmadan randevu kesinleştirilmedi; gönderilen kayıt yönetici onayına bekleyen talep olarak aktarıldı.",
    )
    y -= 4
    y = draw_image_contain(
        c,
        ASSETS / "public-confirmation-22jul.png",
        LEFT,
        y,
        CONTENT_W,
        470,
    )
    y = caption(
        c,
        "Şekil 3 - Beş dakikalık hold, SMS doğrulaması ve canlı randevu özeti.",
        y - 11,
    )
    y -= 8
    y = draw_table(
        c,
        LEFT,
        y,
        [145, 214, 152],
        ["Kontrol", "Uygulanan davranış", "Müşteri sonucu"],
        [
            ["5 dakikalık hold", "Seçilen uzman ve saat geçici olarak bloke edilir.", "Form doldurulurken saat korunur."],
            ["Telefon doğrulama", "Kod hash'li challenge üzerinden doğrulanır.", "Randevu sahibinin telefonu kanıtlanır."],
            ["Yönetici onayı", "Talep PENDING_APPROVAL durumuna geçer.", "Kesinleşti izlenimi verilmez."],
            ["Hatırlatma politikası", "Onaylanan randevu için 30 dk önce hedeflenir.", "10 dk erken geliş bilgisi sunulur."],
        ],
        row_height=36,
        font_size=7.4,
    )
    footer(c, 4)


def page_five(c: canvas.Canvas) -> None:
    y = draw_header(
        c,
        "4",
        "Yönetici Komuta Merkezi",
        "Salon ekibi için bekleyen talepler, günlük zaman akışı ve randevu kararları tek merkezde toplandı. Onay bekleyen kayıt seçilen uzmanı bloke etmeye devam eder; ret kararıyla zaman tekrar kullanılabilir hâle gelir.",
    )
    y -= 5
    y = draw_image_contain(
        c,
        ASSETS / "admin-daily-flow.png",
        LEFT,
        y,
        CONTENT_W,
        170,
    )
    y = caption(
        c,
        "Şekil 4 - Günlük zaman çizelgesi ve randevu kartı görünümü.",
        y - 11,
    )
    y -= 8
    c.setFillColor(NAVY)
    c.setFont("Arial-Bold", 11.5)
    c.drawString(LEFT, y, "Karar akışı")
    y -= 20
    box_w = 105
    gap = 29
    box_y = y - 78
    draw_flow_box(c, LEFT, box_y, box_w, 62, "Talep geldi", "Saat bloklandı")
    draw_arrow(c, LEFT + box_w + 3, box_y + 31, LEFT + box_w + gap - 3)
    draw_flow_box(c, LEFT + box_w + gap, box_y, box_w, 62, "İnceleme", "Müşteri ve hizmet")
    draw_arrow(c, LEFT + 2 * box_w + gap + 3, box_y + 31, LEFT + 2 * box_w + 2 * gap - 3)
    draw_flow_box(c, LEFT + 2 * (box_w + gap), box_y, box_w, 62, "Onay", "Randevu kesinleşir", fill=PALE_GREEN, accent=GREEN)
    draw_arrow(c, LEFT + 3 * box_w + 2 * gap + 3, box_y + 31, LEFT + 3 * box_w + 3 * gap - 3)
    draw_flow_box(c, LEFT + 3 * (box_w + gap), box_y, box_w, 62, "Bildirim", "SMS kuyruğa alınır")
    y = box_y - 18
    y = draw_paragraph(
        c,
        "Ret yolunda aynı kayıt REJECTED durumuna geçirilir, gerekçe saklanır ve seçilen zaman başka bir müşteri için yeniden kullanılabilir olur.",
        LEFT,
        y,
        CONTENT_W,
        size=9,
        leading=13,
    )
    y -= 16
    y = draw_table(
        c,
        LEFT,
        y,
        [132, 189, 190],
        ["Yönetici işlemi", "Backend davranışı", "Takvim etkisi"],
        [
            ["Onayla", "Durum CONFIRMED olur ve onay zamanı kaydedilir.", "Zaman bloke kalır."],
            ["Reddet", "Durum REJECTED olur ve gerekçe kaydedilir.", "Zaman yeniden açılır."],
            ["İptal et", "İptal zamanı ve nedeni saklanır.", "Zaman yeniden açılır."],
            ["Günlük görünüm", "Uzmanlar ve randevular ortak eksende birleştirilir.", "Çakışmalar görünür olur."],
        ],
        row_height=35,
        font_size=7.45,
    )
    footer(c, 5)


def page_six(c: canvas.Canvas) -> None:
    y = draw_header(
        c,
        "5",
        "Kapalı Döngü Randevu ve Bildirim Altyapısı",
        "Müşterinin randevusuna yalnız referans kodu ve telefon doğrulamasıyla erişmesi; onay, ret, iptal ve hatırlatma mesajlarının kalıcı bir outbox kuyruğundan idempotent biçimde yürütülmesi sağlandı.",
    )
    y -= 15
    box_w = 88
    gap = 17
    box_y = y - 86
    nodes = [
        ("Referans + telefon", "Genel yanıt"),
        ("OTP challenge", "Hash + süre"),
        ("İmzalı oturum", "HttpOnly"),
        ("Randevu detayı", "Yetkili erişim"),
        ("SMS outbox", "Retry + idempotency"),
    ]
    for index, (title, subtitle) in enumerate(nodes):
        x = LEFT + index * (box_w + gap)
        draw_flow_box(
            c,
            x,
            box_y,
            box_w,
            66,
            title,
            subtitle,
            fill=PALE_GREEN if index in (1, 2, 4) else PALE_BLUE,
            accent=GREEN if index in (1, 2, 4) else BLUE,
        )
        if index < len(nodes) - 1:
            draw_arrow(c, x + box_w + 2, box_y + 33, x + box_w + gap - 2)
    y = caption(c, "Şekil 5 - Müşteri doğrulaması ve güvenli bildirim zinciri.", box_y - 18)
    y -= 10
    y = draw_table(
        c,
        LEFT,
        y,
        [125, 197, 189],
        ["Güvenlik katmanı", "Uygulama", "Risk azaltımı"],
        [
            ["Kod saklama", "OTP ve referans değerleri hash'li tutulur.", "Veritabanı sızıntısında düz kod açığa çıkmaz."],
            ["Deneme sınırı", "Süre, deneme sayısı, telefon ve IP kontrolleri uygulanır.", "Kaba kuvvet ve istek suistimali sınırlandırılır."],
            ["Oturum", "İmzalı, süreli, HttpOnly ve SameSite=Strict cookie kullanılır.", "Tarayıcı tarafı erişim ve CSRF riski azalır."],
            ["Outbox", "Her bildirim benzersiz idempotency key taşır.", "Aynı SMS'in yinelenmesi önlenir."],
            ["Worker", "Başarısız gönderimler sınırlı yeniden denemeye alınır.", "Geçici sağlayıcı hataları tolere edilir."],
        ],
        row_height=39,
        font_size=7.25,
    )
    y -= 18
    c.setFillColor(NAVY)
    c.setFont("Arial-Bold", 11.5)
    c.drawString(LEFT, y, "Olay türleri")
    y -= 20
    draw_bullets(
        c,
        [
            "Talep alındı, randevu onaylandı, randevu reddedildi, randevu iptal edildi.",
            "Onaylanan randevu için şube politikasına göre 30 dakika önce hatırlatma.",
            "Development ortamında ücretsiz SMS sağlayıcı; gerçek sağlayıcı bilgileri production aşamasına bırakıldı.",
        ],
        LEFT,
        y,
        CONTENT_W,
    )
    footer(c, 6)


def page_seven(c: canvas.Canvas) -> None:
    y = draw_header(
        c,
        "6",
        "Seçilmiş Uygulama Ayrıntıları",
        "Aşağıdaki kısa kaynak bölümleri, saat üretiminin gerçek hizmet süresine göre yapıldığını ve aktif randevu aralıklarının veritabanında yarı açık zaman modeliyle korunduğunu göstermektedir.",
    )
    y -= 3
    y = draw_code_box(
        c,
        "6.1 Süreye Sığan Aday Saatlerin Üretilmesi",
        "backend/src/availability/availability.engine.ts:20-83",
        [
            "20  buildCandidateStarts(",
            "21    openingMinute: number, closingMinute: number,",
            "22    durationMinutes: number, busyIntervals: BusyInterval[],",
            "23  ): number[] {",
            "26    return this.buildCandidateStartsForIntervals(",
            "27      [{ startMinute: openingMinute, endMinute: closingMinute }],",
            "28      durationMinutes, busyIntervals, 60,",
            "31    );",
            "34  buildCandidateStartsForIntervals(...): number[] {",
            "43    const candidates = new Set<number>();",
            "47    for (let minute = working.startMinute;",
            "48         minute < working.endMinute; minute += cadenceMinutes) {",
            "51      candidates.add(minute);",
            "54    for (const interval of busyIntervals) {",
            "62      candidates.add(interval.endMinute);",
            "69    const endMinute = startMinute + durationMinutes;",
            "72    workingIntervals.some(working =>",
            "74      startMinute >= working.startMinute &&",
            "75      endMinute <= working.endMinute)",
            "79    return !busyIntervals.some(busy =>",
            "81      startMinute < busy.endMinute && endMinute > busy.startMinute);",
        ],
        LEFT,
        y,
        CONTENT_W,
        font_size=6.65,
        leading=8.2,
    )
    y = draw_code_box(
        c,
        "6.2 Veritabanı Seviyesinde Çakışma Koruması",
        "backend/prisma/migrations/0001_initial_booking_core/migration.sql:184-193",
        [
            "184 CREATE EXTENSION IF NOT EXISTS \"btree_gist\";",
            "186 ALTER TABLE \"bookings\"",
            "187 ADD CONSTRAINT \"booking_no_overlap\"",
            "188 EXCLUDE USING GIST (",
            "189   \"professional_id\" WITH =,",
            "190   tsrange(\"start_at\", \"end_at\", '[)') WITH &&",
            "191 )",
            "192 WHERE (\"status\" IN",
            "193   ('HOLD', 'PENDING_APPROVAL', 'CONFIRMED'));",
        ],
        LEFT,
        y,
        CONTENT_W,
        font_size=7.1,
        leading=9.2,
    )
    y = draw_paragraph(
        c,
        "Sonuç: 10.00-10.45 randevusunun bitiş anı yeni başlangıç olabilir; ancak aynı uzmanda aktif iki zaman aralığı kesişemez. Uygulama kontrolü atlatılsa dahi veritabanı kuralı çift rezervasyonu reddeder.",
        LEFT,
        y,
        CONTENT_W,
        size=9,
        leading=13,
    )
    footer(c, 7)


def page_eight(c: canvas.Canvas) -> None:
    y = draw_header(
        c,
        "7",
        "Doğrulama Oturumu, Bildirim Kuyruğu ve Kontrol Sonucu",
        "Randevu erişimi için kısa ömürlü imzalı oturum, bildirimler için kalıcı kuyruk ve benzersiz idempotency anahtarı birlikte kullanıldı.",
    )
    y -= 2
    y = draw_code_box(
        c,
        "7.1 Süreli ve İmzalı Randevu Erişim Oturumu",
        "backend/src/booking-access/booking-access-session.service.ts:18-30, 67-75",
        [
            "18  create(bookingId: string, challengeId: string) {",
            "19    const issuedAt = Math.floor(Date.now() / 1000);",
            "20    const payload = {",
            "21      bookingId, challengeId, issuedAt,",
            "24      expiresAt: issuedAt + SESSION_DURATION_SECONDS,",
            "25      nonce: randomBytes(16).toString('base64url'),",
            "27    };",
            "28    const encoded = Buffer.from(JSON.stringify(payload))",
            "29      .toString('base64url');",
            "30    return { token: `${encoded}.${this.sign(encoded)}` };",
            "67  sessionCookie(token: string): string {",
            "70    'Path=/api/booking-access', 'HttpOnly',",
            "72    'SameSite=Strict',",
            "73    `Max-Age=${SESSION_DURATION_SECONDS}`,",
        ],
        LEFT,
        y,
        CONTENT_W,
        font_size=6.75,
        leading=8.4,
    )
    y = draw_code_box(
        c,
        "7.2 İdempotent Bildirim Kaydı",
        "backend/prisma/migrations/20260722170000_closed_loop_booking/migration.sql:39-69",
        [
            "39 CREATE TABLE \"booking_notifications\" (",
            "41   \"booking_id\" TEXT NOT NULL,",
            "43   \"event_type\" \"NotificationEventType\" NOT NULL,",
            "44   \"status\" \"NotificationStatus\" NOT NULL DEFAULT 'PENDING',",
            "45   \"scheduled_for\" TIMESTAMP(3) NOT NULL,",
            "46   \"available_at\" TIMESTAMP(3) NOT NULL,",
            "47   \"attempt_count\" INTEGER NOT NULL DEFAULT 0,",
            "48   \"max_attempts\" INTEGER NOT NULL DEFAULT 4,",
            "58   \"idempotency_key\" TEXT NOT NULL,",
            "68 CREATE UNIQUE INDEX \"booking_notifications_idempotency_key_key\"",
            "69   ON \"booking_notifications\"(\"idempotency_key\");",
        ],
        LEFT,
        y,
        CONTENT_W,
        font_size=6.65,
        leading=8.2,
    )
    c.setFillColor(NAVY)
    c.setFont("Arial-Bold", 11.5)
    c.drawString(LEFT, y, "Kontrol sonucu")
    y -= 19
    y = draw_bullets(
        c,
        [
            "Hizmet süresi, çalışma saati sınırı, bitiş anından yeni başlangıç ve araya sığmayan hizmet senaryoları doğrulandı.",
            "Hold oluşturma, yönetici onayı, ret sonrası zamanın açılması ve randevu iptal akışları kontrol edildi.",
            "Booking access oturumu, doğrulama kodu, bildirim şablonları, worker ve hatırlatma planlayıcısı için hedefli testler çalıştırıldı.",
            "Backend ve frontend üretim derlemeleri tamamlandı; çalışan uygulama masaüstü ve dar web görünümünde incelendi.",
            "Gerçek SMS anahtarı kullanılmadı; geliştirme sağlayıcısı ile güvenli entegrasyon sınırı korundu.",
        ],
        LEFT,
        y,
        CONTENT_W,
        size=8.75,
        leading=11.8,
    )
    y -= 5
    c.setFillColor(PALE_GREEN)
    c.setStrokeColor(GREEN)
    c.roundRect(LEFT, y - 58, CONTENT_W, 58, 6, fill=1, stroke=1)
    c.setFillColor(GREEN)
    c.setFont("Arial-Bold", 10.5)
    c.drawString(LEFT + 14, y - 20, "Gün sonu sonucu")
    draw_paragraph(
        c,
        "Ramazan İnanç Hair Art Studio için araştırmadan çalışan ürüne geçen; müşteri, yönetici, zamanlama ve bildirim katmanları birbirine bağlı ilk üretim temeli tamamlandı.",
        LEFT + 14,
        y - 37,
        CONTENT_W - 28,
        size=8.7,
        leading=11.2,
        color=INK,
    )
    footer(c, 8)


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("7. Gün Gün Sonu Eki - Ramazan İnanç Randevu Sistemi")
    c.setAuthor("Eray Ülgen")
    c.setSubject("27.07.2026 tarihli staj gün sonu teknik eki")
    page_one(c)
    c.showPage()
    page_two(c)
    c.showPage()
    page_three(c)
    c.showPage()
    page_four(c)
    c.showPage()
    page_five(c)
    c.showPage()
    page_six(c)
    c.showPage()
    page_seven(c)
    c.showPage()
    page_eight(c)
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()

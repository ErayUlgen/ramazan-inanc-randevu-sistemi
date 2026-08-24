from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


WORKSPACE = Path(r"C:\Users\erayu\Documents\Ramazanİnanç randevu sistemi")
OUTPUT = WORKSPACE / "output" / "pdf" / "10_Gun_Gun_Sonu_Eki.pdf"
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


def register_fonts() -> None:
    font_dir = Path(r"C:\Windows\Fonts")
    pdfmetrics.registerFont(TTFont("Arial", str(font_dir / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(font_dir / "arialbd.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Italic", str(font_dir / "ariali.ttf")))
    pdfmetrics.registerFont(TTFont("Consolas", str(font_dir / "consola.ttf")))
    pdfmetrics.registerFont(TTFont("Consolas-Bold", str(font_dir / "consolab.ttf")))


register_fonts()

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT = 19 * mm
RIGHT = 19 * mm
TOP = 18 * mm
BOTTOM = 18 * mm
CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="DocKicker",
        fontName="Arial-Bold",
        fontSize=10.2,
        leading=13,
        textColor=EMERALD,
        spaceAfter=4 * mm,
        uppercase=True,
    )
)
styles.add(
    ParagraphStyle(
        name="DocTitle",
        fontName="Arial-Bold",
        fontSize=24,
        leading=28,
        textColor=INK,
        spaceAfter=4 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="DocSubtitle",
        fontName="Arial",
        fontSize=12.5,
        leading=16,
        textColor=INK_SOFT,
        spaceAfter=10 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Section",
        fontName="Arial-Bold",
        fontSize=19,
        leading=23,
        textColor=EMERALD,
        spaceBefore=1 * mm,
        spaceAfter=5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Subsection",
        fontName="Arial-Bold",
        fontSize=13.2,
        leading=17,
        textColor=INK,
        spaceBefore=3 * mm,
        spaceAfter=2.5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyTR",
        fontName="Arial",
        fontSize=10.6,
        leading=15,
        textColor=INK,
        spaceAfter=3.5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="BodySmall",
        fontName="Arial",
        fontSize=9.2,
        leading=12.5,
        textColor=INK_SOFT,
    )
)
styles.add(
    ParagraphStyle(
        name="BulletTR",
        fontName="Arial",
        fontSize=10.2,
        leading=14,
        textColor=INK,
        leftIndent=5 * mm,
        firstLineIndent=-3.4 * mm,
        bulletIndent=1 * mm,
        spaceAfter=1.2 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="CaptionTR",
        fontName="Arial-Italic",
        fontSize=8.8,
        leading=11,
        textColor=MUTED,
        alignment=TA_CENTER,
        spaceBefore=1.5 * mm,
        spaceAfter=4 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHead",
        fontName="Arial-Bold",
        fontSize=8.4,
        leading=11,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCell",
        fontName="Arial",
        fontSize=8.2,
        leading=11,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="DocCode",
        fontName="Consolas",
        fontSize=6.3,
        leading=7.7,
        textColor=colors.HexColor("#17324D"),
        leftIndent=3 * mm,
        rightIndent=3 * mm,
        spaceBefore=2 * mm,
        spaceAfter=2 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="BigMetric",
        fontName="Arial-Bold",
        fontSize=20,
        leading=23,
        textColor=INK,
        alignment=TA_CENTER,
        spaceAfter=1.2 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="MetricLabel",
        fontName="Arial-Bold",
        fontSize=8.2,
        leading=10.5,
        textColor=EMERALD,
        alignment=TA_CENTER,
    )
)


def p(text: str, style: str = "BodyTR") -> Paragraph:
    return Paragraph(text, styles[style])


def bullet(text: str) -> Paragraph:
    return Paragraph(f"•&nbsp;&nbsp;{text}", styles["BulletTR"])


def table(data, widths, header=True, font_size=8.2) -> Table:
    normalized = []
    for row_idx, row in enumerate(data):
        normalized.append(
            [
                Paragraph(
                    str(cell),
                    ParagraphStyle(
                        f"table-{row_idx}-{col_idx}",
                        parent=styles["TableHead" if row_idx == 0 and header else "TableCell"],
                        fontSize=font_size,
                        leading=font_size + 2.8,
                    ),
                )
                for col_idx, cell in enumerate(row)
            ]
        )
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
    if not header:
        commands[-1] = ("BACKGROUND", (0, 0), (-1, -1), WHITE)
    result.setStyle(TableStyle(commands))
    return result


def screenshot(path: Path, max_height: float = 105 * mm) -> Image:
    img = Image(str(path))
    scale = min(CONTENT_WIDTH / img.imageWidth, max_height / img.imageHeight)
    img.drawWidth = img.imageWidth * scale
    img.drawHeight = img.imageHeight * scale
    img.hAlign = "CENTER"
    return img


def code_lines(path: Path, start: int, end: int) -> str:
    lines = path.read_text(encoding="utf-8").splitlines()
    selected = []
    for number in range(start, end + 1):
        if number <= len(lines):
            escaped = (
                lines[number - 1]
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace(" ", "&nbsp;")
            )
            selected.append(f"{number:>3}&nbsp;&nbsp;{escaped}")
    return "<br/>".join(selected)


def metric_card(value: str, label: str) -> Table:
    inner = [
        [Paragraph(value, styles["BigMetric"])],
        [Paragraph(label, styles["MetricLabel"])],
    ]
    result = Table(inner, colWidths=[CONTENT_WIDTH / 4 - 4 * mm], rowHeights=[10 * mm, 7 * mm])
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return result


def palette_table() -> Table:
    rows = [
        ("Studio Ink", "#121A23", INK, WHITE),
        ("Pearl Canvas", "#E7EAEC", PEARL, INK),
        ("Raised Surface", "#FFFFFF", WHITE, INK),
        ("Salon Emerald", "#087158", EMERALD, WHITE),
    ]
    cells = []
    for name, value, bg, fg in rows:
        cells.append(
            [
                Paragraph(name, ParagraphStyle("swatch-name", parent=styles["TableHead"], textColor=fg)),
                Paragraph(value, ParagraphStyle("swatch-val", parent=styles["TableCell"], textColor=fg)),
            ]
        )
    result = Table(cells, colWidths=[52 * mm, 28 * mm], rowHeights=[12 * mm] * len(cells))
    ts = [("BOX", (0, 0), (-1, -1), 0.7, BORDER), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]
    for idx, (_, _, bg, _) in enumerate(rows):
        ts.extend(
            [
                ("BACKGROUND", (0, idx), (-1, idx), bg),
                ("LEFTPADDING", (0, idx), (-1, idx), 8),
                ("RIGHTPADDING", (0, idx), (-1, idx), 8),
            ]
        )
    result.setStyle(TableStyle(ts))
    return result


def footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#CCD3D9"))
    canvas.setLineWidth(0.55)
    canvas.line(LEFT, 13 * mm, PAGE_WIDTH - RIGHT, 13 * mm)
    canvas.setFont("Arial", 8)
    canvas.setFillColor(MUTED)
    footer_text = (
        f"Eray Ülgen | Ramazan İnanç Hair Art Studio Randevu Sistemi | "
        f"10. Gün | {doc.page}"
    )
    canvas.drawCentredString(PAGE_WIDTH / 2, 8.2 * mm, footer_text)
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
        title="10. Gün Gün Sonu Eki",
        author="Eray Ülgen",
        subject="Ramazan İnanç Hair Art Studio — 10. Gün çalışma kanıtları",
    )

    story = []

    # Page 1 — cover and executive summary
    story.extend(
        [
            p("RAMAZAN İNANÇ HAIR ART STUDIO", "DocKicker"),
            p("10. Gün Gün Sonu Eki", "DocTitle"),
            p("Ramazan İnanç Randevu Sistemi | 30.07.2026", "DocSubtitle"),
            HRFlowable(width="100%", thickness=1.4, color=EMERALD, spaceAfter=8 * mm),
            p(
                "Bu ek; 27 Temmuz tarihindeki 10. gün çalışma kapsamı doğrultusunda, "
                "müşteri rezervasyonu, müşteri hesabı ve salon yönetim ekranlarının "
                "ortak bir tasarım sistemi altında yeniden düzenlenmesi çalışmalarını "
                "belgelemektedir. Ekran görselleri çalışan uygulamadan alınmış; kaynak "
                "alıntıları merkezi tasarım kararlarını gösteren kısa bölümlerle sınırlandırılmıştır."
            ),
            table(
                [
                    ["Çalışma alanı", "Gerçekleştirilen yapı", "Doğrulama"],
                    [
                        "Tasarım sistemi",
                        "Ink, Pearl ve Emerald renkleri; Archivo + Source Sans 3; 8 px ritim",
                        "Token ve kod kontrolü",
                    ],
                    [
                        "Müşteri rezervasyonu",
                        "Sinematik marka katmanı ile okunaklı, işlev odaklı rezervasyon yüzeyi",
                        "Tarayıcı + responsive QA",
                    ],
                    [
                        "Müşteri hesabı",
                        "Bekleyen, yaklaşan ve geçmiş kayıtların görev önceliğine göre ayrılması",
                        "Rota ve durum kontrolü",
                    ],
                    [
                        "Yönetici alanı",
                        "Giriş, navigasyon, filtre, özet ve operasyon yüzeylerinin ortak dile taşınması",
                        "Ekran + etkileşim QA",
                    ],
                    [
                        "Kalite güvencesi",
                        "Kontrast, focus, dokunma alanı, reduced-motion ve üretim derlemeleri",
                        "Lint + test + build",
                    ],
                ],
                [41 * mm, 91 * mm, 33 * mm],
            ),
            p("Çalışmanın teknik odağı", "Subsection"),
            bullet("Hazır dashboard ve yapay zekâ şablonu hissi veren aşırı kart, radius ve soluk yüzey tekrarlarının azaltılması."),
            bullet("Renk, tipografi, spacing, border, radius, gölge ve hareket değerlerinin merkezî tokenlar altında birleştirilmesi."),
            bullet("Public rezervasyon, müşteri hesabı ve admin alanlarının görevleri farklı olsa da aynı markanın ürünü gibi görünmesi."),
            bullet("Backend kuralları ve API sözleşmeleri değiştirilmeden görsel sistemin güvenli biçimde yenilenmesi."),
            p("Dönüşüm özeti", "Subsection"),
            table(
                [
                    ["Alan", "Önceki risk", "Yeni yaklaşım"],
                    ["Renk", "Dağınık mavi/pastel vurgular", "Ink ana aksiyon + kontrollü Emerald durum dili"],
                    ["Geometri", "Fazla yumuşak ve tekrarlayan kartlar", "6/8/10/12 px radius ve divider tabanlı gruplama"],
                    ["Tipografi", "Dağınık ağırlık ve ölçekler", "Archivo başlık + Source Sans 3 arayüz sistemi"],
                    ["Erişilebilirlik", "Zayıf kontrast ve belirsiz odak", "AA odaklı kontrast, focus ring ve 44 px hedefler"],
                ],
                [33 * mm, 61 * mm, 71 * mm],
            ),
            PageBreak(),
        ]
    )

    # Page 2 — scope and decisions
    story.extend(
        [
            p("1. Ortak Tasarım Temelinin Kurulması", "Section"),
            p(
                "Ürünün üç ana yüzü ayrı ayrı boyanmak yerine tek bir tasarım sisteminden "
                "türetildi. Müşteri tarafında marka hissi ve sakin karar verme; yönetici "
                "tarafında ise hız, yoğunluk ve operasyonel okunabilirlik önceliklendirildi."
            ),
            Table(
                [
                    [metric_card("3", "BİRLEŞTİRİLEN ÜRÜN ALANI"), metric_card("8 px", "TEMEL SPACING RİTMİ"), metric_card("4", "RADIUS KADEMESİ"), metric_card("AA", "KONTRAST HEDEFİ")],
                ],
                colWidths=[CONTENT_WIDTH / 4] * 4,
                hAlign="LEFT",
            ),
            Spacer(1, 6 * mm),
            p("Kapsam", "Subsection"),
            table(
                [
                    ["Ürün yüzü", "Tasarım amacı", "Uygulanan karar"],
                    [
                        "Public rezervasyon",
                        "Markaya ait, güven veren ve hızlı seçim",
                        "Gerçek salon videosu korunarak açık çalışma yüzeyi ve güçlü durum dili kuruldu.",
                    ],
                    [
                        "Müşteri hesabı",
                        "Randevuyu tek bakışta anlama ve yönetme",
                        "Bekleyen, yaklaşan ve geçmiş kayıtlar önceliklerine göre ayrıldı.",
                    ],
                    [
                        "Yönetici merkezi",
                        "Yoğun günlük operasyonu hatasız yönetme",
                        "Navigasyon, filtre, özet, takvim ve form geometrisi ortaklaştırıldı.",
                    ],
                ],
                [36 * mm, 57 * mm, 72 * mm],
            ),
            p("Kök tasarım kararları", "Subsection"),
            table(
                [
                    ["Teşhis", "Uygulanan karar", "Beklenen etkisi"],
                    ["Aşırı kart kullanımı", "Her bilgi ayrı kart yapılmadı; liste ve divider yapısı artırıldı.", "Daha doğal bilgi hiyerarşisi"],
                    ["Yumuşak ve belirsiz geometri", "Kontrol 6 px, kart 8 px, panel 10 px, sahne 12 px olarak sınırlandı.", "Daha keskin ve profesyonel görünüm"],
                    ["Düşük metin kontrastı", "Studio Ink ana metin; Emerald yalnız güven, başarı ve seçili yardımcı durumlarda kullanıldı.", "Daha yüksek okunabilirlik"],
                    ["Birden fazla ikon dili", "Arayüz ikonları tek aile altında toplandı.", "Tutarlı görsel ses"],
                    ["Kopuk responsive davranış", "320 px’e kadar yeniden sıralama, 44 px hedef ve yatay taşma kontrolü uygulandı.", "Mobilde gerçek ürün ergonomisi"],
                ],
                [41 * mm, 78 * mm, 46 * mm],
                font_size=7.8,
            ),
            p("Korunan sınırlar", "Subsection"),
            bullet("Rezervasyon uygunluk algoritması, yönetici onayı ve müşteri hesap güvenliği değiştirilmedi."),
            bullet("Gerçek salon videosu, resmî logo ve sinematik üst sahne ürünün marka katmanı olarak korundu."),
            bullet("Yeni ve ağır bir state yönetimi veya animasyon kütüphanesi eklenmedi."),
            bullet("Görsel düzenleme, çalışan API sözleşmelerini ve veritabanı davranışlarını genişletmedi."),
            PageBreak(),
        ]
    )

    # Page 3 — public booking
    story.extend(
        [
            p("2. Müşteri Rezervasyon Deneyimi", "Section"),
            p(
                "Gerçek salon videosunu kullanan sinematik üst bölüm korunurken rezervasyon görevi "
                "daha açık ve düzenli bir çalışma yüzeyine taşındı. Marka alanı ile işlev alanı "
                "arasındaki kontrast, kullanıcıyı yormadan rezervasyon adımlarına yönlendirecek biçimde ayarlandı."
            ),
            screenshot(ARTIFACTS / "public-booking.png", max_height=91 * mm),
            p("Şekil 1 — Sinematik marka sahnesi, adım göstergesi ve açık rezervasyon çalışma alanı.", "CaptionTR"),
            p("Uygulanan ürün kararları", "Subsection"),
            bullet("Video, resmî logo ve ana mesaj korundu; dekoratif landing-page unsurları rezervasyon işlevinin önüne geçirilmedi."),
            bullet("Ana işlem butonları Studio Ink arka plan ve beyaz metinle yüksek kontrastlı hâle getirildi."),
            bullet("Emerald rengi yalnız güven, başarı, seçili yardımcı durum ve odak göstergelerinde kontrollü kullanıldı."),
            bullet("Seçili hizmet, uzman, tarih ve saat yalnız renkle değil; border, işaret ve yüzey değişimiyle anlatıldı."),
            bullet("Desktop canlı özet ve mobil sticky aksiyon davranışı ortak tasarım tokenlarıyla uyumlu hâle getirildi."),
            p("Rezervasyon adımlarındaki görsel görevler", "Subsection"),
            table(
                [
                    ["Adım", "Birincil bilgi", "Görsel karar"],
                    ["Hizmet", "Ad, süre ve fiyat", "Kompakt editoryal hizmet düzeni"],
                    ["Uzman", "Ad ve uzmanlık", "Kontrollü avatar paleti ve net seçim halkası"],
                    ["Zaman", "Tarih ve gerçekten uygun saat", "Yüksek okunabilirlikli takvimsel düzen"],
                    ["Onay", "Kimlik, talep özeti ve güvence", "Yakın hata mesajı ve belirgin ana aksiyon"],
                ],
                [28 * mm, 61 * mm, 76 * mm],
            ),
            PageBreak(),
        ]
    )

    # Page 4 — customer account
    story.extend(
        [
            p("3. Müşteri Hesabının Yeniden Düzenlenmesi", "Section"),
            p(
                "Müşteri hesabı uzun ve tekdüze bir randevu dökümü olmaktan çıkarılarak işlem "
                "bekleyen, yaklaşan ve geçmiş randevuları görev önceliğine göre ayıran kişisel bir "
                "randevu merkezine dönüştürüldü."
            ),
            screenshot(ARTIFACTS / "customer-account.png", max_height=91 * mm),
            p("Şekil 2 — Müşteri hesabında yaklaşan, işlem bekleyen ve geçmiş randevu ayrımı.", "CaptionTR"),
            p("Bilgi mimarisi kararları", "Subsection"),
            bullet("Yaklaşan ziyaretler ana karar alanı olarak konumlandırıldı; onay bekleyen talepler ayrı ve sakin bir yüzeyde gösterildi."),
            bullet("Geçmiş kayıtlar sayfanın tamamını kaplayan sınırsız liste yerine kendi bölümü ve kayıt sayısıyla sunuldu."),
            bullet("Tarih, saat, hizmet, uzman, fiyat ve durum bilgileri tek bakışta taranabilecek sıraya yerleştirildi."),
            bullet("Randevu detayı, profil, iptal ve değişiklik ekranları aynı border, radius, tipografi ve buton sistemine bağlandı."),
            bullet("Boş, yükleniyor ve hata durumları büyük dekoratif kartlar yerine göreve yakın ve anlaşılır metinlerle ele alındı."),
            p("Müşteri hesabı durum dili", "Subsection"),
            table(
                [
                    ["Durum grubu", "Kullanıcı sorusu", "Arayüz yanıtı"],
                    ["İşlem bekleyen", "Salon karar verdi mi?", "Talep durumu ve sıradaki adım"],
                    ["Yaklaşan", "Ne zaman, kiminle ve hangi hizmet?", "Tarih, saat, uzman ve hizmet özeti"],
                    ["Geçmiş", "Önceki ziyaretimde ne olmuştu?", "Durum, referans ve kayıt detayı"],
                    ["Profil", "İletişim bilgilerim doğru mu?", "Sade form, gerçek label ve güvenli kaydetme"],
                ],
                [35 * mm, 61 * mm, 69 * mm],
            ),
            PageBreak(),
        ]
    )

    # Page 5 — admin area
    story.extend(
        [
            p("4. Yönetici Alanı ve Operasyon Hiyerarşisi", "Section"),
            p(
                "Yönetici tarafında marka kimliği korunurken dekoratif ağırlık azaltıldı. Giriş ekranı, "
                "navigasyon, filtreler, özet göstergeleri ve günlük takvim aynı operasyonel dil altında "
                "yeniden düzenlendi."
            ),
            screenshot(ARTIFACTS / "admin-login.png", max_height=79 * mm),
            p("Şekil 3 — Markalı ve asimetrik yönetici giriş deneyimi.", "CaptionTR"),
            p("Admin yüzeylerinde gerçekleştirilen düzenlemeler", "Subsection"),
            table(
                [
                    ["Alan", "Yeni düzen", "Operasyonel fayda"],
                    ["Giriş", "Marka ve kimlik alanı ile form yan yana kurgulandı.", "Yetkili alanının müşteri ürününden ayrılması"],
                    ["Navigasyon", "Aktif rota, bölüm sırası ve ikon dili ortaklaştırıldı.", "Sayfalar arasında daha hızlı yön bulma"],
                    ["Komut/filtre", "Tarih, uzman, durum, kaynak ve arama aynı ritimde toplandı.", "Günlük akışa daha hızlı odaklanma"],
                    ["Özet göstergeleri", "Bekleyen, günün akışı ve sıradaki randevu önceliklendirildi.", "Kritik durumları tek bakışta görme"],
                    ["Takvim", "Uzman kolonları, saat ekseni ve randevu kartları hizalandı.", "Çakışma ve boşluğu daha kolay okuma"],
                    ["Form ve drawer", "Label, kontrol yüksekliği, hata ve aksiyon sırası standardize edildi.", "Daha az giriş hatası"],
                ],
                [31 * mm, 75 * mm, 59 * mm],
                font_size=7.8,
            ),
            p("Yoğunluk ve responsive yaklaşımı", "Subsection"),
            bullet("Masaüstünde gerçek çalışma alanı genişliği kullanıldı; içerik gereksiz büyük kenar boşluklarına hapsedilmedi."),
            bullet("Tablet ve dar ekranlarda filtreler, özetler ve takvim küçültülmek yerine yeniden sıralandı."),
            bullet("Metinler 12 px altına düşürülmedi; uzun uzman ve hizmet adlarında kontrollü kırılma/ellipsis davranışı sağlandı."),
            bullet("Seçili, disabled, loading, empty ve error durumları ortak görsel sistemle eşleştirildi."),
            PageBreak(),
        ]
    )

    # Page 6 — visual system
    story.extend(
        [
            p("5. Tasarım Sistemi Kanıtı", "Section"),
            p(
                "Renk, tipografi, spacing, radius, gölge ve motion kararları ekranlara dağınık değerler "
                "olarak yazılmak yerine merkezî CSS değişkenleriyle tanımlandı."
            ),
            Table(
                [
                [
                        [p("Marka renkleri", "Subsection"), palette_table()],
                        [
                            p("Tipografi ve geometri", "Subsection"),
                            table(
                                [
                                    ["Rol", "Karar"],
                                    ["Başlık", "Archivo Variable"],
                                    ["Gövde/UI", "Source Sans 3 Variable"],
                                    ["Spacing", "8 / 16 / 24 / 32 / 48 / 64 / 96"],
                                    ["Radius", "6 / 8 / 10 / 12 px"],
                                    ["Motion", "160 / 260 / 300 ms"],
                                ],
                                [31 * mm, 49 * mm],
                                font_size=7.7,
                            ),
                        ],
                    ]
                ],
                colWidths=[85 * mm, 80 * mm],
                hAlign="LEFT",
            ),
            Spacer(1, 5 * mm),
            p("Renk teorisinin ürün görevlerine dağılımı", "Subsection"),
            table(
                [
                    ["Renk rolü", "Kullanım", "Kullanılmadığı alan"],
                    ["Studio Ink", "Ana aksiyon, güçlü metin, aktif kontrol", "Başarı veya uyarı anlamı"],
                    ["Pearl", "Çalışma zemini ve yüzey ayrımı", "Birincil metin"],
                    ["Raised Surface", "Form, liste, özet ve modal yüzeyleri", "Tam sayfa dekorasyon"],
                    ["Salon Emerald", "Güven, başarı, tamamlanan aşama, focus", "Bütün CTA’lar ve uzun metinler"],
                ],
                [35 * mm, 69 * mm, 61 * mm],
            ),
            p("Erişilebilirlik kararları", "Subsection"),
            bullet("Klavye odağı 3 px görünür halka ile belirtildi ve yalnız renk değişimine bırakılmadı."),
            bullet("627 px ve altında buton, bağlantı ve form kontrolleri için en az 44 px hedef yüksekliği tanımlandı."),
            bullet("Hareket azaltma tercihinde geçiş ve animasyon süreleri güvenli biçimde devre dışı bırakıldı."),
            bullet("Metin ve yüzey kontrastları, özellikle Emerald ve ikincil metin kullanımlarında WCAG AA hedefiyle sınırlandı."),
            p("Bileşen standardizasyonu", "Subsection"),
            table(
                [
                    ["Bileşen", "Ortak kural"],
                    ["Buton", "Koyu ana aksiyon, beyaz metin, 6 px radius, belirgin focus"],
                    ["Kart/panel", "8–10 px radius, görünür border, yalnız seviye anlatan gölge"],
                    ["İkon", "Tek aile, göreve göre sabit ağırlık ve tutarlı kutu ölçüsü"],
                    ["Form", "Gerçek label ilişkisi, en az 44 px dokunma alanı, yakın hata mesajı"],
                ],
                [42 * mm, 123 * mm],
            ),
            PageBreak(),
        ]
    )

    # Page 7 — code evidence
    token_path = WORKSPACE / "frontend" / "src" / "design-system" / "tokens.css"
    foundation_path = WORKSPACE / "frontend" / "src" / "design-system" / "foundation.css"
    story.extend(
        [
            p("6. Seçilmiş Uygulama Ayrıntıları", "Section"),
            p(
                "Aşağıdaki kısa kaynak bölümleri, tasarım kararlarının ekranlara dağınık değerler "
                "olarak değil, ortak token ve erişilebilirlik kuralları üzerinden uygulandığını göstermektedir."
            ),
            p("6.1 Merkezî renk ve yüzey sistemi", "Subsection"),
            p("Kaynak: frontend/src/design-system/tokens.css:4-20", "BodySmall"),
            Table(
                [[Paragraph(code_lines(token_path, 4, 20), styles["DocCode"])]],
                colWidths=[CONTENT_WIDTH],
                style=[
                    ("BACKGROUND", (0, 0), (-1, -1), SUBTLE),
                    ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ],
            ),
            p("6.2 Tipografi, spacing ve radius tokenları", "Subsection"),
            p("Kaynak: frontend/src/design-system/tokens.css:67-85", "BodySmall"),
            Table(
                [[Paragraph(code_lines(token_path, 67, 85), styles["DocCode"])]],
                colWidths=[CONTENT_WIDTH],
                style=[
                    ("BACKGROUND", (0, 0), (-1, -1), SUBTLE),
                    ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ],
            ),
            p("6.3 Focus, mobil hedef ve hareket azaltma", "Subsection"),
            p("Kaynak: frontend/src/design-system/foundation.css:22-29, 56-59, 62-74", "BodySmall"),
            Table(
                [
                    [
                        Paragraph(
                            code_lines(foundation_path, 22, 29)
                            + "<br/>"
                            + code_lines(foundation_path, 56, 59)
                            + "<br/>"
                            + code_lines(foundation_path, 62, 74),
                            styles["DocCode"],
                        )
                    ]
                ],
                colWidths=[CONTENT_WIDTH],
                style=[
                    ("BACKGROUND", (0, 0), (-1, -1), SUBTLE),
                    ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ],
            ),
            PageBreak(),
        ]
    )

    # Page 8 — QA and close
    story.extend(
        [
            p("7. Doğrulama ve Sonuç", "Section"),
            p(
                "Görsel sistem değişiklikleri, çalışan rezervasyon davranışlarını bozmadan uygulanmıştır. "
                "Kritik ekranlar gerçek tarayıcıda incelenmiş; kod kalitesi ve üretim derlemeleri hedefli "
                "kontrollerle doğrulanmıştır."
            ),
            p("Doğrulama sonuçları", "Subsection"),
            table(
                [
                    ["Kontrol", "Sonuç", "Kapsam"],
                    ["Frontend lint", "GEÇTİ", "Kod kalitesi ve kullanılmayan tanımlar"],
                    ["Frontend birim testleri", "8 dosya / 12 test GEÇTİ", "Rezervasyon ve arayüz davranışları"],
                    ["Frontend production build", "GEÇTİ", "TypeScript ve Vite üretim çıktısı"],
                    ["Backend testleri", "27 suite / 84 test GEÇTİ", "Mevcut randevu iş kuralları"],
                    ["Backend build", "GEÇTİ", "NestJS üretim derlemesi"],
                    ["Görsel QA", "GEÇTİ", "Public, müşteri hesabı ve admin giriş ekranları"],
                ],
                [49 * mm, 44 * mm, 72 * mm],
            ),
            p("Responsive ve kullanılabilirlik kontrol listesi", "Subsection"),
            table(
                [
                    ["Kontrol alanı", "Doğrulanan davranış"],
                    ["1440 / 1024 / 768 px", "İçerik hiyerarşisi, sticky alanlar, form ve takvim yerleşimi"],
                    ["390 / 320 px", "Yatay taşma, yeniden sıralama, metin kırılması ve sticky aksiyonlar"],
                    ["Klavye", "Focus halkası, bağlantı/button semantiği ve form sırası"],
                    ["Kontrast", "Ana ve ikincil metinler, seçili durum, güven ve hata yüzeyleri"],
                    ["Hareket", "Durum anlatan geçişler ve prefers-reduced-motion desteği"],
                    ["Boş/hata/yükleniyor", "Göreve yakın metin, erişilebilir bildirim ve tutarlı yüzey"],
                ],
                [52 * mm, 113 * mm],
            ),
            p("Sonuç", "Subsection"),
            p(
                "10. gün çalışmaları sonunda müşteri rezervasyonu, müşteri hesabı ve yönetici alanı; "
                "birbirinin kopyası olmayan fakat aynı renk, tipografi, spacing, geometri ve etkileşim "
                "dilini paylaşan üç ürün yüzüne dönüştürülmüştür. Sinematik marka katmanı korunmuş, "
                "işlev yüzeyleri daha keskin ve okunabilir hâle getirilmiş; hazır AI/dashboard şablonu "
                "hissi oluşturan tekrarlar azaltılmıştır."
            ),
            p(
                "Backend kuralları ve API sözleşmeleri korunarak yalnızca arayüz mimarisi ve görsel "
                "sistem yeniden ele alınmış; böylece sonraki geliştirmelerin ortak bir tasarım temeli "
                "üzerinden sürdürülebilmesi sağlanmıştır."
            ),
            p(
                "<b>Teslim sonucu:</b> Markaya özgü ortak tasarım sistemi üç ana ürün alanına "
                "uygulanmış; kod, tarayıcı, responsive görünüm ve üretim derlemeleriyle doğrulanmıştır."
            ),
        ]
    )

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()

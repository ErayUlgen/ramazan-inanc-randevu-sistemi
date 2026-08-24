# Codex Araç Envanteri — 24.08.2026

Bu belge Ramazan İnanç Hair Art Studio projesinin son dört günlük cilalama
çalışmalarında kullanılabilecek yerel Codex yeteneklerinin ölçülmüş kaydıdır.
`config.toml`, diskteki skill dosyaları, eklenti manifestleri ve bu oturumda
gerçekten çağrılabilen araçlar çapraz kontrol edilmiştir.

## Ölçülmüş özet

- Diskteki skill dosyası: **114**
- Benzersiz skill adı: **102**
- Bu oturumda çağrılabilir araç ucu: **527**
- Yapılandırılmış MCP sunucusu: **16**
- Canlı çağrıyla doğrulanan MCP: **12**
- Yapılandırmada etkin eklenti: **12**
- Önbellekte manifesti doğrulanan eklenti paketi: **13**
- 21st ücretsiz `get_component` hakkı: **2/2**
- Higgsfield: **free plan, 8 kredi**; üretim yapılmadı
- Firecrawl: skill dosyaları ve CLI `1.19.6` kurulu; hesap doğrulandı ve gerçek scrape çağrısı geçti
- TypeScript LSP: `typescript-language-server 6.0.0` ve `TypeScript 7.0.2` kurulu
- Sonradan eklenen Codex eklentileri: Google Drive `0.1.11`, Codex Security `0.1.21`, GitHub `0.1.11-5f7cd798dc99` ve Cloudflare `0.1.2`

## MCP sunucuları

| MCP | Bu oturum | Ne sağlar | Kanıt / not |
|---|---|---|---|
| `node_repl` | Canlı | Kalıcı JavaScript çalışma alanı, tarayıcı orkestrasyonu | Basit JS çağrısı geçti |
| `motion` | Canlı | Motion dokümanı, örnek ve easing araştırması | Doküman araması geçti; iki Motion+ eşleşmesinin kaynak kodu ücretsiz sunulmadı |
| `github` | Canlı | Repo, issue, PR, review, dosya ve branch işlemleri | `ErayUlgen` hesabı doğrulandı |
| `21st` | Canlı | Tasarım ilhamı, bileşen arama ve sınırlı kod alma | Free tier, bugün 2/2 kod alma hakkı |
| `chrome-devtools` | Canlı | Ekran görüntüsü, konsol, ağ, erişilebilirlik, Lighthouse, performans | Sayfa listesi çağrısı geçti |
| `context7` | Canlı | Güncel framework ve kütüphane dokümanı | React resmî dokümanı çözüldü |
| `playwright` | Canlı | Gerçek tarayıcıda uçtan uca test | Tarayıcı sekme çağrısı geçti |
| `shadcn` | Canlı | Registry bileşeni, örnek ve denetim listesi | Araç yanıt verdi; proje ayarı `frontend/components.json` içindedir |
| `magicui` | Canlı | Animasyonlu React/Tailwind bileşen kataloğu | 247 kayıt görüldü |
| `iconify` | Canlı | Açık kaynak SVG ikon arama ve alma | Takvim ikon araması geçti |
| `stock-images` | Canlı | Pexels görsel arama ve indirme | Arama geçti; projeye stok görsel eklenmedi |
| `sentry` | Canlı | Canlı hata ve olay inceleme | `eray-ww` organizasyonu görüldü |
| `supabase` | Yapılandırılmış, bu oturumda araç yok | Supabase veritabanı, RLS ve edge işlemleri | Bu proje kendi PostgreSQL'ini kullandığı için bilinçli olarak kullanılmaz |
| `vercel` | Yapılandırılmış, bu oturumda araç yok | Deploy ve build kayıtları | İhtiyaçta yeniden başlatma/bağlantı kontrolü gerekir |
| `cloudflare` | MCP kaydı var; resmî Codex eklentisi canlı | DNS, CDN, Workers ve alan adı yönetimi | `cloudflare_api` dokümantasyon çağrısı başarıyla sonuçlandı |
| `higgsfield` | MCP ayarı var; doğru yol CLI / Codex app | Görsel, video, ses ve 3B üretim | Hesap açık, 8 kredi; her üretimden önce kullanıcı onayı zorunlu |

`codex mcp list` bu masaüstü oturumunda Windows tarafından erişim engeliyle
çalıştırılamadı. Canlı durum bu nedenle doğrudan araç çağrılarıyla ölçüldü.

## Bu oturumdaki 527 araç ucundan seçili gruplar

| Grup | Adet |
|---|---:|
| Codex masaüstü görev/otomasyon araçları | 16 |
| Çekirdek dosya, terminal, plan, web ve hedef araçları | 12 |
| ImageGen | 1 |
| 21st | 35 |
| Chrome DevTools | 29 |
| Codex app bağlantıları | Kurulan eklentilerle genişledi |
| Context7 | 2 |
| GitHub | 136 |
| Google Drive | 45 |
| Codex Security | 20 |
| Cloudflare | 3 |
| Iconify | 4 |
| Magic UI | 3 |
| Motion | 2 |
| Node REPL | 3 |
| Playwright | 24 |
| Sentry | 9 |
| Shadcn | 7 |
| Stock Images | 2 |
| Plugin yönetimi | 1 |
| Yerleşik web erişimi | 1 |

## Yapılandırmada etkin eklentiler

1. `github@openai-curated`
2. `documents@openai-primary-runtime`
3. `spreadsheets@openai-primary-runtime`
4. `presentations@openai-primary-runtime`
5. `pdf@openai-primary-runtime`
6. `visualize@openai-bundled`
7. `template-creator@openai-primary-runtime`
8. `browser@openai-bundled`
9. `computer-use@openai-bundled`
10. `chrome@openai-bundled`
11. `codex-app-tools@openai-bundled`
12. `sites@openai-bundled`

Önbellekte ayrıca Higgsfield uygulama paketi, OpenAI artifact şablonları ve
plugin-management paketi vardır. Önbellekte bulunmak tek başına etkin bağlantı
kanıtı değildir.

## 102 benzersiz skill

### Tasarım, marka ve arayüz

- `brand`
- `brandkit`
- `banner-design`
- `design`
- `design-system`
- `design-taste-frontend`
- `design-taste-frontend-v1`
- `frontend-design`
- `gpt-taste`
- `high-end-visual-design`
- `image-to-code`
- `imagegen`
- `imagegen-frontend-mobile`
- `imagegen-frontend-web`
- `impeccable`
- `industrial-brutalist-ui`
- `minimalist-ui`
- `prototype`
- `redesign-existing-projects`
- `stitch-design-taste`
- `superdesign`
- `ui-styling`
- `ui-ux-pro-max`

### Hareket ve etkileşim cilası

- `animate`
- `animation-vocabulary`
- `apple-design`
- `ask-sonner`
- `awwwards-animations`
- `emil-design-eng`
- `find-animation-opportunities`
- `improve-animations`
- `motion`
- `review-animations`

### Web araştırma ve içerik çıkarma

- `firecrawl`
- `firecrawl-agent`
- `firecrawl-crawl`
- `firecrawl-download`
- `firecrawl-interact`
- `firecrawl-map`
- `firecrawl-monitor`
- `firecrawl-parse`
- `firecrawl-scrape`
- `firecrawl-search`

Firecrawl ailesi ve resmî CLI `1.19.6` kuruludur. Tarayıcı hesap doğrulaması
tamamlanmış, `https://firecrawl.dev` üzerinde gerçek scrape çağrısı çalışmış ve
çıktı `.firecrawl/install-check.md` dosyasına alınmıştır. `.firecrawl/` Git
tarafından izlenmez. Yerleşik web araması bundan bağımsızdır.

### Higgsfield üretim ailesi

- `higgsfield-brandkit`
- `higgsfield-game-generation`
- `higgsfield-generate`
- `higgsfield-marketplace-cards`
- `higgsfield-product-photoshoot`
- `higgsfield-soul-id`
- `higgsfield-video-explainer`
- `higgsfield-websites`
- `higgsfield-youtube-thumbnail`

Bu dokuz skill kredi harcar; üretimden önce maliyet ve kullanıcı onayı gerekir.

### Kod, inceleme, seçim ve otomasyon

- `claude-automation-recommender`
- `full-output-enforcement`
- `openai-docs`
- `pick-ui-library`
- `plugin-creator`
- `plugin-management`
- `review-agent`
- `skill-creator`
- `skill-installer`

### Tarayıcı, masaüstü ve GitHub

- `browser`
- `computer-use`
- `control-chrome`
- `control-in-app-browser`
- `gh-address-comments`
- `gh-fix-ci`
- `github`
- `yeet`

### Doküman, sunum, tablo, PDF ve görselleştirme

- `documents`
- `excel-live-control`
- `pdf`
- `Presentations`
- `slides`
- `Spreadsheets`
- `template-creator`
- `visualize`
- `sites-building`
- `sites-hosting`

### Video anlatım

- `faceless-channel`
- `narrator`
- `subtitles`

### OpenAI artifact şablonları

- `artifact-template-analytics-dashboard`
- `artifact-template-business-review`
- `artifact-template-design-report`
- `artifact-template-experiment-analysis`
- `artifact-template-financial-budget`
- `artifact-template-investment-committee-memo`
- `artifact-template-legal-memorandum`
- `artifact-template-market-trends-report`
- `artifact-template-minimal-letterhead`
- `artifact-template-operating-calendar`
- `artifact-template-operating-review`
- `artifact-template-project-kickoff`
- `artifact-template-project-tracker`
- `artifact-template-sales-pipeline`
- `artifact-template-simple-dark-mode`
- `artifact-template-simple-light-mode`
- `artifact-template-strategy-memorandum`
- `artifact-template-system-design`
- `artifact-template-team-alignment`
- `artifact-template-three-statement-forecast`

## Ramazan İnanç frontend'inde zaten kurulu yapı

- React 19.2 ve React DOM
- Vite 8.1
- TypeScript 6
- Tailwind CSS 4.3
- Framer Motion 12
- Radix UI
- React Router 7
- Phosphor Icons
- Sonner bildirimleri
- Source Sans 3 ve Archivo variable fontları
- `date-fns`, `qrcode.react`, `next-themes`
- `class-variance-authority`, `clsx`, `tailwind-merge`
- Vitest, Testing Library, Playwright ve oxlint

`frontend/components.json` mevcut; stil `radix-nova`, temel renk `neutral`, CSS
değişkenleri açık ve ikon tercihi `lucide` olarak yazılıdır. Buna karşılık
paketlerde Phosphor Icons da vardır; ikon ailesi cilalama başlamadan önce tek
karara bağlanmalıdır.

## Son dört gün için önerilen araç zinciri

1. **Görsel ve kullanılabilirlik denetimi:** `ui-ux-pro-max` →
   `redesign-existing-projects` → `impeccable` → Chrome DevTools.
2. **Bileşen ve tasarım sistemi:** `frontend-design` + `design-system`;
   gerekiyorsa Shadcn, Magic UI ve 21st araması; ikon için Iconify.
3. **Hareket cilası:** `emil-design-eng` → Motion dokümanı → `animate`;
   ardından `review-animations`. Her basılabilir öğede active geri bildirimi,
   hover cihaz kapısı ve reduced-motion karşılığı denetlenir.
4. **Son kalite kapısı:** Playwright kullanıcı akışları, Chrome konsol/ağ,
   masaüstü ve mobil ekran görüntüleri, erişilebilirlik, Lighthouse, frontend ve
   backend test/build, ardından Sentry hazırlık kontrolü.

Supabase bu projenin mimarisine uymaz; kendi PostgreSQL yapısı korunur. Sites,
Vercel, Cloudflare veya Higgsfield ancak yayın ya da özgün görsel kapsamı açılırsa
kullanılır. Para/kredi harcayan adımlar ayrıca onaya tabidir.

import type { BranchCatalog } from "../types";

const allServiceIds = [
  "anatomik-sac-kesimi",
  "sac-sakal-tasarimi",
  "sakal-tasarimi",
  "sac-yikama-sekillendirme",
  "kadin-anatomik-sac-kesimi",
  "fon",
  "kas-tasarimi",
];

export const demoCatalog: BranchCatalog = {
  id: "demo-branch",
  slug: "hair-art-ramazan-inanc-denizli",
  name: "Ramazan İnanç Hair Art Studio",
  city: "Denizli",
  district: "Merkezefendi",
  timezone: "Europe/Istanbul",
  openingTime: "10:00",
  closingTime: "21:00",
  arrivalLeadMinutes: 15,
  reminderLeadMinutes: 120,
  requiresBookingApproval: true,
  services: [
    {
      id: "anatomik-sac-kesimi",
      slug: "anatomik-sac-kesimi",
      category: "Erkek Hizmetleri",
      name: "Anatomik Saç Kesimi",
      description:
        "Yüz formu, saç yapısı ve günlük kullanımına göre kişiselleştirilen imza kesim.",
      durationMinutes: 60,
      priceKurus: 90000,
    },
    {
      id: "sac-sakal-tasarimi",
      slug: "sac-sakal-tasarimi",
      category: "Erkek Hizmetleri",
      name: "Saç + Sakal Tasarımı",
      description:
        "Saç ve sakalın birlikte ele alındığı dengeli ve bütünsel görünüm tasarımı.",
      durationMinutes: 75,
      priceKurus: 125000,
    },
    {
      id: "sakal-tasarimi",
      slug: "sakal-tasarimi",
      category: "Erkek Hizmetleri",
      name: "Sakal Tasarımı",
      description: "Yüz hatlarına uygun form, sıcak havlu ve detaylı bitiriş.",
      durationMinutes: 30,
      priceKurus: 50000,
    },
    {
      id: "sac-yikama-sekillendirme",
      slug: "sac-yikama-sekillendirme",
      category: "Erkek Hizmetleri",
      name: "Saç Yıkama & Şekillendirme",
      description:
        "Saç tipine uygun ürünlerle bakım, yıkama ve profesyonel şekillendirme.",
      durationMinutes: 30,
      priceKurus: 45000,
    },
    {
      id: "kadin-anatomik-sac-kesimi",
      slug: "kadin-anatomik-sac-kesimi",
      category: "Kadın Hizmetleri",
      name: "Kadın Anatomik Saç Kesimi",
      description:
        "Yüz anatomisi ve saç yoğunluğuna göre danışmanlık eşliğinde kesim.",
      durationMinutes: 75,
      priceKurus: 150000,
    },
    {
      id: "fon",
      slug: "fon",
      category: "Kadın Hizmetleri",
      name: "Fön",
      description:
        "Saç yapısına uygun ürün ve teknikle profesyonel, kalıcı şekillendirme.",
      durationMinutes: 45,
      priceKurus: 65000,
    },
    {
      id: "kas-tasarimi",
      slug: "kas-tasarimi",
      category: "Kadın Hizmetleri",
      name: "Kaş Tasarımı",
      description: "Yüz ifadesini destekleyen doğal ve dengeli kaş formu.",
      durationMinutes: 15,
      priceKurus: 35000,
    },
  ],
  professionals: [
    {
      id: "ramazan-inanc",
      slug: "ramazan-inanc",
      name: "Ramazan İnanç",
      title: "Kurucu · Anatomik Saç Kesim Uzmanı",
      serviceIds: allServiceIds,
    },
    {
      id: "hikmet-cetin-aygordu",
      slug: "hikmet-cetin-aygordu",
      name: "Hikmet Çetin Aygördü",
      title: "Anatomik Saç Kesim Uzmanı",
      serviceIds: allServiceIds,
    },
    {
      id: "ali-poyraz-yilmaz",
      slug: "ali-poyraz-yilmaz",
      name: "Ali Poyraz Yılmaz",
      title: "Anatomik Saç Kesim Uzmanı",
      serviceIds: allServiceIds,
    },
    {
      id: "velihan-uluşan",
      slug: "velihan-ulusan",
      name: "Velihan Uluşan",
      title: "Anatomik Saç Kesim Uzmanı",
      serviceIds: allServiceIds,
    },
    {
      id: "mustafa-akpilic",
      slug: "mustafa-akpilic",
      name: "Mustafa Akpiliç",
      title: "Anatomik Saç Kesim Uzmanı",
      serviceIds: allServiceIds,
    },
  ],
};

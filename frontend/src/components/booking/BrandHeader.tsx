import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { MapPinIcon } from "@phosphor-icons/react/dist/csr/MapPin";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { motionDurations, motionEase } from "../../design-system/motion";
import { StudioWordmark } from "../brand/StudioWordmark";
import type { DataMode } from "./booking.types";

const studioAddress =
  "Yenişafak, 1037 Sk. A Blok No.4 AB, 20300 Merkezefendi/Denizli";
const studioMapsUrl =
  "https://www.google.com/maps/place//data=!4m2!3m1!1s0x14c741125ac99709:0xad2bff10cae2c3ed?sa=X&ved=1t:8290&ictx=111";

export function BrandHeader({
  dataMode,
  href = "#booking",
  mapsUrl = studioMapsUrl,
}: {
  dataMode: DataMode;
  href?: string;
  mapsUrl?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      className="brand-header"
      initial={reduceMotion ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDurations.page, ease: motionEase }}
    >
      <motion.a
        className="wordmark"
        href={href}
        // aria-label bilinçli olarak yok: bağlantının erişilebilir adı görünen
        // metinden gelir. Sabit bir aria-label yazıldığında, marka adı CSS ile
        // büyük harfe çevrildiği için "HAİR" ile "Hair" Türkçe nokta'lı İ
        // yüzünden eşleşmiyor ve görünen etiket ile erişilebilir ad ayrışıyordu.
        whileHover={reduceMotion ? undefined : { x: 2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      >
        <StudioWordmark />
      </motion.a>

      <div className="brand-header__meta">
        <motion.a
          className="brand-header__location"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={studioAddress}
          aria-label={`Ramazan İnanç Hair Art Studio konumunu Google Maps'te aç: ${studioAddress}`}
          initial={reduceMotion ? false : { opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          whileHover={reduceMotion ? undefined : { y: -1 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        >
          <MapPinIcon size={17} weight="bold" />
          <span>Denizli</span>
        </motion.a>
        <motion.span
          initial={reduceMotion ? false : { opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
        >
          <ClockIcon size={17} weight="bold" /> 10.00–21.00
        </motion.span>
        <motion.span
          className="brand-header__secure"
          initial={reduceMotion ? false : { opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <ShieldCheckIcon size={17} weight="duotone" /> Güvenli randevu
        </motion.span>
        {dataMode === "preview" && (
          <motion.span
            className="preview-badge"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            Tasarım önizlemesi
          </motion.span>
        )}
        <Link className="brand-header__account" to="/hesabim/profil">
          <UserCircleIcon size={20} weight="duotone" />
          <span>Profilim</span>
        </Link>
      </div>
    </motion.header>
  );
}

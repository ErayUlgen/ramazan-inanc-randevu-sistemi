import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { BuildingsIcon } from "@phosphor-icons/react/dist/csr/Buildings";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { getAdminSession } from "../../admin/api/adminApi";
import { motionDurations, motionEase } from "../../design-system/motion";

export function StudioDock() {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then((result) => active && setVisible(result.authenticated))
      .catch(() => active && setVisible(false));
    return () => {
      active = false;
    };
  }, []);

  if (!visible) return null;
  return (
    <motion.a
      className="studio-dock"
      href="/admin"
      aria-label="Studio'ya dön"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDurations.card, ease: motionEase }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
    >
      <BuildingsIcon size={20} weight="duotone" />
      <span>
        <small>Yönetici oturumu açık</small>
        <strong>Studio'ya dön</strong>
      </span>
      <ArrowRightIcon size={18} weight="bold" />
    </motion.a>
  );
}

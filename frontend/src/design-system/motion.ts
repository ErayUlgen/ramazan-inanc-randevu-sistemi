import type { Transition, Variants } from "framer-motion";

export const motionEase = [0.22, 1, 0.36, 1] as const;

export const motionDurations = {
  micro: 0.16,
  selection: 0.22,
  card: 0.26,
  page: 0.3,
} as const;

export const springSoft: Transition = {
  type: "spring",
  stiffness: 360,
  damping: 32,
  mass: 0.8,
};

export const stepVariants: Variants = {
  hidden: { opacity: 0, x: 18 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: motionDurations.page,
      ease: motionEase,
      staggerChildren: 0.035,
    },
  },
  exit: {
    opacity: 0,
    x: -12,
    transition: { duration: motionDurations.micro, ease: motionEase },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDurations.card, ease: motionEase },
  },
};

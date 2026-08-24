import { motion, useReducedMotion } from "framer-motion";
import { motionDurations, motionEase } from "../../design-system/motion";

export function ReservedTimeMark() {
  return (
    <svg className="reserved-time-mark" viewBox="0 0 44 44" aria-hidden="true">
      <path d="M9 30c4-13 12-20 25-21M13 35c4-9 11-15 21-17" />
      <path d="M9 9v10h10" />
      <circle cx="34" cy="9" r="3" />
    </svg>
  );
}

export function ApprovalOrbit() {
  const reduceMotion = useReducedMotion();
  return (
    <span className="approval-orbit" aria-hidden="true">
      <svg viewBox="0 0 84 84">
        <circle className="approval-orbit__guide" cx="42" cy="42" r="30" />
        <motion.path
          className="approval-orbit__arc"
          d="M42 12a30 30 0 0 1 28 19"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          className="approval-orbit__line"
          d="M25 47c10-1 20-7 29-18M31 56c9-4 16-11 20-20"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: motionDurations.page + 0.25,
            ease: motionEase,
          }}
        />
      </svg>
    </span>
  );
}

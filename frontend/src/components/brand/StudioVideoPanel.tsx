import { useEffect, useRef } from "react";

export function StudioVideoPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    void video.play().catch(() => undefined);

    const resumeWhenVisible = () => {
      if (document.visibilityState === "visible" && video.paused) {
        void video.play().catch(() => undefined);
      }
    };

    document.addEventListener("visibilitychange", resumeWhenVisible);
    return () =>
      document.removeEventListener("visibilitychange", resumeWhenVisible);
  }, []);

  return (
    <div className="studio-stage-video">
      <video
        ref={videoRef}
        className="studio-stage-video__media"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/media/ramazan-inanc-studio-poster.jpg"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/media/ramazan-inanc-studio.mp4" type="video/mp4" />
      </video>
      <span className="studio-stage-video__veil" aria-hidden="true" />
    </div>
  );
}

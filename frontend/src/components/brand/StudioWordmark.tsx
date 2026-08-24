const OFFICIAL_LOGO_URL = "/brand/ramazan-inanc-logo.png";

export function StudioWordmark() {
  return (
    <span className="studio-wordmark">
      <span className="studio-wordmark__mark" aria-hidden="true">
        <img
          className="studio-wordmark__official-logo"
          src={OFFICIAL_LOGO_URL}
          alt=""
          decoding="async"
          draggable="false"
        />
      </span>
      <span className="studio-wordmark__copy">
        <strong>Ramazan İnanç</strong>
        <small>Hair Art Studio</small>
      </span>
    </span>
  );
}

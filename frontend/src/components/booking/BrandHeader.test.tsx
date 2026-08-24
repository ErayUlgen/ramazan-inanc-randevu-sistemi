import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BrandHeader } from "./BrandHeader";

const mapsUrl =
  "https://www.google.com/maps/place//data=!4m2!3m1!1s0x14c741125ac99709:0xad2bff10cae2c3ed?sa=X&ved=1t:8290&ictx=111";

describe("BrandHeader", () => {
  it("Denizli konumunu rezervasyonu kaybetmeden Google Maps üzerinde açar", () => {
    render(
      <MemoryRouter>
        <BrandHeader dataMode="live" mapsUrl={mapsUrl} />
      </MemoryRouter>,
    );

    const locationLink = screen.getByRole("link", {
      name: /Ramazan İnanç Hair Art Studio konumunu Google Maps'te aç/i,
    });

    expect(locationLink).toHaveAttribute("href", mapsUrl);
    expect(locationLink).toHaveAttribute("target", "_blank");
    expect(locationLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(locationLink).toHaveAttribute(
      "title",
      "Yenişafak, 1037 Sk. A Blok No.4 AB, 20300 Merkezefendi/Denizli",
    );

    expect(screen.getByRole("link", { name: "Profilim" })).toHaveAttribute(
      "href",
      "/hesabim/profil",
    );
  });
});

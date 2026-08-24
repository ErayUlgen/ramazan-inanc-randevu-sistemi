import { render, screen } from "@testing-library/react";
import { CalendarPlusIcon as CalendarPlus } from "@phosphor-icons/react/dist/csr/CalendarPlus";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("keeps the icon and label in one accessible inline-flex control", () => {
    render(
      <Button>
        <CalendarPlus aria-hidden="true" />
        <span>Yeni randevu</span>
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Yeni randevu" });
    expect(button).toHaveClass("inline-flex", "items-center", "gap-2");
    expect(button.querySelector("svg")?.nextElementSibling).toHaveTextContent(
      "Yeni randevu",
    );
  });
});

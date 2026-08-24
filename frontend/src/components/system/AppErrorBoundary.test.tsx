import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

function BrokenView(): never {
  throw new Error("render failed");
}

describe("AppErrorBoundary", () => {
  it("renders a recoverable fallback when a child route crashes", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <AppErrorBoundary>
        <BrokenView />
      </AppErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Burada beklenmeyen bir sorun oluştu.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Yeniden dene" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Rezervasyona dön" }),
    ).toHaveAttribute("href", "/");
  });
});

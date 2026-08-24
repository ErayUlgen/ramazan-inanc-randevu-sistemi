import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./dialog";

describe("Dialog", () => {
  it("exposes an accessible modal and moves focus inside it", async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Randevuyu değiştir</DialogTitle>
          <DialogDescription>
            Mevcut randevun yeni saat onaylanana kadar korunur.
          </DialogDescription>
          <button type="button">Yeni saati seç</button>
        </DialogContent>
      </Dialog>,
    );

    expect(
      screen.getByRole("dialog", { name: "Randevuyu değiştir" }),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Yeni saati seç" }),
      ).toHaveFocus(),
    );
  });
});

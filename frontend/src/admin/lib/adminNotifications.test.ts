import { beforeEach, describe, expect, it } from "vitest";
import {
  readAdminNotificationPreferences,
  saveAdminNotificationPreferences,
} from "./adminNotifications";

describe("admin notification preferences", () => {
  beforeEach(() => window.localStorage.clear());

  it("güvenli varsayılanları kullanır", () => {
    expect(readAdminNotificationPreferences()).toEqual({
      soundEnabled: true,
      desktopEnabled: false,
    });
  });

  it("kullanıcı tercihini localStorage içinde kalıcılaştırır", () => {
    saveAdminNotificationPreferences({
      soundEnabled: false,
      desktopEnabled: true,
    });
    expect(readAdminNotificationPreferences()).toEqual({
      soundEnabled: false,
      desktopEnabled: true,
    });
  });
});

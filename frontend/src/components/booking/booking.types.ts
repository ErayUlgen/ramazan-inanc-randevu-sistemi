export type BookingStep = 1 | 2 | 3 | 4;
export type DataMode = "live" | "preview" | "unavailable";

export interface ConfirmationValues {
  fullName: string;
  phone: string;
  verificationCode: string;
  note: string;
}

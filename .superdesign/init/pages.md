# Page Dependency Trees

## `/` — Public Booking

Entry: `frontend/src/components/booking/BookingExperience.tsx`

- `hooks/useBookingFlow.ts`
  - `lib/api.ts`
  - `lib/availability.ts`
  - `data/demo.ts`
- `components/booking/BrandHeader.tsx`
  - `components/brand/StudioWordmark.tsx`
- `components/brand/StudioVideoPanel.tsx`
  - `components/motion/AnimatedGlassCard.tsx`
  - `components/brand/AnatomyContourMark.tsx`
- `components/motion/DynamicCanvasBackground.tsx`
- `components/booking/BookingProgress.tsx`
- `components/booking/ServiceStep.tsx`
  - `components/booking/BookingPrimitives.tsx`
  - `components/motion/AnimatedGlassCard.tsx`
- `components/booking/ProfessionalStep.tsx`
  - `components/ui/ProfessionalAvatar.tsx`
- `components/booking/TimeStep.tsx`
- `components/booking/ConfirmationStep.tsx`
- `components/booking/BookingSummary.tsx`
- `components/booking/MobileBookingBar.tsx`
- `components/booking/PendingApprovalView.tsx`
  - `components/booking/AnimatedLivingQRCode.tsx`
- `styles/booking.css`
- `design-system/tokens.css`
- `design-system/motion.ts`

## `/hesabim` — Customer Dashboard

Entry: `frontend/src/customer-account/CustomerAccountApp.tsx`

- `customer-account/customerAccountApi.ts`
- `customer-account/customerAccountTypes.ts`
- `components/brand/StudioWordmark.tsx`
- `components/motion/DynamicCanvasBackground.tsx`
- `components/ui/button.tsx`
- `components/ui/dialog.tsx`
- `customer-account/customerAccount.css`

## `/hesabim/randevular/:publicCode` — Customer Booking Detail

Entry: `CustomerBookingPage` render branch in `frontend/src/customer-account/CustomerAccountApp.tsx`

- `components/booking/AnimatedLivingQRCode.tsx`
  - `components/motion/AnimatedGlassCard.tsx`
- `components/ui/button.tsx`
- `components/ui/dialog.tsx`
- `customer-account/customerAccount.css`

## `/admin` — Appointment Command Center

Entry: `frontend/src/admin/AdminDashboard.tsx`

- `admin/components/AdminHeader.tsx`
- `admin/components/AdminCommandBar.tsx`
- `admin/components/AdminSummary.tsx`
- `admin/components/PendingQueue.tsx`
- `admin/components/DayTimeline.tsx`
- `admin/components/BookingDetailDrawer.tsx`
  - `admin/components/BookingAuditHistory.tsx`
  - `admin/components/BookingNotificationHistory.tsx`
- `admin/components/ManualBookingDrawer.tsx`
- `admin/components/BookingEditDialog.tsx`
- `admin/styles/admin.css`

## `/admin/requests`

Entry: `frontend/src/admin/pages/RequestsPage.tsx`

- `admin/components/AdminPageFrame.tsx`
- `admin/components/AdminHeader.tsx`
- `admin/components/BookingDetailDrawer.tsx`
- `admin/api/adminApi.ts`
- `admin/styles/admin.css`

## `/admin/schedule`

Entry: `frontend/src/admin/pages/SchedulePage.tsx`

- `admin/components/AdminPageFrame.tsx`
- `admin/components/AdminHeader.tsx`
- `components/ui/button.tsx`
- `components/ui/dialog.tsx`
- `components/ui/input.tsx`
- `components/ui/select.tsx`
- `components/ui/checkbox.tsx`
- `admin/styles/admin.css`

## `/admin/customers`

Entry: `frontend/src/admin/pages/CustomersPage.tsx`

- `admin/components/AdminPageFrame.tsx`
- `admin/components/AdminHeader.tsx`
- `admin/api/adminApi.ts`
- `admin/styles/admin.css`

## `/admin/catalog`

Entry: `frontend/src/admin/pages/CatalogPage.tsx`

- `admin/components/AdminPageFrame.tsx`
- `admin/components/AdminHeader.tsx`
- `components/ui/button.tsx`
- `components/ui/dialog.tsx`
- `admin/styles/admin.css`

## `/bekleme-listesi`

Entry: `frontend/src/waitlist/WaitlistJoinPage.tsx`

- `components/brand/StudioWordmark.tsx`
- `components/ui/button.tsx`
- `styles/booking.css`

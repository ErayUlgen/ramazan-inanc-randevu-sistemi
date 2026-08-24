# Extractable Components

## BrandHeader
- Source: `frontend/src/components/booking/BrandHeader.tsx`
- Category: layout
- Description: Public booking header with official wordmark, salon facts and customer-account entry.
- Extractable props: `dataMode`, `href`
- Hardcoded: official logo, Denizli, 10.00–21.00, security label, icons and CSS classes

## AdminHeader
- Source: `frontend/src/admin/components/AdminHeader.tsx`
- Category: layout
- Description: Admin product header with section navigation, realtime state and customer preview bridge.
- Extractable props: `activeSection`, `refreshing`, `lastUpdatedAt`
- Hardcoded: navigation labels, icon names, brand wordmark and layout CSS

## AdminPageFrame
- Source: `frontend/src/admin/components/AdminPageFrame.tsx`
- Category: layout
- Description: Shared admin section shell with heading, action slot and page body.
- Extractable props: `section`, `eyebrow`, `title`, `description`
- Hardcoded: admin header placement and main shell classes

## StudioWordmark
- Source: `frontend/src/components/brand/StudioWordmark.tsx`
- Category: layout
- Description: Official Ramazan İnanç mark plus local wordmark typography.
- Extractable props: none
- Hardcoded: official logo asset and brand copy

## StudioDock
- Source: `frontend/src/components/navigation/StudioDock.tsx`
- Category: layout
- Description: Contextual bridge to the admin product when an admin session is active.
- Extractable props: visibility state
- Hardcoded: copy, icons and `/admin` target

## AnimatedLivingQRCode
- Source: `frontend/src/components/booking/AnimatedLivingQRCode.tsx`
- Category: basic
- Description: Scannable booking pass with orbit, laser, state pulse and copy interaction.
- Extractable props: `value`, `code`, `statusLabel`, `compact`
- Hardcoded: QR visual system, animation and confetti palette

## ProfessionalAvatar
- Source: `frontend/src/components/ui/ProfessionalAvatar.tsx`
- Category: basic
- Description: Specialist portrait/monogram with deterministic gradient fallback.
- Extractable props: `name`, `src`, `size`, `selected`, `disabled`
- Hardcoded: fallback palettes and monogram behavior

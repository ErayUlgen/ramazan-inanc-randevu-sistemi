# Ramazan İnanç Hair Art Studio — Sprint 09 Design System

## Product direction

The product uses one unified **Cinematic Editorial Utility** system across:

- public booking;
- customer account;
- admin operations;
- authentication, empty, loading, error and success states.

The system must feel authored by a mature hair-art brand and built as a dependable product. It must not resemble a generic AI-generated SaaS or salon template.

The visual architecture has two coordinated worlds:

1. **Brand stage** — dark, cinematic and identity-led.
2. **Operational workbench** — cool, clear and task-led.

Dark surfaces establish the studio and frame important moments. Light surfaces carry dense decisions and operational work. Never turn every panel dark and never make every element a floating card.

## Core principles

1. **Editorial hierarchy over decoration.** Use alignment, typography, rules and deliberate contrast before gradients, glows or ornaments.
2. **Task density over oversized cards.** A component earns its footprint through information or action value.
3. **Shared grammar, different density.** Public is calm and guided; customer account is personal and concise; admin is compact and operational.
4. **Fewer containers.** Prefer sections, dividers, table/list structures and surface shifts. Avoid card-inside-card nesting.
5. **Clear state language.** Selected, hover, focus, disabled, loading, empty, warning, error and success states are designed explicitly.
6. **Motion communicates change.** No movement exists only to prove that the interface is animated.

## Typography

### Families

- UI and body: **Source Sans 3**
- Display and key editorial headings: **Archivo**
- Fallback: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

Do not use Onest, Bricolage Grotesque or decorative serif fonts.

### Allowed weights

- 400 — secondary prose and non-critical metadata
- 500 — body, supporting labels and inactive controls
- 600 — buttons, navigation, fields, values and card titles
- 700 — page headings, section headings, critical totals and primary status

Do not simulate 650, 780, 820, 850 or other synthetic weights.

### Scale

- Display hero: 48–56px desktop, 36–42px mobile; Archivo 700; line-height 0.98–1.04
- Page title: 36–44px desktop, 30–36px mobile; Archivo 700
- Section title: 22–28px; Archivo 700
- Card/list title: 16–18px; Source Sans 3 600–700
- Body: 15–16px; Source Sans 3 400–500; line-height 1.45–1.6
- UI/control: 14–15px; Source Sans 3 600
- Metadata: 12–13px; Source Sans 3 500–600

No text below 12px. Do not use all-caps paragraphs. Eyebrows are rare, short and spaced at 0.06–0.09em.

## Color tokens

### Brand stage

- `stage.canvas`: `#0F151D`
- `stage.raised`: `#151E29`
- `stage.soft`: `#1B2735`
- `stage.ink`: `#F7F9FC`
- `stage.inkSecondary`: `#C8D1DC`
- `stage.muted`: `#8E9AA8`
- `stage.border`: `rgba(226, 234, 243, 0.22)`
- `stage.borderStrong`: `rgba(226, 234, 243, 0.36)`

### Operational workbench

- `workbench.canvas`: `#E0E6EB`
- `workbench.canvasStrong`: `#D3DBE2`
- `workbench.surface`: `#F3F6F8`
- `workbench.raised`: `#FAFBFC`
- `workbench.soft`: `#EDF1F4`
- `workbench.ink`: `#090F15`
- `workbench.inkSecondary`: `#293642`
- `workbench.muted`: `#50606E`
- `workbench.border`: `rgba(9, 15, 21, 0.24)`
- `workbench.borderStrong`: `rgba(9, 15, 21, 0.38)`

### Actions and states

- `action.primary`: `#121A23`
- `action.hover`: `#080D12`
- `action.foreground`: `#FFFFFF`
- `accent`: `#121A23`
- `accent.hover`: `#080D12`
- `accent.soft`: `rgba(18, 26, 35, 0.10)`
- `accent.border`: `rgba(18, 26, 35, 0.42)`
- `success`: `#129C78`
- `success.soft`: `rgba(18, 156, 120, 0.11)`
- `warning`: `#B7791F`
- `warning.soft`: `rgba(183, 121, 31, 0.12)`
- `danger`: `#C6473E`
- `danger.soft`: `rgba(198, 71, 62, 0.11)`

Near-black charcoal remains the dominant action and selection color. Filled charcoal controls always use white text/icons. Mint green is the supporting guidance color for trust, completed/current booking progress and compact appointment metadata icons; it must not replace charcoal CTAs. Amber and red remain semantic status colors. Blue and orange are not part of the product UI palette. Avoid neon and decorative multicolor gradients.

## Spacing and layout

Use an 8px rhythm with 4px adjustments:

- 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

### Containers

- Public/customer maximum content width: 1480px
- Admin operational width: up to 1780px
- Desktop side gutter: 28–48px
- Tablet side gutter: 20–28px
- Mobile side gutter: 14–18px

Use the available width deliberately. Do not create a narrow centered island inside a large desktop viewport. Admin timelines, command bars and summary strips should expand horizontally.

### Responsive behavior

- Desktop: guided two-column booking with a stable summary rail; wide operational admin layouts.
- Tablet: preserve hierarchy, collapse side rails only when necessary.
- Mobile: recompose for touch; do not merely shrink desktop.
- Minimum touch target: 44×44px.
- No horizontal overflow at 320px.

## Shape system

Use controlled, sharper geometry:

- Small control: 6px
- Input, compact button, status: 8px
- Card, dialog, panel: 10–12px
- Large architectural surface: maximum 12px
- Circles are reserved for avatars, step markers, radio/check indicators and icon buttons.

Do not use 15–24px radii. Do not make every control a pill. Segmented controls may be compact rectangles with 8px corners.

## Borders and dividers

Borders carry most of the hierarchy.

- Default border: 1px workbench or stage border token
- Selected border: 1px accent plus a 2–3px directional accent or inset ring
- Section dividers: 1px
- Editorial rule: 2px primary, short and aligned to text

Avoid muddy translucent borders and double-outline noise.

## Elevation

Only two elevation levels are allowed:

- `shadow.1`: `0 8px 24px -18px rgba(16, 24, 32, 0.28), 0 1px 2px rgba(16, 24, 32, 0.06)`
- `shadow.2`: `0 18px 42px -26px rgba(16, 24, 32, 0.36), 0 2px 6px rgba(16, 24, 32, 0.08)`

Use shadows for sticky/floating hierarchy, dialogs and the most important raised surface. Most cards should rely on border and surface contrast.

No glow, glare, glassmorphism, ambient particle shadow or exaggerated floating effect.

## Iconography

Use **Phosphor Icons** only. The existing product already standardizes on this
family; introducing Lucide would create two subtly different stroke systems.

- 16px for metadata
- 18px for controls
- 20–22px for section actions
- 24px for rare status illustrations
- Default weight: `bold` for controls, `duotone` for quiet status illustrations,
  `fill` only for selected/current state

Icons support labels; they do not replace critical labels. Do not mix filled emoji, custom sparkles or unrelated icon families.

## Interaction states

### Buttons

Primary:

- solid `action.primary` background;
- white label and icon;
- 8px radius;
- 44–48px height;
- 14–15px weight 600;
- hover uses `action.hover` and at most `translateY(-1px)`;
- active returns to baseline.

Secondary:

- raised or transparent surface;
- strong border;
- workbench or stage foreground;
- primary border/ink on hover.

Destructive:

- danger text and border, soft danger background only when emphasis is required.

Disabled:

- preserve legibility;
- opacity 0.52–0.60;
- no shadow or hover motion.

### Fields

- 44–48px minimum height;
- 8px radius;
- visible labels above fields;
- no placeholder-only labeling;
- focused border accent plus a restrained 3px soft focus ring;
- errors appear beside the field with human language.

### Selection

Selected state must combine at least two signals:

- border/inset accent;
- surface change;
- check/radio indicator;
- label or status change.

### Navigation

Current item uses a clear surface or underline plus stronger ink. Navigation must not resemble a row of oversized unrelated CTA buttons.

## Motion

- Micro interaction: 160ms
- Control/card state: 220–260ms
- Page/step transition: 280–300ms
- Ease: `cubic-bezier(0.22, 1, 0.36, 1)`

Allowed:

- opacity and 4–8px translation for step entry;
- subtle underline expansion;
- selected border/surface transition;
- restrained numeric crossfade;
- drawer/dialog transitions;
- skeleton shimmer.

Disallowed:

- 3D tilt;
- gyro/parallax cursor tracking;
- glare or sheen;
- ambient particles or connection lines;
- rotating technology rings;
- laser scans;
- neon pulse;
- routine confetti;
- continuous decorative loops.

Always honor `prefers-reduced-motion`.

## Public booking

The first viewport must show the booking task. The cinematic video is a wide background layer, not an isolated decorative card.

Structure:

1. compact brand/header within the stage;
2. concise headline and trust line;
3. progress strip crossing into the workbench;
4. active step panel;
5. persistent desktop summary / mobile summary action.

Service cards are compact and selection-first. One appointment selects one service. Men and women services are separate top-level groups. Remove generic “all” categorization.

Avoid:

- repeated category labels on every card;
- oversized empty cards;
- watermarks over text;
- card-inside-card stacking;
- duplicate explanatory copy.

## Customer account

Use the same stage and workbench grammar with a calmer personal density.

- compact stage header with logo, navigation and user cluster;
- page title and one primary action;
- booking groups rendered as clear lists/sections;
- status, date, time, expert, service, price and reference code remain scannable;
- profile and booking detail screens use the same field, action and status primitives.

Avoid turning each booking into a large promotional card.

### Mint booking actions

Mint is the semantic color for trust, guidance and booking commitment. Compact
guidance controls use a pale mint surface with a dark-green 800-weight label.
Charcoal remains the default primary action, including the time-hold commitment
button.

## Admin operations

Admin is the densest expression of the system.

- stage header and navigation;
- full-width command/filter bar;
- compact summary strip;
- decision queue and timeline as primary work surfaces;
- data-first tables/lists;
- drawers/dialogs for secondary editing;
- no large marketing headings inside work screens.

The timeline must use horizontal width, clear lane headers, visible time labels and dense but readable appointment blocks.

## Authentication

Login screens use a split or staged layout:

- brand context on one side or upper band;
- compact form surface;
- visible labels;
- one dominant submit action;
- secondary return link;
- no decorative icon tile unless it communicates status.

## Required states

Every major feature must account for:

- loading;
- skeleton;
- empty;
- error;
- success;
- disabled;
- selected;
- hover;
- keyboard focus;
- reduced motion.

Error messages explain what happened and what the user can do next. Never expose raw API/server language.

## Anti-template checklist

Reject the result if it contains:

- generic AI salon copy;
- giant rounded containers;
- soft card grids with identical geometry everywhere;
- random pastel/gradient decoration;
- decorative sparkles;
- floating 3D illustrations;
- excessive letter spacing;
- too many uppercase labels;
- every value inside a badge;
- every section inside another card;
- inconsistent icon families;
- synthetic font weights;
- oversized blank areas;
- light and dark areas that feel like unrelated themes.

The final impression should be a coherent, disciplined product for a rooted hair-art studio: cinematic where brand matters, precise where decisions happen, and unmistakably intentional everywhere.

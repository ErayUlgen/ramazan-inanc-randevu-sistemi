# Theme

## Compact Token Summary

- Canvas: `#e0e6eb`; stronger canvas: `#d3dbe2`
- Primary surface: `#f3f6f8`; raised surface: `#fafbfc`; subtle surface: `#edf1f4`
- Ink: `#0b1016`; soft ink: `#24303b`
- Muted: `#44515e`; light muted: `#5c6976`
- Primary charcoal: `#121a23`; hover: `#080d12`; soft: `rgba(18, 26, 35, 0.10)`
- Success mint: `#0b9e76`; soft: `#e8f7f2`
- Champagne accent: `#c89b52`; soft: `#fbf4e8`
- Danger: `#bd3d35`; soft: `#fff0ed`
- Body font: Onest Variable, 100–900
- Display font: Bricolage Grotesque Variable, 200–800
- Radius: controls `10px`, cards `15px`, panels `20px`
- Shadows: controlled low-opacity slate shadows, no muddy wide glow
- Motion: 160ms micro, 260ms card, 300ms page, cubic-bezier `(0.22,1,0.36,1)`
- Main responsive breakpoints: 1080, 820, 627/600, 360/350 px
- Light-only product UI. No dark mode.

## Raw `tokens.css`

```css
:root {
  color-scheme: light;
  --ri-canvas: #e0e6eb;
  --ri-canvas-strong: #d3dbe2;
  --ri-surface: #f3f6f8;
  --ri-surface-raised: #fafbfc;
  --ri-surface-subtle: #edf1f4;
  --ri-ink: #0b1016;
  --ri-ink-soft: #24303b;
  --ri-muted: #44515e;
  --ri-muted-light: #5c6976;
  --ri-primary: #121a23;
  --ri-primary-hover: #080d12;
  --ri-primary-soft: rgba(18, 26, 35, 0.10);
  --ri-primary-border: rgba(18, 26, 35, 0.42);
  --ri-coral: var(--ri-primary);
  --ri-coral-soft: var(--ri-primary-soft);
  --ri-mint: #0b9e76;
  --ri-mint-soft: #e8f7f2;
  --ri-champagne: #c89b52;
  --ri-champagne-soft: #fbf4e8;
  --ri-warning: var(--ri-primary);
  --ri-warning-soft: var(--ri-primary-soft);
  --ri-danger: #bd3d35;
  --ri-danger-soft: #fff0ed;
  --ri-border: rgba(15, 23, 42, 0.12);
  --ri-border-strong: rgba(15, 23, 42, 0.2);
  --ri-focus: rgba(47, 111, 227, 0.25);
  --ri-font-body: 'Onest Variable', Inter, system-ui, sans-serif;
  --ri-font-display: 'Bricolage Grotesque Variable', 'Onest Variable', Inter, system-ui, sans-serif;
  --ri-radius-control: 10px;
  --ri-radius-card: 15px;
  --ri-radius-panel: 20px;
  --ri-shadow-soft: 0 14px 38px -28px rgba(15, 23, 42, 0.34);
  --ri-shadow-focus: 0 26px 60px -36px rgba(15, 23, 42, 0.44);
  --ri-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ri-speed-micro: 160ms;
  --ri-speed-card: 260ms;
  --ri-speed-page: 300ms;
}
```

## Raw font declarations

```css
@font-face {
  font-family: 'Onest Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('@fontsource-variable/onest/files/onest-latin-ext-wght-normal.woff2') format('woff2-variations');
}
@font-face {
  font-family: 'Bricolage Grotesque Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 200 800;
  src: url('@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-ext-wght-normal.woff2') format('woff2-variations');
}
```

## Raw semantic mapping from `index.css`

```css
:root {
  --background: var(--ri-canvas);
  --foreground: var(--ri-ink);
  --card: var(--ri-surface);
  --card-foreground: var(--ri-ink);
  --popover: var(--ri-surface);
  --popover-foreground: var(--ri-ink);
  --primary: var(--ri-primary);
  --primary-foreground: #ffffff;
  --secondary: var(--ri-surface-subtle);
  --secondary-foreground: var(--ri-ink);
  --muted: var(--ri-canvas-strong);
  --muted-foreground: var(--ri-muted);
  --accent: var(--ri-primary-soft);
  --accent-foreground: var(--ri-primary-hover);
  --destructive: var(--ri-danger);
  --border: var(--ri-border);
  --input: var(--ri-border-strong);
  --ring: var(--ri-primary);
  --radius: var(--ri-radius-control);
}
```

# Shared UI Components

Framework: React 19 + TypeScript. UI layer combines custom product components with shadcn-style Radix primitives and Tailwind v4 utility classes.

## Button

- Path: `frontend/src/components/ui/button.tsx`
- Shared button primitive with default, outline, secondary, ghost, destructive, and link variants.

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--ri-radius-control)] border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-[transform,box-shadow,color,background-color,border-color] duration-160 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-55 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary !text-white [&_svg]:!text-white shadow-[0_12px_28px_-18px_rgba(47,111,227,.8)] hover:-translate-y-px hover:bg-[var(--ri-primary-hover)] hover:!text-white hover:shadow-[0_16px_34px_-18px_rgba(47,111,227,.9)]",
        outline: "border-border bg-card text-foreground hover:-translate-y-px hover:border-[var(--ri-primary-border)] hover:bg-accent hover:text-accent-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-5 text-[15px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-11",
        "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
```

## Input

- Path: `frontend/src/components/ui/input.tsx`
- Shared input primitive with tokenized focus and error states.

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

## Badge

- Path: `frontend/src/components/ui/badge.tsx`
- Compact semantic badge with CVA variants.

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive: "bg-destructive/10 text-destructive [a]:hover:bg-destructive/20",
        outline: "border-border text-foreground [a]:hover:bg-muted",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
```

## ProfessionalAvatar

- Path: `frontend/src/components/ui/ProfessionalAvatar.tsx`
- Deterministic gradient avatar with real-image support and monogram fallback.

```tsx
import type { CSSProperties } from 'react';

const palettes = [
  ['#2F6FF6', '#6B4EFF'], ['#0D9E86', '#24C6A2'],
  ['#367AF5', '#54A4F6'], ['#334ED8', '#2AA8E8'],
  ['#8C45C8', '#D34F9B'], ['#4361E8', '#6C8BFF'],
  ['#16766F', '#24A8A0'], ['#D13E5B', '#F16B6B'],
] as const;

const hashName = (name: string) => {
  let hash = 0;
  for (const character of name) hash = character.charCodeAt(0) + ((hash << 5) - hash);
  return Math.abs(hash);
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? '?'}${parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''}`.toLocaleUpperCase('tr-TR');
};

export function ProfessionalAvatar({
  name, src, size = 'md', selected = false, disabled = false,
}: {
  name: string; src?: string; size?: 'sm' | 'md' | 'lg'; selected?: boolean; disabled?: boolean;
}) {
  const palette = palettes[hashName(name) % palettes.length];
  const style = { '--avatar-from': palette[0], '--avatar-to': palette[1] } as CSSProperties;
  return (
    <span className={`professional-avatar professional-avatar--${size} ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`} style={style} title={name}>
      <span className="professional-avatar__surface">
        {src ? <img src={src} alt={name} /> : <span aria-hidden="true">{initials(name)}</span>}
      </span>
    </span>
  );
}
```

## Skeleton

- Path: `frontend/src/components/ui/skeleton.tsx`

```tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
}

export { Skeleton }
```

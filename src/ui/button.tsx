import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { UiLink } from "./link";

/**
 * Button. Rule: ONE `primary` button per screen, for the next step of the record on screen.
 * Everything else is `secondary`, `ghost` or a TextLink.
 *
 * Sizes:
 *  md  38px  page header actions
 *  sm  32px  actions inside list rows
 *  xs  28px  actions inside dense panels (dispatch board)
 *  xl  60px  the driver app's main button (full width)
 *  field 44px full-width secondary in driver cards (Navigate)
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "xs" | "sm" | "md" | "xl" | "field";

const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary font-medium border-0",
  secondary: "bg-transparent text-text border border-border-control",
  ghost: "bg-transparent text-text-muted border-0",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-7 px-3 rounded-sm text-12",
  sm: "h-8 px-3.5 rounded-md text-13 font-medium",
  md: "h-9.5 px-4 rounded-md text-14",
  xl: "h-15 w-full rounded-xl text-18 font-semibold",
  field: "h-11 w-full rounded-lg text-15 font-medium",
};

type Common = { variant?: ButtonVariant; size?: ButtonSize; className?: string; children: ReactNode };

export function Button({
  variant = "secondary",
  size = "md",
  className,
  href,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: string }) {
  const cls = cn(base, variants[variant], sizes[size], className);
  if (href) return <UiLink href={href} className={cls}>{rest.children}</UiLink>;
  return <button type="button" className={cls} {...rest} />;
}

/** Text link: "View all", "Undo", "Dispatch board". */
export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <UiLink href={href} className={cn("text-13 text-link hover:underline", className)}>
      {children}
    </UiLink>
  );
}

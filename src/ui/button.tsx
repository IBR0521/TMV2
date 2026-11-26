import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from './cn';

/**
 * One primary button per screen: the next step for the record on screen
 * (design/README.md). It is the only saturated thing on the page, so a second
 * one would be a lie about what matters.
 *
 * Secondary is a surface, not an outline; quiet is text that gains a surface
 * under the pointer. Nothing here carries a border for decoration.
 */
type Variant = 'primary' | 'secondary' | 'quiet';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-3.5 h-9 ' +
  'text-body-strong whitespace-nowrap transition-colors ' +
  'disabled:opacity-45 disabled:pointer-events-none';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:brightness-[1.07]',
  secondary: 'bg-selected text-text hover:bg-surface-raised',
  quiet: 'text-text-secondary hover:bg-selected hover:text-text',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({ variant = 'secondary', className, children, ...rest }: ButtonProps) {
  return (
    <button className={cn(BASE, VARIANTS[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = 'secondary',
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(BASE, VARIANTS[variant], className)}>
      {children}
    </Link>
  );
}

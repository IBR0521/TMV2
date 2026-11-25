import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from './cn';

/**
 * One primary button per screen: the next step for the record on screen
 * (design/README.md, principle 1). Everything else is secondary or a link.
 */
type Variant = 'primary' | 'secondary' | 'quiet';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 h-9 ' +
  'text-body-strong whitespace-nowrap transition-colors ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-link hover:text-bg',
  secondary: 'border border-control text-text hover:bg-selected',
  quiet: 'text-link hover:underline px-0',
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

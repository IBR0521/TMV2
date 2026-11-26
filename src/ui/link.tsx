import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

/**
 * The one place that decides how links render. In this app it is next/link,
 * so every kit component gets client-side navigation from this single change.
 */
export type UiLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function UiLink({ href, ...rest }: UiLinkProps) {
  return <Link href={href} {...rest} />;
}

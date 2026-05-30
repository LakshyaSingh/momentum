"use client";

import Link, { type LinkProps } from "next/link";
import { type ComponentProps, type ReactNode } from "react";

type NavLinkProps = LinkProps &
  Omit<ComponentProps<"a">, keyof LinkProps> & {
    children: ReactNode;
  };

export function NavLink({ href, children, ...props }: NavLinkProps) {
  return (
    <Link href={href} prefetch {...props}>
      {children}
    </Link>
  );
}

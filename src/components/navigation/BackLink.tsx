"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BackLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  disabled?: boolean;
};

export default function BackLink({
  href,
  disabled = false,
  children,
  target,
  ...props
}: BackLinkProps) {
  const router = useRouter();

  const fallbackHref =
    href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")
      ? href
      : "/";

  return (
    <Link
      {...props}
      href={fallbackHref}
      target={target}
      prefetch={false}
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          (target && target !== "_self")
        ) {
          return;
        }

        event.preventDefault();

        if (window.history.length > 1) {
          router.back();
        } else {
          router.replace(fallbackHref);
        }
      }}
    >
      {children}
    </Link>
  );
}

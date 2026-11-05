"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  House,
  Plus,
  Settings2,
} from "lucide-react";

import BackLink from "./BackLink";
import styles from "./Breadcrumbs.module.css";

type Crumb = {
  label: string;
  href: string;
};

const CHECK_NAMES: Record<string, string> = {
  sticker: "Dagelijks stickeren",
  monthly: "Vooruit stickeren",
  evening: "Dagelijks ophalen",
  "monthly-pickup": "Vooruit ophalen",
  overdue: "Over datum",
  stock: "Stockcheck",
};

function getCheckCrumbs(pathname: string, params: URLSearchParams): Crumb[] {
  if (pathname === "/check/delivery/select") {
    return [
      {
        label: "Leveringen kiezen",
        href: "/check/delivery/select",
      },
    ];
  }

  if (pathname === "/check/delivery") {
    return [
      {
        label: "Leveringen kiezen",
        href: "/check/delivery/select",
      },
      {
        label: "Leveringscheck",
        href: `/check/delivery?${params.toString()}`,
      },
    ];
  }

  const type = params.get("type") ?? "";
  const label = CHECK_NAMES[type] ?? "Controle";
  const baseHref = type
    ? `/check?${new URLSearchParams({ type }).toString()}`
    : "/check";

  const crumbs: Crumb[] = [{ label, href: baseHref }];

  if (type === "stock" && params.get("categoryId")) {
    crumbs.push({
      label: "Controleronde",
      href: `/check?${params.toString()}`,
    });
  }

  return crumbs;
}

function getCrumbs(pathname: string, params: URLSearchParams): Crumb[] {
  if (
    pathname === "/check" ||
    pathname === "/check/delivery" ||
    pathname === "/check/delivery/select"
  ) {
    return getCheckCrumbs(pathname, params);
  }

  if (pathname === "/handleiding") {
    return [{ label: "Handleiding", href: "/handleiding" }];
  }

  if (pathname === "/admin") {
    return [{ label: "Beheer", href: "/admin" }];
  }

  if (pathname.startsWith("/admin/")) {
    const names: Record<string, string> = {
      "/admin/settings": "Instellingen",
      "/admin/imagelinker": "Foto’s koppelen",
      "/admin/producten-toevoegen": "Producten toevoegen",
    };

    return [
      { label: "Beheer", href: "/admin" },
      {
        label: names[pathname] ?? "Beheerpagina",
        href: pathname,
      },
    ];
  }

  if (pathname === "/stockchecker") {
    return [{ label: "Voorraad", href: "/stockchecker" }];
  }

  if (pathname === "/stockchecker/new") {
    return [
      { label: "Voorraad", href: "/stockchecker" },
      { label: "Producten toevoegen", href: pathname },
    ];
  }

  if (pathname.startsWith("/stockchecker/")) {
    const returnTo = params.get("returnTo");

    if (
      returnTo?.startsWith("/") &&
      !returnTo.startsWith("//") &&
      !returnTo.includes("\\")
    ) {
      try {
        const origin = new URL(returnTo, "https://datecheck.invalid");

        if (
          origin.pathname === "/check" ||
          origin.pathname === "/check/delivery"
        ) {
          return [
            ...getCheckCrumbs(origin.pathname, origin.searchParams),
            { label: "Product bewerken", href: pathname },
          ];
        }
      } catch {
        // Gebruik het voorraadpad bij een ongeldige terugkeerlink.
      }
    }

    return [
      { label: "Voorraad", href: "/stockchecker" },
      { label: "Product bewerken", href: pathname },
    ];
  }

  if (pathname === "/fastadd") {
    return [
      { label: "Voorraad", href: "/stockchecker" },
      { label: "Snel toevoegen", href: "/fastadd" },
    ];
  }

  return [];
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let frame = 0;

    function update() {
      frame = 0;
      const y = window.scrollY;

      setCompact((current) => {
        if (current) return y > 12;
        return y > 60;
      });
    }

    function schedule() {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    }

    update();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  if (pathname === "/login") return null;

  const home = pathname === "/";
  const params = new URLSearchParams(searchParams.toString());
  const crumbs = getCrumbs(pathname, params);

  const entries: Crumb[] = [{ label: "Home", href: "/" }, ...crumbs];
  const currentCrumb = crumbs[crumbs.length - 1];

  const title = home
    ? "DateCheck"
    : pathname === "/check"
      ? (CHECK_NAMES[params.get("type") ?? ""] ?? "Controle")
      : (currentCrumb?.label ?? "DateCheck");

  const fallbackHref = crumbs.length > 1 ? crumbs[crumbs.length - 2].href : "/";

  return (
    <header className={styles.shell} data-compact={compact ? "true" : "false"}>
      <div className={styles.panel}>
        <div className={styles.content}>
          <div className={styles.top}>
            {home ? (
              <Link
                href="/"
                className={styles.brandIcon}
                aria-label="DateCheck home"
              >
                <ClipboardCheck size={23} aria-hidden="true" />
              </Link>
            ) : (
              <BackLink
                href={fallbackHref}
                className={styles.back}
                aria-label="Terug naar de vorige pagina"
              >
                <ArrowLeft size={20} aria-hidden="true" />
              </BackLink>
            )}

            <div className={styles.heading}>
              {!home && (
                <Link href="/" className={styles.brandLabel}>
                  DateCheck
                </Link>
              )}

              <h1 className={styles.title}>
                {home ? (
                  <>
                    Date<span className={styles.accent}>Check</span>
                  </>
                ) : (
                  title
                )}
              </h1>
            </div>

            {home ? (
              <Link
                href="/admin"
                className={styles.action}
                aria-label="Beheer openen"
              >
                <Settings2 size={20} aria-hidden="true" />
              </Link>
            ) : pathname === "/stockchecker" ? (
              <Link
                href="/stockchecker/new"
                className={`${styles.action} ${styles.add}`}
                aria-label="Producten toevoegen"
              >
                <Plus size={21} aria-hidden="true" />
              </Link>
            ) : (
              <Link href="/" className={styles.action} aria-label="Naar Home">
                <House size={18} aria-hidden="true" />
              </Link>
            )}
          </div>

          <nav className={styles.navigation} aria-label="Kruimelpad">
            <ol className={styles.list}>
              {entries.map((crumb, index) => {
                const current = index === entries.length - 1;
                const homeCrumb = index === 0;

                const label = homeCrumb ? (
                  <>
                    <House size={13} aria-hidden="true" />
                    <span className={styles.srOnly}>Home</span>
                  </>
                ) : (
                  crumb.label
                );

                return (
                  <li key={`${crumb.href}:${index}`} className={styles.item}>
                    {index > 0 && (
                      <ChevronRight
                        size={11}
                        className={styles.separator}
                        aria-hidden="true"
                      />
                    )}

                    {current ? (
                      <span
                        className={styles.current}
                        aria-current="page"
                        title={homeCrumb ? "Home" : undefined}
                      >
                        {label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        prefetch={false}
                        title={homeCrumb ? "Home" : undefined}
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>
    </header>
  );
}
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1600"
  height="1200"
  viewBox="0 0 1600 1200"
  fill="none"
>
  <defs>
    <linearGradient id="base" x1="180" y1="0" x2="1380" y2="1200">
      <stop stop-color="#171b20" />
      <stop offset="0.48" stop-color="#101317" />
      <stop offset="1" stop-color="#080a0d" />
    </linearGradient>

    <radialGradient
      id="upperLight"
      cx="0"
      cy="0"
      r="1"
      gradientTransform="translate(690 120) rotate(76) scale(630 790)"
      gradientUnits="userSpaceOnUse"
    >
      <stop stop-color="#68717c" stop-opacity="0.36" />
      <stop offset="0.48" stop-color="#3b424c" stop-opacity="0.16" />
      <stop offset="1" stop-color="#111419" stop-opacity="0" />
    </radialGradient>

    <radialGradient
      id="lowerLight"
      cx="0"
      cy="0"
      r="1"
      gradientTransform="translate(1200 930) rotate(164) scale(800 510)"
      gradientUnits="userSpaceOnUse"
    >
      <stop stop-color="#626a75" stop-opacity="0.21" />
      <stop offset="1" stop-color="#101317" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="fold" x1="410" y1="140" x2="990" y2="1080">
      <stop stop-color="#7b838d" stop-opacity="0.02" />
      <stop offset="0.36" stop-color="#737c87" stop-opacity="0.18" />
      <stop offset="0.55" stop-color="#353d47" stop-opacity="0.1" />
      <stop offset="1" stop-color="#07090c" stop-opacity="0" />
    </linearGradient>

    <linearGradient id="rim" x1="330" y1="140" x2="1150" y2="1050">
      <stop stop-color="#bdc4cb" stop-opacity="0" />
      <stop offset="0.42" stop-color="#bdc4cb" stop-opacity="0.15" />
      <stop offset="0.75" stop-color="#8a929e" stop-opacity="0.04" />
      <stop offset="1" stop-color="#8a929e" stop-opacity="0" />
    </linearGradient>

    <filter id="soft" x="-35%" y="-35%" width="170%" height="170%">
      <feGaussianBlur stdDeviation="48" />
    </filter>

    <filter id="wideSoft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="90" />
    </filter>
  </defs>

  <path fill="url(#base)" d="M0 0h1600v1200H0z" />
  <path fill="url(#upperLight)" d="M0 0h1600v1200H0z" />
  <path fill="url(#lowerLight)" d="M0 0h1600v1200H0z" />

  <path
    d="M-180 1060C210 1080 260 540 620 320C940 125 1115 200 1790-180V330C1280 580 1080 475 820 665C520 885 470 1250-180 1370Z"
    fill="url(#fold)"
    filter="url(#soft)"
  />

  <path
    d="M-150 1050C210 1040 340 595 650 390C950 190 1230 180 1720-105"
    stroke="url(#rim)"
    stroke-width="35"
    filter="url(#soft)"
  />

  <path
    d="M-140 470C260 220 380 430 705 595C1060 775 1310 595 1760 760"
    stroke="#020305"
    stroke-opacity="0.58"
    stroke-width="170"
    filter="url(#wideSoft)"
  />

  <ellipse
    cx="370"
    cy="930"
    rx="360"
    ry="250"
    fill="#020305"
    fill-opacity="0.44"
    filter="url(#wideSoft)"
  />

  <ellipse
    cx="1190"
    cy="190"
    rx="330"
    ry="180"
    fill="#020305"
    fill-opacity="0.4"
    filter="url(#wideSoft)"
  />
</svg>;

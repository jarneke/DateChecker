"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronRight, Package, Pause } from "lucide-react";

import CheckTileGlass from "@/components/home/CheckTileGlass";
import PhotoViewer from "@/components/PhotoViewer";
import styles from "./ProductCard.module.css";

export type StockItem = {
  id: string;
  name: string;
  photo_url: string | null;
  expiry_date: string | null;
  sticker_30_percent: boolean;
  stickered: boolean;
  paused: boolean;
  category_id: string;
  category_name: string | null;
  category_color: string | null;
};

type ProductCardProps = {
  item: StockItem;
};

type ProductPhotoProps = {
  src: string | null;
  name: string;
  children?: ReactNode;
};

function formatDate(date: string | null) {
  if (!date) return "Geen stock";

  return new Date(date).toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Brussels",
  });
}

function getCategoryColor(color: string | null) {
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }

  return "#A3E635";
}

function ProductPhoto({ src, name, children }: ProductPhotoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <div className={styles.photo} data-glass-photo>
      {src && failedSrc !== src ? (
        <>
          <Image
            src={src}
            alt={name}
            fill
            sizes="76px"
            loading="lazy"
            className={styles.image}
            onError={() => setFailedSrc(src)}
          />
          <PhotoViewer src={src} alt={name} />
        </>
      ) : (
        <Package size={27} strokeWidth={1.5} className={styles.placeholder} />
      )}
      {children}
    </div>
  );
}

export default function ProductCard({ item }: ProductCardProps) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const expired =
    item.expiry_date !== null && item.expiry_date.slice(0, 10) < today;

  const categoryColor = getCategoryColor(item.category_color);

  const categoryStyle = {
    "--category-color": categoryColor,
  } as CSSProperties;

  const stickerLabel = item.sticker_30_percent
    ? "Gestickerd: 30%"
    : "Gestickerd: 50%";

  return (
    <article
      className={`${styles.card} ${item.paused ? styles.pausedCard : ""}`}
    >
      <CheckTileGlass className={styles.glass} />

      <ProductPhoto src={item.photo_url} name={item.name}>
        {item.stickered && (
          <span
            className={`${styles.stickerMarker} ${
              item.sticker_30_percent ? styles.sticker30 : styles.sticker50
            }`}
            role="img"
            aria-label={stickerLabel}
            title={stickerLabel}
          />
        )}
      </ProductPhoto>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <h3 className={styles.name}>{item.name}</h3>
        </div>

        <div className={styles.categoryRow}>
          <span className={styles.categoryPill} style={categoryStyle}>
            {item.category_name ?? "Geen categorie"}
          </span>

          {item.paused && (
            <span className={styles.pausedBadge}>
              <Pause size={11} aria-hidden="true" />
              Gepauzeerd
            </span>
          )}
        </div>

        <div className={styles.meta}>
          <span className={`${styles.date} ${expired ? styles.expired : ""}`}>
            <CalendarDays size={13} />
            {formatDate(item.expiry_date)}
          </span>

          <span className={styles.separator}>·</span>

          <span className={styles.controlType}>
            {item.sticker_30_percent ? "Dagelijks" : "Vooruit"}
          </span>
        </div>
      </div>

      <ChevronRight size={21} className={styles.arrow} />

      <Link
        href={`/stockchecker/${item.id}`}
        className={styles.cardLink}
        aria-label={item.name}
      />
    </article>
  );
}

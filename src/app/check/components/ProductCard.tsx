"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  EllipsisVertical,
  ImageOff,
  Moon,
  Package,
  Pencil,
  Tag,
} from "lucide-react";

import type { CheckType, Item } from "../types";
import { formatDate } from "../utils";
import styles from "../page.module.css";

type ProductCardProps = {
  item: Item;
  type: CheckType;
  missedCheck: boolean;
  editReturnUrl: string;
  swipeOffset: number;
  children: ReactNode;
};

const icons = {
  sticker: Tag,
  overdue: ClipboardCheck,
  monthly: CalendarDays,
  evening: Moon,
  stock: Package,
};

export default function ProductCard({
  item,
  type,
  missedCheck,
  editReturnUrl,
  swipeOffset,
  children,
}: ProductCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const Icon = icons[type];

  return (
    <article
      className={styles.productCard}
      style={{
        transform: `translateX(${swipeOffset * 0.35}px)`,
        transition: swipeOffset === 0 ? "transform 0.18s ease-out" : "none",
      }}
    >
      <div className={styles.productHeader}>
        <div className={styles.productIcon}>
          <Icon size={21} />
        </div>

        <div className={styles.productInfo}>
          <span className={styles.productEyebrow}>Huidig product</span>

          <h2 className={styles.productName}>{item.name}</h2>

          <p className={styles.productCategory}>{item.category_name}</p>
        </div>

        <div className={styles.productMenuWrapper}>
          <button
            type="button"
            className={styles.productMenuButton}
            aria-label="Productopties"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <EllipsisVertical size={21} />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                className={styles.menuBackdrop}
                aria-label="Menu sluiten"
                onClick={() => setMenuOpen(false)}
              />

              <div className={styles.productMenu}>
                <Link
                  href={`/stockchecker/${item.id}?returnTo=${encodeURIComponent(
                    editReturnUrl,
                  )}`}
                  className={styles.productMenuItem}
                >
                  <Pencil size={17} />
                  Product bewerken
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.productImageContainer}>
        {item.photo_url && !imageFailed ? (
          <img
            key={item.photo_url}
            src={item.photo_url}
            alt={item.name}
            className={styles.productImage}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={styles.productImagePlaceholder}>
            <ImageOff size={28} />
            <span>Geen productfoto</span>
          </div>
        )}
      </div>

      {missedCheck && type !== "evening" && (
        <div className={styles.expiredWarning}>
          <AlertTriangle size={19} />

          <div>
            <strong>Vervaldatum verstreken</strong>
            <span>Vorige vervaldatum: {formatDate(item.expiry_date)}</span>
          </div>
        </div>
      )}

      <div className={styles.productContent}>{children}</div>
    </article>
  );
}

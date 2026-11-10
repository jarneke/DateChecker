"use client";

import { createContext, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  EllipsisVertical,
  ImageOff,
  Pencil,
} from "lucide-react";

import CheckTileGlass from "@/components/home/CheckTileGlass";
import glass from "@/components/home/DateCheckGlass.module.css";
import PhotoViewer from "@/components/PhotoViewer";

import type { CheckType, Item } from "../types";
import { formatDate } from "../utils";
import styles from "../page.module.css";
import compact from "./ProductCard.module.css";

export const ProductSummaryContext = createContext<ReactNode>(null);

type ProductCardProps = {
  item: Item;
  type: CheckType;
  missedCheck: boolean;
  editReturnUrl: string;
  swipeOffset: number;
  children: ReactNode;
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
  const menuId = useId();

  const isPickup = type === "evening" || type === "monthly-pickup";

  const summary = (
    <>
      <div className={compact.header}>
        <div className={compact.info}>
          <h2 className={compact.name}>{item.name}</h2>
          <p className={compact.category}>{item.category_name}</p>
        </div>

        <div className={compact.photoWrapper} data-glass-photo>
          <div className={compact.photo}>
            {item.photo_url && !imageFailed ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- Existing photo URLs may use external hosts. */}
                <img
                  key={item.photo_url}
                  src={item.photo_url}
                  alt={item.name}
                  className={compact.image}
                  onError={() => setImageFailed(true)}
                />
                <PhotoViewer src={item.photo_url} alt={item.name} />
              </>
            ) : (
              <div className={compact.placeholder}>
                <ImageOff size={26} aria-hidden="true" />
                <span>Geen foto</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className={compact.menuButton}
            aria-label="Productopties"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <CheckTileGlass foreground />
            <EllipsisVertical size={20} aria-hidden="true" />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className={styles.menuBackdrop}
                aria-label="Menu sluiten"
                onClick={() => setMenuOpen(false)}
              />

              <div
                id={menuId}
                className={compact.menu}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setMenuOpen(false);
                  }
                }}
              >
                <CheckTileGlass foreground />
                <Link
                  href={`/stockchecker/${item.id}?returnTo=${encodeURIComponent(
                    editReturnUrl,
                  )}`}
                  className={styles.productMenuItem}
                >
                  <Pencil size={17} aria-hidden="true" />
                  Product bewerken
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {missedCheck && !isPickup && (
        <div className={styles.expiredWarning}>
          <AlertTriangle size={19} aria-hidden="true" />
          <div>
            <strong>Vervaldatum verstreken</strong>
            <span>Vorige vervaldatum: {formatDate(item.expiry_date)}</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <article
      className={`${styles.productCard} ${glass.surface}`}
      style={{
        transform: `translateX(${swipeOffset * 0.35}px)`,
        transition: swipeOffset === 0 ? "transform 0.18s ease-out" : "none",
      }}
    >
      <CheckTileGlass className={glass.marker} />
      <ProductSummaryContext.Provider value={summary}>
        <div className={styles.productContent}>{children}</div>
      </ProductSummaryContext.Provider>
    </article>
  );
}

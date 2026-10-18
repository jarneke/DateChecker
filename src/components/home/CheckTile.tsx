import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import styles from "./CheckTile.module.css";

export type TileTone = "morning" | "overdue" | "monthly" | "evening" | "stock";

type CheckTileProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: TileTone;
  href: string;
  count?: number | null;
  disabled?: boolean;
  notice?: string;
  wide?: boolean;
};

export default function CheckTile({
  title,
  description,
  icon: Icon,
  tone,
  href,
  count,
  disabled = false,
  notice,
  wide = false,
}: CheckTileProps) {
  const className = [
    styles.tile,
    styles[tone],
    wide ? styles.wide : "",
    disabled ? styles.disabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className={styles.top}>
        <span className={styles.icon}>
          <Icon size={25} strokeWidth={1.9} />
        </span>

        {count !== undefined && count !== null && (
          <span className={styles.count}>{count}</span>
        )}
      </div>

      <div className={styles.body}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className={styles.bottom}>
        {notice ? (
          <span className={styles.notice}>{notice}</span>
        ) : (
          <span className={styles.actionLabel}>
            {disabled ? "Niet beschikbaar" : "Open controle"}
          </span>
        )}

        <span className={styles.arrow}>
          {disabled ? (
            <LockKeyhole size={18} />
          ) : (
            <ArrowUpRight size={21} strokeWidth={2.2} />
          )}
        </span>
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className={className} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

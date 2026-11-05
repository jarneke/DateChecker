"use client";

import Link from "next/link";
import { ArrowUpRight, ImagePlus, Settings2 } from "lucide-react";

import styles from "./page.module.css";

const adminLinks = [
  {
    title: "Instellingen",
    description: "Beheer categorieën, kleuren en controle-instellingen.",
    href: "/admin/settings",
    icon: Settings2,
  },
  {
    title: "Image Linker",
    description: "Voeg ontbrekende foto's toe aan producten.",
    href: "/admin/imagelinker",
    icon: ImagePlus,
  },
];

export default function AdminPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p>Beheer de instellingen en hulpmiddelen van DateCheck.</p>
        </div>

        <div className={styles.links}>
          {adminLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className={styles.card}>
                <div className={styles.cardIcon}>
                  <Icon size={23} />
                </div>

                <div className={styles.cardContent}>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>

                <ArrowUpRight size={21} className={styles.cardArrow} />
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

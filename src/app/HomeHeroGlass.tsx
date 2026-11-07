"use client";

import { useRef, type ReactNode } from "react";
import { useSharedGlass } from "@/components/home/useSharedGlass";
import styles from "./HomeHero.module.css";

export default function HomeHeroGlass({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useSharedGlass(canvasRef, true);

  return (
    <section className={styles.hero} aria-labelledby="today-overview-title">
      <canvas ref={canvasRef} className={styles.photo} aria-hidden="true" />
      {children}
    </section>
  );
}

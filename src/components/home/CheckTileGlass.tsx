"use client";

import { useRef } from "react";
import { useSharedGlass } from "./useSharedGlass";
import styles from "./CheckTileGlass.module.css";

export default function CheckTileGlass({
  className,
  foreground = false,
}: {
  className?: string;
  foreground?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useSharedGlass(canvasRef, false, foreground);

  const canvasClassName = foreground
    ? [styles.foreground, className].filter(Boolean).join(" ")
    : className;

  return (
    <canvas ref={canvasRef} className={canvasClassName} aria-hidden="true" />
  );
}

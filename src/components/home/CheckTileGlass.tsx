"use client";

import { useRef } from "react";
import { useSharedGlass } from "./useSharedGlass";

export default function CheckTileGlass({ className }: { className: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useSharedGlass(canvasRef);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

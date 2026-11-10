"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";

import CheckTileGlass from "./home/CheckTileGlass";
import styles from "./PhotoViewer.module.css";

type Point = { x: number; y: number };
type View = Point & { scale: number };

type PhotoViewerProps = {
  src: string;
  alt: string;
};

type PhotoDialogProps = PhotoViewerProps & {
  onDismiss: () => void;
};

const CENTER: Point = { x: 0, y: 0 };
const INITIAL_VIEW: View = { ...CENTER, scale: 1 };
const MAX_SCALE = 5;
const ZOOM_STEP = 1.5;
const PAN_STEP = 48;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function midpoint(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function distance(first: Point, second: Point) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function stopTouchPropagation(event: TouchEvent<HTMLDialogElement>) {
  event.stopPropagation();
}

function PhotoDialog({ src, alt, onDismiss }: PhotoDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [failed, setFailed] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(4 / 3);
  const backdropPress = useRef(false);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    closeButtonRef.current?.focus();

    return () => dialog.close();
  }, []);

  useLayoutEffect(() => {
    dialogRef.current?.dispatchEvent(new Event("datecheck:glass-photo-moved"));
  }, [aspectRatio, view]);

  function isBackdropEvent(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return false;

    const rect = event.currentTarget.getBoundingClientRect();

    return (
      event.clientX < rect.left ||
      event.clientX >= rect.right ||
      event.clientY < rect.top ||
      event.clientY >= rect.bottom
    );
  }

  function updateView(factor: number, from: Point, to: Point) {
    const viewport = viewportRef.current;
    const image = imageRef.current;

    if (!viewport || !image?.naturalWidth || !image.naturalHeight) return;

    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const fit = Math.min(
      width / image.naturalWidth,
      height / image.naturalHeight,
    );
    const fittedWidth = image.naturalWidth * fit;
    const fittedHeight = image.naturalHeight * fit;

    setView((current) => {
      const scale = clamp(current.scale * factor, 1, MAX_SCALE);
      const ratio = scale / current.scale;
      const maxX = Math.max(0, (fittedWidth * scale - width) / 2);
      const maxY = Math.max(0, (fittedHeight * scale - height) / 2);

      return {
        scale,
        x: clamp(to.x - (from.x - current.x) * ratio, -maxX, maxX),
        y: clamp(to.y - (from.y - current.y) * ratio, -maxY, maxY),
      };
    });
  }

  function pointerPosition(event: PointerEvent<HTMLDivElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - bounds.left - bounds.width / 2,
      y: event.clientY - bounds.top - bounds.height / 2,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || pointers.current.size >= 2) return;

    pointers.current.set(event.pointerId, pointerPosition(event));
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;

    const next = pointerPosition(event);
    pointers.current.set(event.pointerId, next);

    if (pointers.current.size === 1) {
      updateView(1, previous, next);
      return;
    }

    for (const [pointerId, other] of pointers.current) {
      if (pointerId === event.pointerId) continue;

      const previousDistance = distance(previous, other);
      if (previousDistance === 0) return;

      updateView(
        distance(next, other) / previousDistance,
        midpoint(previous, other),
        midpoint(next, other),
      );
      return;
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const offsets: Record<string, Point> = {
      ArrowLeft: { x: PAN_STEP, y: 0 },
      ArrowRight: { x: -PAN_STEP, y: 0 },
      ArrowUp: { x: 0, y: PAN_STEP },
      ArrowDown: { x: 0, y: -PAN_STEP },
    };
    const offset = offsets[event.key];

    if (!offset) return;

    event.preventDefault();
    updateView(1, CENTER, offset);
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      style={{ "--photo-aspect": aspectRatio } as CSSProperties}
      aria-labelledby={titleId}
      onPointerDown={(event) => {
        backdropPress.current = isBackdropEvent(event);
      }}
      onClick={(event) => {
        if (backdropPress.current && isBackdropEvent(event)) onDismiss();
        backdropPress.current = false;
      }}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onTouchStart={stopTouchPropagation}
      onTouchMove={stopTouchPropagation}
      onTouchEnd={stopTouchPropagation}
      onTouchCancel={stopTouchPropagation}
    >
      <div className={styles.panel} data-glass-photo>
        <h2 id={titleId} className={styles.title}>
          {alt || "Foto"}
        </h2>

        <button
          ref={closeButtonRef}
          type="button"
          className={`${styles.control} ${styles.close}`}
          aria-label="Foto sluiten"
          onClick={onDismiss}
        >
          <CheckTileGlass foreground />
          <X size={21} aria-hidden="true" />
        </button>

        <div
          ref={viewportRef}
          className={styles.viewport}
          data-zoomed={view.scale > 1}
          tabIndex={0}
          role="group"
          aria-label="Foto. Gebruik de pijltjestoetsen om ingezoomd te bewegen."
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onLostPointerCapture={handlePointerEnd}
        >
          {failed ? (
            <p role="status">De foto kon niet geladen worden.</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- Use the original photo at full resolution.
            <img
              ref={imageRef}
              src={src}
              alt={alt}
              draggable={false}
              className={styles.image}
              style={{
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              }}
              onLoad={(event) => {
                const image = event.currentTarget;
                setAspectRatio(image.naturalWidth / image.naturalHeight);
              }}
              onError={() => setFailed(true)}
            />
          )}
        </div>

        <div
          className={styles.controls}
          role="group"
          aria-label="Zoom bedienen"
        >
          <CheckTileGlass foreground />

          <button
            type="button"
            className={styles.control}
            aria-label="Uitzoomen"
            disabled={failed || view.scale <= 1}
            onClick={() => updateView(1 / ZOOM_STEP, CENTER, CENTER)}
          >
            <Minus size={19} aria-hidden="true" />
          </button>

          <span className={styles.zoomLevel}>
            {Math.round(view.scale * 100)}%
          </span>

          <button
            type="button"
            className={styles.control}
            aria-label="Inzoomen"
            disabled={failed || view.scale >= MAX_SCALE}
            onClick={() => updateView(ZOOM_STEP, CENTER, CENTER)}
          >
            <Plus size={19} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={styles.control}
            aria-label="Zoom herstellen"
            disabled={failed || view.scale <= 1}
            onClick={() => setView(INITIAL_VIEW)}
          >
            <RotateCcw size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default function PhotoViewer({ src, alt }: PhotoViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label={alt ? `Vergroot foto: ${alt}` : "Foto vergroten"}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.currentTarget.focus();
          setOpen(true);
        }}
      >
        <CheckTileGlass foreground />
        <Maximize2 size={15} aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <PhotoDialog src={src} alt={alt} onDismiss={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}

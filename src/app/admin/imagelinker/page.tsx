"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImageOff,
  ImagePlus,
  LoaderCircle,
  PackageX,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import styles from "./page.module.css";

type Product = {
  id: string;
  name: string;
};

type UploadResponse = {
  url?: string;
  images?: {
    url: string;
    path?: string;
  }[];
  error?: string;
};

const SESSION_KEY = "datecheck:imagelinker:skipped";

function getSkippedIds(): string[] {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const maxSize = 1280;

    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

    const width = Math.max(1, Math.round(bitmap.width * scale));

    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Afbeelding kon niet verwerkt worden.");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Afbeelding kon niet gecomprimeerd worden."));
          }
        },
        "image/webp",
        0.8,
      );
    });

    return new File([blob], `${crypto.randomUUID()}.webp`, {
      type: "image/webp",
    });
  } finally {
    bitmap.close();
  }
}

export default function ImageLinkerPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const loadProduct = useCallback(async (excludedIds: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (excludedIds.length > 0) {
        params.set("exclude", excludedIds.join(","));
      }

      const url = `/api/image-linker${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Producten konden niet geladen worden.");
      }

      const data: {
        product: Product | null;
        remaining: number;
      } = await response.json();

      setProduct(data.product ?? null);
      setRemaining(data.remaining);
    } catch (err) {
      console.error(err);
      setError("Producten konden niet geladen worden.");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = getSkippedIds();
    setSkippedIds(saved);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    void loadProduct(skippedIds);
  }, [initialized, skippedIds, loadProduct]);

  function handleSkip() {
    if (!product || uploading) return;

    const updated = [...new Set([...skippedIds, product.id])];

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Overslaan kon niet bewaard worden:", err);
    }

    setSkippedIds(updated);
    setProduct(null);
  }

  function handleResetSkipped() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      console.error("Overslagen producten konden niet gereset worden:", err);
    }

    setSkippedIds([]);
    setProduct(null);
  }

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !product || uploadingRef.current) {
      return;
    }

    uploadingRef.current = true;
    setUploading(true);
    setError(null);

    const productId = product.id;

    try {
      const compressedFile = await compressImage(file);

      const formData = new FormData();
      formData.append("files", compressedFile);

      const uploadResponse = await fetch("/api/github-upload", {
        method: "PUT",
        body: formData,
      });

      const uploadData: UploadResponse = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData.error || "Foto kon niet naar GitHub geüpload worden.",
        );
      }

      const imageUrl = uploadData.images?.[0]?.url ?? uploadData.url;

      if (!imageUrl) {
        throw new Error("GitHub gaf geen afbeeldings-URL terug.");
      }

      const saveResponse = await fetch(`/api/items/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photo_url: imageUrl,
        }),
      });

      if (!saveResponse.ok) {
        const data = await saveResponse.json().catch(() => null);

        throw new Error(data?.error || "Foto kon niet opgeslagen worden.");
      }

      await loadProduct(skippedIds);
    } catch (err) {
      console.error("ImageLinker upload error:", err);

      setError(
        err instanceof Error ? err.message : "Foto kon niet opgeslagen worden.",
      );
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/admin" className={styles.backLink}>
          <ArrowLeft size={20} />
          Terug
        </Link>

        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <ImagePlus size={26} />
          </div>

          <h1>ImageLinker</h1>

          <p>
            Neem een foto van het product. De foto wordt automatisch opgeslagen
            in GitHub en DateCheck.
          </p>
        </header>

        <div className={styles.remainingCard}>
          <div className={styles.remainingIcon}>
            <ImageOff size={23} />
          </div>

          <div className={styles.remainingText}>
            <span>Nog zonder foto</span>

            <strong>
              {remaining === null
                ? "Laden..."
                : `${remaining} ${remaining === 1 ? "product" : "producten"}`}
            </strong>
          </div>

          <div className={styles.remainingCount}>{remaining ?? "—"}</div>
        </div>

        {skippedIds.length > 0 && (
          <div className={styles.skippedInfo}>
            <PackageX size={19} />

            <span>
              <strong>{skippedIds.length}</strong>{" "}
              {skippedIds.length === 1
                ? "product overgeslagen"
                : "producten overgeslagen"}{" "}
              tijdens deze sessie.
            </span>
          </div>
        )}

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        <section className={styles.card}>
          {loading ? (
            <div className={styles.loadingState}>
              <LoaderCircle size={30} className={styles.spinner} />
              <span>Product laden...</span>
            </div>
          ) : product ? (
            <>
              <div className={styles.productHeader}>
                <div className={styles.productIcon}>
                  <ImageOff size={27} />
                </div>

                <div className={styles.productInfo}>
                  <span className={styles.productLabel}>
                    PRODUCT ZONDER FOTO
                  </span>
                  <h2>{product.name}</h2>
                </div>
              </div>

              <div className={styles.placeholder}>
                <div className={styles.placeholderIcon}>
                  {uploading ? (
                    <LoaderCircle size={35} className={styles.spinner} />
                  ) : (
                    <Camera size={36} />
                  )}
                </div>

                <span>
                  {uploading
                    ? "Foto verwerken en opslaan..."
                    : "Nog geen afbeelding beschikbaar"}
                </span>
              </div>

              <p className={styles.instructions}>
                Neem een foto van dit product. Is het product momenteel niet in
                voorraad? Sla het dan tijdelijk over.
              </p>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.hiddenInput}
                onChange={(event) => void handlePhoto(event)}
                disabled={uploading}
              />

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <LoaderCircle size={21} className={styles.spinner} />
                      Foto opslaan...
                    </>
                  ) : (
                    <>
                      <Camera size={21} />
                      Foto nemen
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleSkip}
                  disabled={uploading}
                >
                  <PackageX size={20} />
                  Geen voorraad — overslaan
                  <ArrowRight size={18} className={styles.buttonArrow} />
                </button>
              </div>
            </>
          ) : error ? (
            <div className={styles.errorState}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void loadProduct(skippedIds)}
              >
                <RefreshCw size={19} />
                Opnieuw proberen
              </button>
            </div>
          ) : (
            <div className={styles.completeState}>
              <div className={styles.completeIcon}>
                <CheckCircle2 size={38} />
              </div>

              <h2>Geen producten meer</h2>

              <p>
                {skippedIds.length > 0
                  ? "Alle overige producten hebben een foto of zijn tijdens deze sessie overgeslagen."
                  : "Alle producten hebben een afbeelding."}
              </p>

              {skippedIds.length > 0 && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleResetSkipped}
                >
                  <RotateCcw size={19} />
                  Overgeslagen producten opnieuw bekijken
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import Script from "next/script";
import { ArrowLeft, Camera, ScanText } from "lucide-react";

import styles from "./page.module.css";

type Category = {
  id: string;
  name: string;
};

type OcrWorker = {
  recognize: (image: Blob) => Promise<{
    data: { text: string };
  }>;
  terminate: () => Promise<unknown>;
};

type OcrLibrary = {
  createWorker: (
    language: string,
    engine: number,
    options: {
      logger: (message: { status: string; progress: number }) => void;
    },
  ) => Promise<OcrWorker>;
};

function chooseProductName(text: string): string {
  const candidates = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|_~]/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => {
      const letters = line.match(/\p{L}/gu)?.length ?? 0;

      if (letters < 3) return false;

      return !/€|\beur\b|\b(?:prijs|korting|houdbaar|barcode|artikelnummer|ean|www|http)\b/i.test(
        line,
      );
    })
    .map((line) => {
      const letters = line.match(/\p{L}/gu)?.length ?? 0;
      const digits = line.match(/\d/g)?.length ?? 0;
      const words = line.split(/\s+/).length;

      return {
        line,
        score:
          Math.min(letters, 45) +
          Math.min(words, 6) * 3 -
          digits * 2 -
          (line.length > 85 ? 30 : 0),
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.line.toUpperCase() ?? "";
}

async function prepareImage(file: File, maxSize: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("Deze foto kon niet gelezen worden."));
      image.src = url;
    });

    const scale = Math.min(
      1,
      maxSize / Math.max(image.naturalWidth, image.naturalHeight),
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("De foto kon niet verwerkt worden.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("De foto kon niet verwerkt worden."));
          }
        },
        "image/jpeg",
        0.9,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AddProductsPage() {
  const productInput = useRef<HTMLInputElement>(null);
  const labelInput = useRef<HTMLInputElement>(null);
  const workerPromise = useRef<Promise<OcrWorker> | null>(null);
  const operationLock = useRef(false);
  const mounted = useRef(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [daily, setDaily] = useState(true);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [ocrReady, setOcrReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const busy = loading || working;

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Categorieën konden niet geladen worden.");
        }

        const data = (await response.json()) as Category[];

        if (!controller.signal.aborted) {
          setCategories(data);
          setCategoryId(data[0]?.id ?? "");
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Categorieën konden niet geladen worden.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadCategories();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(photo);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      const pending = workerPromise.current;
      workerPromise.current = null;

      if (pending) {
        void pending
          .then((worker) => worker.terminate())
          .catch(() => undefined);
      }
    };
  }, []);

  function getWorker(): Promise<OcrWorker> {
    if (workerPromise.current) return workerPromise.current;

    const library = (window as unknown as { Tesseract?: OcrLibrary }).Tesseract;

    if (!library) {
      throw new Error("Tekstherkenning is nog niet geladen. Probeer opnieuw.");
    }

    const pending = library.createWorker("nld+eng", 1, {
      logger: (message) => {
        if (mounted.current && message.status === "recognizing text") {
          setProgress(`Etiket lezen… ${Math.round(message.progress * 100)}%`);
        }
      },
    });

    workerPromise.current = pending;

    void pending.catch(() => {
      if (workerPromise.current === pending) {
        workerPromise.current = null;
      }
    });

    return pending;
  }

  async function handleProductPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || operationLock.current) return;

    operationLock.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    setProgress("Productfoto verwerken…");

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Kies een geldige foto.");
      }

      const prepared = await prepareImage(file, 1280);

      if (mounted.current) {
        setPhoto(prepared);
        setUploadedPhotoUrl("");
      }
    } catch (cause) {
      if (mounted.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "De productfoto kon niet verwerkt worden.",
        );
      }
    } finally {
      operationLock.current = false;

      if (mounted.current) {
        setWorking(false);
        setProgress("");
      }
    }
  }

  async function handleLabelPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || operationLock.current) return;

    operationLock.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    setName("");
    setProgress("Tekstherkenning voorbereiden…");

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Kies een geldige etiketfoto.");
      }

      const [worker, image] = await Promise.all([
        getWorker(),
        prepareImage(file, 2200),
      ]);

      if (!mounted.current) return;

      setProgress("Etiket lezen…");

      const result = await worker.recognize(image);
      const detectedName = chooseProductName(result.data.text);

      if (!detectedName) {
        throw new Error(
          "Geen productnaam herkend. Neem een scherpere foto van het etiket of vul de naam in.",
        );
      }

      if (mounted.current) {
        setName(detectedName);
        setNotice("Naam ingevuld. Je kunt hem hieronder corrigeren.");
      }
    } catch (cause) {
      if (mounted.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Het etiket kon niet gelezen worden.",
        );
      }
    } finally {
      operationLock.current = false;

      if (mounted.current) {
        setWorking(false);
        setProgress("");
      }
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (operationLock.current || loading) return;

    if (!name.trim() || !categoryId || !photo) {
      setError("Vul een naam en categorie in en neem een productfoto.");
      return;
    }

    operationLock.current = true;
    setWorking(true);
    setError("");
    setNotice("");

    try {
      let photoUrl = uploadedPhotoUrl;

      if (!photoUrl) {
        setProgress("Productfoto opslaan…");

        const formData = new FormData();
        formData.append(
          "file",
          new File([photo], "product.jpg", { type: "image/jpeg" }),
        );

        const uploadResponse = await fetch("/api/github-upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = (await uploadResponse.json()) as {
          url?: string;
        };

        if (!uploadResponse.ok || !uploadData.url) {
          throw new Error(
            "De productfoto kon niet opgeslagen worden. Probeer opnieuw.",
          );
        }

        photoUrl = uploadData.url;

        if (mounted.current) setUploadedPhotoUrl(photoUrl);
      }

      if (mounted.current) setProgress("Product toevoegen…");

      const savedName = name.trim().toUpperCase();
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: savedName,
          photo_url: photoUrl,
          category_id: categoryId,
          expiry_date: "2020-01-01",
          sticker_30_percent: daily,
          paused: false,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(
          data.error || "Het product kon niet toegevoegd worden.",
        );
      }

      if (mounted.current) {
        setName("");
        setPhoto(null);
        setUploadedPhotoUrl("");
        setNotice(`${savedName} is toegevoegd aan je voorraad.`);
      }
    } catch (cause) {
      if (mounted.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Het product kon niet toegevoegd worden.",
        );
      }
    } finally {
      operationLock.current = false;

      if (mounted.current) {
        setWorking(false);
        setProgress("");
      }
    }
  }

  return (
    <main className={styles.page}>
      <Script
        src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"
        strategy="afterInteractive"
        onReady={() => setOcrReady(true)}
        onError={() =>
          setError(
            "Tekstherkenning kon niet geladen worden. Herlaad de pagina of vul de naam handmatig in.",
          )
        }
      />

      <div className={styles.container}>
        <Link href="/admin" className={styles.backLink}>
          <ArrowLeft size={20} />
          Beheer
        </Link>

        <header className={styles.header}>
          <h1>Product toevoegen</h1>
          <p>
            Neem een productfoto en scan het etiket om de naam in te vullen.
          </p>
        </header>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {progress && (
          <p className={styles.notice} role="status" aria-live="polite">
            {progress}
          </p>
        )}

        <form className={styles.card} onSubmit={saveProduct}>
          <fieldset className={styles.fields} disabled={busy}>
            <label className={styles.field}>
              <span>Categorie</span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
              >
                <option value="" disabled>
                  {loading ? "Categorieën laden…" : "Kies een categorie"}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Controle</span>
              <select
                value={daily ? "daily" : "monthly"}
                onChange={(event) => setDaily(event.target.value === "daily")}
              >
                <option value="daily">Dagelijks (30%)</option>
                <option value="monthly">Maandelijks</option>
              </select>
            </label>

            <div className={styles.photoSection}>
              <button
                type="button"
                className={styles.photoButton}
                onClick={() => productInput.current?.click()}
              >
                <Camera size={25} />
                {photo ? "Productfoto wijzigen" : "Productfoto nemen"}
              </button>

              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Productfoto die bij het product wordt bewaard"
                  className={styles.preview}
                />
              )}

              <input
                ref={productInput}
                className={styles.hidden}
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Productfoto kiezen"
                onChange={(event) => void handleProductPhoto(event)}
              />
            </div>

            <div className={styles.scanSection}>
              <button
                type="button"
                className={styles.scanButton}
                disabled={!ocrReady}
                onClick={() => labelInput.current?.click()}
              >
                <ScanText size={25} />
                {ocrReady ? "Etiket scannen" : "Scanner laden…"}
              </button>

              <p>
                Fotografeer het etiket van dichtbij. De naam wordt automatisch
                ingevuld; de etiketfoto wordt niet bewaard.
              </p>

              <input
                ref={labelInput}
                className={styles.hidden}
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Etiket fotograferen"
                onChange={(event) => void handleLabelPhoto(event)}
              />
            </div>

            <label className={styles.field}>
              <span>Productnaam</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Scan het etiket of vul de naam in"
                autoComplete="off"
                required
              />
            </label>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={!photo || !name.trim() || !categoryId}
            >
              Product toevoegen
            </button>
          </fieldset>

          <p className={styles.hint}>
            Toevoegen bewaart het product meteen in je voorraad met 01/01/2020
            als startdatum, zoals bij Snel toevoegen. Categorie en controletype
            blijven geselecteerd voor het volgende product.
          </p>
        </form>
      </div>
    </main>
  );
}

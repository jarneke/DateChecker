"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import Script from "next/script";
import { ArrowLeft, Camera, ScanText } from "lucide-react";

import { prepareImage, scanSlim, type OcrWorker } from "./scan-slim";
import styles from "./page.module.css";

type Category = {
  id: string;
  name: string;
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
  const [scanImage, setScanImage] = useState<Blob | null>(null);
  const [scanPreview, setScanPreview] = useState("");
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
    if (!scanImage) {
      setScanPreview("");
      return;
    }

    const url = URL.createObjectURL(scanImage);
    setScanPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [scanImage]);

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
          setProgress(
            `Naamstrook lezen… ${Math.round(message.progress * 100)}%`,
          );
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
    setScanImage(null);
    setProgress("Etiketscanner voorbereiden…");

    try {
      const result = await scanSlim(
        file,
        getWorker(),
        (message) => {
          if (mounted.current) setProgress(message);
        },
        (image) => {
          if (mounted.current) setScanImage(image);
        },
      );

      if (mounted.current) {
        setName(result.name);
        setNotice(
          "Naam van het etiket ingevuld. Controleer de naam voor je het product toevoegt.",
        );
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
          new File([photo], "product.jpg", {
            type: "image/jpeg",
          }),
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
        headers: {
          "Content-Type": "application/json",
        },
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
        const data = (await response.json()) as {
          error?: string;
        };

        throw new Error(
          data.error || "Het product kon niet toegevoegd worden.",
        );
      }

      if (mounted.current) {
        setName("");
        setPhoto(null);
        setScanImage(null);
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
        src="https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js"
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
            Neem een productfoto en scan het slimmetje om de naam in te vullen.
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
                {ocrReady ? "Slimmetje scannen" : "Scanner laden…"}
              </button>

              <p>
                Fotografeer één volledig slimmetje rechtop en van dichtbij. De
                naamstrook wordt automatisch gezocht.
              </p>

              <input
                ref={labelInput}
                className={styles.hidden}
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Slimmetje fotograferen"
                onChange={(event) => void handleLabelPhoto(event)}
              />

              {scanPreview && (
                <div className={styles.photoSection}>
                  <p>Uitgelezen naamstrook</p>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={scanPreview}
                    alt="Automatisch uitgesneden naamstrook van het slimmetje"
                    className={styles.preview}
                  />
                </div>
              )}
            </div>

            <label className={styles.field}>
              <span>Productnaam</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Scan het slimmetje of vul de naam in"
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
            Alleen de productfoto wordt bij het product opgeslagen. Toevoegen
            bewaart het product meteen in je voorraad met 01/01/2020 als
            startdatum, zoals bij Snel toevoegen. Categorie en controletype
            blijven geselecteerd voor het volgende product.
          </p>
        </form>
      </div>
    </main>
  );
}

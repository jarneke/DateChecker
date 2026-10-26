"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CloudUpload,
  Plus,
  ScanText,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { prepareImage, scanSlim, type OcrWorker } from "./scan-slim";
import styles from "./page.module.css";
import fastStyles from "../../fastadd/page.module.css";

type Category = {
  id: string;
  name: string;
  color?: string;
};

type DraftItem = {
  id: string;
  name: string;
  photo: Blob | null;
  categoryId: string;
  sticker30Percent: boolean;
  createdAt: number;
  uploadedPhotoUrl?: string;
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

type BatchResponse = {
  inserted?: {
    id: string;
    name: string;
  }[];
  skippedNames?: string[];
  error?: string;
};

const DB_NAME = "datechecker-slim-fastadd";
const STORE_NAME = "items";
const MAX_ITEMS = 250;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };

    request.onerror = () => {
      reject(
        request.error ?? new Error("De lokale lijst kon niet geopend worden."),
      );
    };
  });
}

async function readDraft(): Promise<DraftItem[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    transaction.oncomplete = () => {
      database.close();

      const items = request.result as DraftItem[];
      resolve(items.sort((a, b) => a.createdAt - b.createdAt));
    };

    transaction.onabort = () => {
      database.close();

      reject(
        transaction.error ??
          new Error("De lokale lijst kon niet gelezen worden."),
      );
    };
  });
}

async function changeDraft(
  savedItems: DraftItem[],
  deletedIds: string[] = [],
): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    for (const item of savedItems) {
      store.put(item);
    }

    for (const id of deletedIds) {
      store.delete(id);
    }

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onabort = () => {
      database.close();

      reject(
        transaction.error ??
          new Error("De lokale lijst kon niet opgeslagen worden."),
      );
    };
  });
}

function useBlobPreview(blob: Blob | null): string {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!blob) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(blob);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return preview;
}

function CategoryDot({
  color,
  className,
}: {
  color?: string;
  className: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="6" cy="6" r="6" fill={color || "#a3e635"} />
    </svg>
  );
}

function QueuedProduct({
  item,
  category,
  disabled,
  onRemove,
}: {
  item: DraftItem;
  category?: Category;
  disabled: boolean;
  onRemove: (id: string) => void;
}) {
  const preview = useBlobPreview(item.photo);

  return (
    <div className={fastStyles.listItem} role="listitem">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={item.name} className={fastStyles.listPhoto} />
      ) : (
        <div className={fastStyles.listPlaceholder}>
          <Camera size={23} />
        </div>
      )}

      <div className={fastStyles.listDetails}>
        <p className={fastStyles.listName}>{item.name}</p>

        <div className={fastStyles.listMeta}>
          <CategoryDot className={fastStyles.metaDot} color={category?.color} />
          <span>{category?.name || "Onbekende categorie"}</span>
        </div>

        <div className={fastStyles.listMeta}>
          <Tag size={13} color="var(--dc-accent)" />
          <span>
            {item.sticker30Percent ? "Dagelijks (30%)" : "Maandelijks"}
          </span>
        </div>
      </div>

      <button
        type="button"
        className={fastStyles.removeItem}
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        aria-label={`${item.name} uit de lijst verwijderen`}
      >
        <Trash2 size={19} />
      </button>
    </div>
  );
}

export default function AddProductsPage() {
  const productInput = useRef<HTMLInputElement>(null);
  const labelInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const workerPromise = useRef<Promise<OcrWorker> | null>(null);
  const operationLock = useRef(false);
  const mounted = useRef(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [daily, setDaily] = useState(true);
  const [items, setItems] = useState<DraftItem[]>([]);

  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [scanImage, setScanImage] = useState<Blob | null>(null);

  const [loading, setLoading] = useState(true);
  const [draftReady, setDraftReady] = useState(false);
  const [ocrReady, setOcrReady] = useState(false);
  const [working, setWorking] = useState(false);

  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const preview = useBlobPreview(photo);
  const scanPreview = useBlobPreview(scanImage);
  const busy = loading || working || !draftReady;

  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const [response, storedItems] = await Promise.all([
          fetch("/api/categories", {
            signal: controller.signal,
          }),
          readDraft(),
        ]);

        if (!response.ok) {
          throw new Error("Categorieën konden niet geladen worden.");
        }

        const loadedCategories = (await response.json()) as Category[];

        if (controller.signal.aborted) return;

        setCategories(loadedCategories);
        setCategoryId(loadedCategories[0]?.id ?? "");
        setItems(storedItems);
        setDraftReady(true);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "De gegevens konden niet geladen worden.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, []);

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

  function startOperation(message: string): boolean {
    if (busy || operationLock.current) return false;

    operationLock.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    setProgress(message);

    return true;
  }

  function finishOperation() {
    operationLock.current = false;

    if (mounted.current) {
      setWorking(false);
      setProgress("");
    }
  }

  function showError(cause: unknown, fallback: string) {
    if (mounted.current) {
      setError(cause instanceof Error ? cause.message : fallback);
    }
  }

  async function handleProductPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !startOperation("Productfoto verwerken…")) return;

    try {
      const prepared = await prepareImage(file, 1280);

      if (mounted.current) {
        setPhoto(prepared);
      }
    } catch (cause) {
      showError(cause, "De productfoto kon niet verwerkt worden.");
    } finally {
      finishOperation();
    }
  }

  function removeProductPhoto() {
    if (busy || operationLock.current) return;

    setPhoto(null);

    if (productInput.current) {
      productInput.current.value = "";
    }
  }

  async function handleLabelPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !startOperation("Etiketscanner voorbereiden…")) return;

    setName("");
    setScanImage(null);

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
        setNotice("Naam ingevuld. Je kunt hem hieronder corrigeren.");
      }
    } catch (cause) {
      showError(cause, "Het slimmetje kon niet gelezen worden.");
    } finally {
      finishOperation();
    }
  }

  async function addToList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || operationLock.current) return;

    const trimmedName = name.trim().toUpperCase();

    if (!trimmedName) {
      setError("Geef eerst een productnaam in of scan het slimmetje.");
      nameInput.current?.focus();
      return;
    }

    if (!categoryId) {
      setError("Selecteer eerst een categorie.");
      return;
    }

    if (items.length >= MAX_ITEMS) {
      setError(
        `Upload eerst de huidige lijst. Je kunt maximaal ${MAX_ITEMS} producten tegelijk verzamelen.`,
      );
      return;
    }

    if (items.some((item) => item.name === trimmedName)) {
      setError("Dit product staat al in de huidige lijst.");
      nameInput.current?.focus();
      return;
    }

    if (!startOperation("Product aan de lijst toevoegen…")) return;

    try {
      const item: DraftItem = {
        id: crypto.randomUUID(),
        name: trimmedName,
        photo,
        categoryId,
        sticker30Percent: daily,
        createdAt: Date.now(),
      };

      await changeDraft([item]);

      if (mounted.current) {
        setItems((current) => [...current, item]);
        setName("");
        setPhoto(null);
        setScanImage(null);
        setNotice(`${trimmedName} staat in de lokale lijst.`);
      }
    } catch (cause) {
      showError(cause, "Het product kon niet aan de lijst toegevoegd worden.");
    } finally {
      finishOperation();
    }
  }

  async function removeFromList(id: string) {
    if (!startOperation("Product uit de lijst verwijderen…")) return;

    try {
      await changeDraft([], [id]);

      if (mounted.current) {
        setItems((current) => current.filter((item) => item.id !== id));
      }
    } catch (cause) {
      showError(cause, "Het product kon niet uit de lijst verwijderd worden.");
    } finally {
      finishOperation();
    }
  }

  async function clearList() {
    if (busy || operationLock.current || items.length === 0) return;

    const confirmed = window.confirm(
      `Weet je zeker dat je alle ${items.length} producten uit deze lokale lijst wilt verwijderen?`,
    );

    if (!confirmed || !startOperation("Lijst wissen…")) return;

    try {
      await changeDraft(
        [],
        items.map((item) => item.id),
      );

      if (mounted.current) {
        setItems([]);
        setNotice("De lokale lijst is gewist.");
      }
    } catch (cause) {
      showError(cause, "De lokale lijst kon niet gewist worden.");
    } finally {
      finishOperation();
    }
  }

  async function uploadPhoto(item: DraftItem): Promise<string> {
    if (item.uploadedPhotoUrl) return item.uploadedPhotoUrl;

    if (!item.photo) {
      throw new Error("Dit product heeft geen foto om te uploaden.");
    }

    const formData = new FormData();

    formData.append(
      "file",
      new File([item.photo], `${item.id}.jpg`, {
        type: item.photo.type || "image/jpeg",
      }),
    );

    const response = await fetch("/api/github-upload", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as {
      url?: string;
      error?: string;
    };

    if (!response.ok || !data.url) {
      throw new Error(
        data.error || `De foto van ${item.name} kon niet geüpload worden.`,
      );
    }

    return data.url;
  }

  async function uploadList() {
    if (busy || operationLock.current) return;

    if (items.length === 0) {
      setError("Er staan nog geen producten in de lijst.");
      return;
    }

    if (!startOperation("Upload voorbereiden…")) return;

    const uploadingItems = [...items];

    try {
      for (let index = 0; index < uploadingItems.length; index++) {
        const item = uploadingItems[index];

        if (!item.photo || item.uploadedPhotoUrl) continue;

        if (mounted.current) {
          setProgress(
            `Productfoto uploaden… ${index + 1}/${uploadingItems.length}`,
          );
        }

        const uploadedPhotoUrl = await uploadPhoto(item);
        const updatedItem = { ...item, uploadedPhotoUrl };

        await changeDraft([updatedItem]);
        uploadingItems[index] = updatedItem;

        if (mounted.current) {
          setItems([...uploadingItems]);
        }
      }

      if (mounted.current) {
        setProgress("Producten toevoegen aan DateCheck…");
      }

      const response = await fetch("/api/items/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: uploadingItems.map((item) => ({
            name: item.name,
            photo_url: item.uploadedPhotoUrl ?? null,
            category_id: item.categoryId,
            sticker_30_percent: item.sticker30Percent,
          })),
        }),
      });

      const data = (await response.json()) as BatchResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "De producten konden niet toegevoegd worden.",
        );
      }

      const insertedNames = new Set(
        (data.inserted ?? []).map((item) => item.name.trim().toUpperCase()),
      );

      const skippedNames = new Set(
        (data.skippedNames ?? []).map((item) => item.trim().toUpperCase()),
      );

      const completed = uploadingItems.filter(
        (item) => insertedNames.has(item.name) || skippedNames.has(item.name),
      );

      const remaining = uploadingItems.filter(
        (item) => !insertedNames.has(item.name) && !skippedNames.has(item.name),
      );

      if (completed.length === 0) {
        throw new Error(
          "De server heeft geen producten bevestigd. De lokale lijst is behouden.",
        );
      }

      await changeDraft(
        [],
        completed.map((item) => item.id),
      );

      const insertedCount = completed.filter((item) =>
        insertedNames.has(item.name),
      ).length;

      const skippedCount = completed.filter(
        (item) => !insertedNames.has(item.name) && skippedNames.has(item.name),
      ).length;

      if (mounted.current) {
        setItems(remaining);

        setNotice(
          `${insertedCount} product${insertedCount === 1 ? "" : "en"} toegevoegd.${
            skippedCount > 0
              ? ` ${skippedCount} overgeslagen omdat ze al bestaan.`
              : ""
          }${
            remaining.length > 0
              ? ` ${remaining.length} niet bevestigd en in de lijst behouden.`
              : ""
          }`,
        );
      }
    } catch (cause) {
      showError(
        cause,
        "De upload is niet voltooid. Je lokale lijst is behouden.",
      );
    } finally {
      finishOperation();
    }
  }

  return (
    <main className={fastStyles.page}>
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

      <div className={fastStyles.container}>
        <Link href="/admin" className={fastStyles.backLink}>
          <ArrowLeft size={20} />
          Terug
        </Link>

        <header className={fastStyles.header}>
          <h1>Snel toevoegen</h1>
          <p>
            Voeg meerdere producten toe en upload ze in één keer naar DateCheck.
          </p>
        </header>

        {error && (
          <div
            className={`${fastStyles.message} ${fastStyles.error}`}
            role="alert"
          >
            {error}
          </div>
        )}

        {notice && !error && (
          <div className={fastStyles.message} role="status">
            {notice}
          </div>
        )}

        {progress && (
          <div className={fastStyles.message} role="status" aria-live="polite">
            {progress}
          </div>
        )}

        <form className={fastStyles.card} onSubmit={addToList}>
          <div className={fastStyles.cardHeader}>
            <div className={fastStyles.cardIcon}>
              <Tag size={22} />
            </div>

            <div className={fastStyles.cardHeading}>
              <h2>Product toevoegen</h2>
              <p>Vul de gegevens in en voeg het product toe aan de lijst.</p>
            </div>
          </div>

          <fieldset
            className={`${fastStyles.fields} ${styles.fields}`}
            disabled={busy}
          >
            <div className={fastStyles.field}>
              <label htmlFor="slim-category">Categorie</label>

              <div className={fastStyles.selectWrapper}>
                {selectedCategory && (
                  <CategoryDot
                    className={fastStyles.categoryDot}
                    color={selectedCategory.color}
                  />
                )}

                <select
                  id="slim-category"
                  className={selectedCategory ? fastStyles.withDot : ""}
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={busy || categories.length === 0}
                  required
                >
                  {categories.length === 0 && (
                    <option value="">
                      {loading ? "Categorieën laden…" : "Geen categorieën"}
                    </option>
                  )}

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <ChevronDown size={19} className={fastStyles.selectChevron} />
              </div>
            </div>

            <div className={fastStyles.field}>
              <span className={fastStyles.fieldLabel}>Controle</span>

              <div
                className={fastStyles.checkOptions}
                role="group"
                aria-label="Controle"
              >
                <button
                  type="button"
                  className={`${fastStyles.checkOption} ${
                    daily ? fastStyles.checkOptionActive : ""
                  }`}
                  onClick={() => setDaily(true)}
                  aria-pressed={daily}
                >
                  {daily && <CheckCircle2 size={17} />}
                  Dagelijks (30%)
                </button>

                <button
                  type="button"
                  className={`${fastStyles.checkOption} ${
                    !daily ? fastStyles.checkOptionActive : ""
                  }`}
                  onClick={() => setDaily(false)}
                  aria-pressed={!daily}
                >
                  {!daily && <CheckCircle2 size={17} />}
                  Maandelijks
                </button>
              </div>
            </div>

            <div className={fastStyles.field}>
              <label htmlFor="slim-name">Naam</label>

              <div className={styles.scanner}>
                <button
                  type="button"
                  className={styles.scanButton}
                  disabled={busy || !ocrReady}
                  onClick={() => labelInput.current?.click()}
                >
                  <ScanText size={20} />
                  {ocrReady ? "Slimmetje scannen" : "Scanner laden…"}
                </button>

                <input
                  ref={labelInput}
                  className={fastStyles.hiddenInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  aria-label="Slimmetje fotograferen"
                  onChange={(event) => void handleLabelPhoto(event)}
                />
              </div>

              <input
                ref={nameInput}
                id="slim-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Naam van het product"
                autoComplete="off"
                required
              />

              {scanPreview && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={scanPreview}
                    alt="Uitgelezen naamstrook van het slimmetje"
                    className={styles.scanPreview}
                  />

                  <p className={styles.scanHelp}>
                    Controleer de ingevulde naam. Deze strook wordt niet bij het
                    product opgeslagen.
                  </p>
                </>
              )}
            </div>

            <div className={fastStyles.field}>
              <span className={fastStyles.fieldLabel}>Foto</span>

              <div className={fastStyles.photoArea}>
                <button
                  type="button"
                  className={fastStyles.photoButton}
                  onClick={() => productInput.current?.click()}
                >
                  <Camera size={28} />
                  <span>{photo ? "Foto wijzigen" : "Foto nemen"}</span>
                </button>

                <div className={fastStyles.photoPreview}>
                  {preview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Geselecteerde productfoto" />

                      <button
                        type="button"
                        className={fastStyles.removePhoto}
                        onClick={removeProductPhoto}
                        aria-label="Productfoto verwijderen"
                      >
                        <X size={19} />
                      </button>
                    </>
                  ) : (
                    <div className={styles.photoPlaceholder}>
                      <Camera size={26} />
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={productInput}
                className={fastStyles.hiddenInput}
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Productfoto kiezen"
                onChange={(event) => void handleProductPhoto(event)}
              />
            </div>
          </fieldset>

          <button
            type="submit"
            className={fastStyles.addButton}
            disabled={busy}
          >
            <Plus size={22} />
            Toevoegen aan lijst
          </button>

          <p className={fastStyles.uploadHint}>
            Producten in de lijst worden lokaal bewaard op dit apparaat, in deze
            browser, tot je ze uploadt of zelf verwijdert.
          </p>
        </form>

        <section
          className={`${fastStyles.card} ${fastStyles.listCard}`}
          aria-labelledby="slim-list-heading"
        >
          <div className={fastStyles.listHeader}>
            <div className={fastStyles.cardIcon}>
              <ClipboardList size={22} />
            </div>

            <div className={fastStyles.cardHeading}>
              <h2 id="slim-list-heading">Producten in de lijst</h2>
              <p>Deze producten zijn nog niet toegevoegd aan DateCheck.</p>
            </div>

            <span className={fastStyles.count}>{items.length}</span>
          </div>

          {items.length === 0 ? (
            <div className={fastStyles.emptyList}>
              {loading ? "Producten laden…" : "Nog geen producten toegevoegd."}
            </div>
          ) : (
            <div className={fastStyles.listItems} role="list">
              {items.map((item) => (
                <QueuedProduct
                  key={item.id}
                  item={item}
                  category={categories.find(
                    (category) => category.id === item.categoryId,
                  )}
                  disabled={busy}
                  onRemove={(id) => void removeFromList(id)}
                />
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className={fastStyles.listActions}>
              <button
                type="button"
                className={fastStyles.uploadButton}
                onClick={() => void uploadList()}
                disabled={busy}
              >
                <CloudUpload size={22} />
                Alles uploaden naar DateCheck
              </button>

              <button
                type="button"
                className={fastStyles.clearButton}
                onClick={() => void clearList()}
                disabled={busy}
              >
                <Trash2 size={19} />
                Lijst wissen
              </button>

              <p className={fastStyles.uploadHint}>
                Nieuwe producten krijgen geen datum en tellen als niet in stock.
                Bestaande productnamen worden overgeslagen.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

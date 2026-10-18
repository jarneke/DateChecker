"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CloudUpload,
  LoaderCircle,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import styles from "./page.module.css";

type Category = {
  id: string;
  name: string;
  color?: string;
};

type CheckType = "daily" | "monthly";

type StoredFastAddItem = {
  id: string;
  name: string;
  photo: Blob | null;
  photoName: string;
  photoType: string;
  categoryId: string;
  sticker30Percent: boolean;
  createdAt: number;
};

type FastAddItem = StoredFastAddItem & {
  previewUrl: string;
};

const DB_NAME = "datechecker-fastadd";
const STORE_NAME = "items";
const PAST_EXPIRY_DATE = "2020-01-01";

// --------------------------------------------------
// IndexedDB
// --------------------------------------------------

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function getStoredItems(): Promise<StoredFastAddItem[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");

    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      resolve(
        (request.result as StoredFastAddItem[]).sort(
          (a, b) => a.createdAt - b.createdAt,
        ),
      );
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => db.close();
  });
}

async function saveStoredItem(item: StoredFastAddItem): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).put(item);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function deleteStoredItem(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function clearStoredItems(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// --------------------------------------------------
// Image compression
// --------------------------------------------------

async function compressImage(file: File): Promise<Blob> {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();

      image.onerror = () => {
        reject(new Error("Afbeelding kon niet geladen worden."));
      };

      image.src = objectUrl;
    });

    const maxSize = 1280;

    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));

    const canvas = document.createElement("canvas");

    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Afbeelding kon niet verwerkt worden.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Afbeelding kon niet gecomprimeerd worden."));
          }
        },
        "image/webp",
        0.75,
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// --------------------------------------------------
// Page
// --------------------------------------------------

export default function FastAddPage() {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const itemsRef = useRef<FastAddItem[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedCheckType, setSelectedCheckType] =
    useState<CheckType>("daily");

  const [items, setItems] = useState<FastAddItem[]>([]);

  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const busy = loading || adding || uploading;

  // --------------------------------------------------
  // Initial load
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [categoriesResponse, storedItems] = await Promise.all([
          fetch("/api/categories"),
          getStoredItems(),
        ]);

        if (!categoriesResponse.ok) {
          throw new Error("Categorieën konden niet geladen worden.");
        }

        const loadedCategories =
          (await categoriesResponse.json()) as Category[];

        if (cancelled) return;

        setCategories(loadedCategories);

        if (loadedCategories.length > 0) {
          setSelectedCategoryId(loadedCategories[0].id);
        }

        const restoredItems: FastAddItem[] = storedItems
          .filter(
            (item) =>
              typeof item.categoryId === "string" &&
              typeof item.sticker30Percent === "boolean",
          )
          .map((item) => ({
            ...item,
            previewUrl: item.photo ? URL.createObjectURL(item.photo) : "",
          }));

        setItems(restoredItems);
      } catch (loadError) {
        console.error(loadError);

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gegevens konden niet geladen worden.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      nameInputRef.current?.focus();
    }
  }, [loading]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // --------------------------------------------------
  // Photo selection
  // --------------------------------------------------

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecteer een geldige afbeelding.");
      event.target.value = "";
      return;
    }

    setError("");
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));

    event.target.value = "";
  }

  function handleRemovePhoto() {
    setPhoto(null);
    setPhotoPreview("");

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  // --------------------------------------------------
  // Add product locally
  // --------------------------------------------------

  async function handleAddItem() {
    if (busy) return;

    const trimmedName = name.trim().toUpperCase();

    if (!trimmedName) {
      setError("Geef eerst een productnaam in.");
      nameInputRef.current?.focus();
      return;
    }

    if (!selectedCategoryId) {
      setError("Selecteer eerst een categorie.");
      return;
    }

    if (items.some((item) => item.name.toUpperCase() === trimmedName)) {
      setError("Dit product staat al in de huidige lijst.");
      nameInputRef.current?.focus();
      return;
    }

    try {
      setAdding(true);
      setError("");
      setStatus("");

      const compressedPhoto = photo ? await compressImage(photo) : null;

      const id = crypto.randomUUID();

      const storedItem: StoredFastAddItem = {
        id,
        name: trimmedName,
        photo: compressedPhoto,
        photoName: photo?.name ?? "",
        photoType: compressedPhoto?.type ?? "",
        categoryId: selectedCategoryId,
        sticker30Percent: selectedCheckType === "daily",
        createdAt: Date.now(),
      };

      await saveStoredItem(storedItem);

      const newItem: FastAddItem = {
        ...storedItem,
        previewUrl: compressedPhoto ? URL.createObjectURL(compressedPhoto) : "",
      };

      setItems((current) => [...current, newItem]);

      setName("");
      setPhoto(null);
      setPhotoPreview("");

      nameInputRef.current?.focus();
    } catch (addError) {
      console.error(addError);

      setError(
        addError instanceof Error
          ? addError.message
          : "Product kon niet toegevoegd worden.",
      );
    } finally {
      setAdding(false);
    }
  }

  // --------------------------------------------------
  // Remove product locally
  // --------------------------------------------------

  async function handleRemoveItem(id: string) {
    if (busy) return;

    try {
      setError("");
      setStatus("");

      await deleteStoredItem(id);

      setItems((current) => current.filter((item) => item.id !== id));
    } catch (removeError) {
      console.error(removeError);

      setError(
        removeError instanceof Error
          ? removeError.message
          : "Product kon niet verwijderd worden.",
      );
    }
  }

  // --------------------------------------------------
  // GitHub upload
  // --------------------------------------------------

  async function uploadPhotoToGitHub(
    item: FastAddItem,
  ): Promise<string | null> {
    if (!item.photo) return null;

    const formData = new FormData();

    formData.append(
      "file",
      new File([item.photo], item.photoName || `${item.id}.webp`, {
        type: item.photoType || "image/webp",
      }),
    );

    formData.append("id", item.id);

    const response = await fetch("/api/github-upload", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as {
      url?: string;
      error?: string;
      details?: string;
    };

    if (!response.ok) {
      throw new Error(
        data.details || data.error || "Foto kon niet geüpload worden.",
      );
    }

    if (!data.url) {
      throw new Error("De upload gaf geen foto-URL terug.");
    }

    return data.url;
  }

  async function deleteGitHubPhoto(id: string) {
    try {
      const response = await fetch("/api/github-upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        console.error("Foto kon niet verwijderd worden:", id);
      }
    } catch (deleteError) {
      console.error("Foto kon niet verwijderd worden:", deleteError);
    }
  }

  // --------------------------------------------------
  // Upload entire list
  // --------------------------------------------------

  async function handleUploadCurrentList() {
    if (busy) return;

    if (items.length === 0) {
      setError("Er staan nog geen producten in de lijst.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setStatus("Foto's uploaden...");

      const uploadedUrls = new Map<string, string | null>();

      for (const item of items) {
        const url = await uploadPhotoToGitHub(item);
        uploadedUrls.set(item.id, url);
      }

      setStatus("Producten toevoegen...");

      const response = await fetch("/api/items/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            name: item.name,
            photo_url: uploadedUrls.get(item.id) ?? null,
            category_id: item.categoryId,
            sticker_30_percent: item.sticker30Percent,
          })),
        }),
      });

      const data = (await response.json()) as {
        inserted?: {
          id: string;
          name: string;
        }[];
        insertedCount?: number;
        skippedNames?: string[];
        skippedCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Producten konden niet toegevoegd worden.",
        );
      }

      const insertedNames = new Set(
        (data.inserted ?? []).map((item) => item.name.toUpperCase()),
      );

      const skippedNames = new Set(
        (data.skippedNames ?? []).map((item) => item.toUpperCase()),
      );

      // Remove photos of products that already exist.
      for (const item of items) {
        if (
          skippedNames.has(item.name.toUpperCase()) &&
          uploadedUrls.get(item.id)
        ) {
          await deleteGitHubPhoto(item.id);
        }
      }

      const insertedCount = data.insertedCount ?? insertedNames.size;

      const skippedCount = data.skippedCount ?? skippedNames.size;

      await clearStoredItems();

      setItems([]);

      setStatus(
        `${insertedCount} product${insertedCount === 1 ? "" : "en"} toegevoegd${
          skippedCount > 0
            ? `, ${skippedCount} overgeslagen omdat ze al bestaan.`
            : "."
        }`,
      );
    } catch (uploadError) {
      console.error(uploadError);

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "De lijst kon niet geüpload worden.",
      );

      setStatus("");
    } finally {
      setUploading(false);
    }
  }

  // --------------------------------------------------
  // Clear list
  // --------------------------------------------------

  async function handleClearList() {
    if (busy || items.length === 0) return;

    const confirmed = window.confirm(
      `Weet je zeker dat je alle ${items.length} producten uit de lijst wilt verwijderen?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setStatus("");

      await clearStoredItems();

      setItems([]);
    } catch (clearError) {
      console.error(clearError);

      setError(
        clearError instanceof Error
          ? clearError.message
          : "De lijst kon niet gewist worden.",
      );
    }
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  function getCategory(categoryId: string) {
    return categories.find((category) => category.id === categoryId);
  }

  const selectedCategory = getCategory(selectedCategoryId);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/stockchecker" className={styles.backLink}>
          <ArrowLeft size={20} />
          Terug
        </Link>

        <header className={styles.header}>
          <h1>Snel toevoegen</h1>
          <p>
            Voeg meerdere producten toe en upload ze in één keer naar
            DateCheck.
          </p>
        </header>

        {error && (
          <div className={`${styles.message} ${styles.error}`} role="alert">
            {error}
          </div>
        )}

        {status && !error && (
          <div className={styles.message} role="status">
            {status}
          </div>
        )}

        {/* Add product */}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <Tag size={22} />
            </div>

            <div className={styles.cardHeading}>
              <h2>Product toevoegen</h2>
              <p>Vul de gegevens in en voeg het product toe aan de lijst.</p>
            </div>
          </div>

          <div className={styles.fields}>
            {/* Category */}

            <div className={styles.field}>
              <label htmlFor="fastadd-category">Categorie</label>

              <div className={styles.selectWrapper}>
                {selectedCategory && (
                  <span
                    className={styles.categoryDot}
                    style={{
                      backgroundColor: selectedCategory.color || "#a3e635",
                    }}
                  />
                )}

                <select
                  id="fastadd-category"
                  className={selectedCategory ? styles.withDot : ""}
                  value={selectedCategoryId}
                  onChange={(event) =>
                    setSelectedCategoryId(event.target.value)
                  }
                  disabled={busy || categories.length === 0}
                >
                  {categories.length === 0 && (
                    <option value="">
                      {loading ? "Categorieën laden..." : "Geen categorieën"}
                    </option>
                  )}

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <ChevronDown size={19} className={styles.selectChevron} />
              </div>
            </div>

            {/* Control */}

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Controle</span>

              <div className={styles.checkOptions}>
                <button
                  type="button"
                  className={`${styles.checkOption} ${
                    selectedCheckType === "daily"
                      ? styles.checkOptionActive
                      : ""
                  }`}
                  onClick={() => setSelectedCheckType("daily")}
                  aria-pressed={selectedCheckType === "daily"}
                  disabled={busy}
                >
                  {selectedCheckType === "daily" && <CheckCircle2 size={17} />}
                  Dagelijks (30%)
                </button>

                <button
                  type="button"
                  className={`${styles.checkOption} ${
                    selectedCheckType === "monthly"
                      ? styles.checkOptionActive
                      : ""
                  }`}
                  onClick={() => setSelectedCheckType("monthly")}
                  aria-pressed={selectedCheckType === "monthly"}
                  disabled={busy}
                >
                  {selectedCheckType === "monthly" && (
                    <CheckCircle2 size={17} />
                  )}
                  Maandelijks
                </button>
              </div>
            </div>

            {/* Name */}

            <div className={styles.field}>
              <label htmlFor="fastadd-name">Naam</label>

              <input
                ref={nameInputRef}
                id="fastadd-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAddItem();
                  }
                }}
                placeholder="Naam van het product"
                autoComplete="off"
                disabled={busy}
              />
            </div>

            {/* Photo */}

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Foto</span>

              <div className={styles.photoArea}>
                <button
                  type="button"
                  className={styles.photoButton}
                  onClick={() => photoInputRef.current?.click()}
                  disabled={busy}
                >
                  <Camera size={28} />
                  <span>{photo ? "Foto wijzigen" : "Foto nemen"}</span>
                </button>

                {photoPreview ? (
                  <div className={styles.photoPreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt="Geselecteerde productfoto" />

                    <button
                      type="button"
                      className={styles.removePhoto}
                      onClick={handleRemovePhoto}
                      disabled={busy}
                      aria-label="Foto verwijderen"
                    >
                      <X size={19} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.photoPreview}>
                    <div
                      className={styles.listPlaceholder}
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: 135,
                      }}
                    >
                      <Camera size={26} />
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.hiddenInput}
                onChange={handlePhotoChange}
                disabled={busy}
              />
            </div>
          </div>

          <button
            type="button"
            className={styles.addButton}
            onClick={() => void handleAddItem()}
            disabled={busy}
          >
            {adding ? (
              <>
                <LoaderCircle size={21} className={styles.spinner} />
                Toevoegen...
              </>
            ) : (
              <>
                <Plus size={22} />
                Toevoegen aan lijst
              </>
            )}
          </button>
        </section>

        {/* Current list */}

        <section className={`${styles.card} ${styles.listCard}`}>
          <div className={styles.listHeader}>
            <div className={styles.cardIcon}>
              <ClipboardList size={22} />
            </div>

            <div className={styles.cardHeading}>
              <h2>Producten in de lijst</h2>
              <p>Deze producten zijn nog niet toegevoegd aan DateCheck.</p>
            </div>

            <span className={styles.count}>{items.length}</span>
          </div>

          {items.length === 0 ? (
            <div className={styles.emptyList}>
              {loading
                ? "Producten laden..."
                : "Nog geen producten toegevoegd."}
            </div>
          ) : (
            <div className={styles.listItems}>
              {items.map((item) => {
                const category = getCategory(item.categoryId);

                return (
                  <div key={item.id} className={styles.listItem}>
                    {item.previewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className={styles.listPhoto}
                      />
                    ) : (
                      <div className={styles.listPlaceholder}>
                        <Camera size={23} />
                      </div>
                    )}

                    <div className={styles.listDetails}>
                      <p className={styles.listName}>{item.name}</p>

                      <div className={styles.listMeta}>
                        <span
                          className={styles.metaDot}
                          style={{
                            backgroundColor: category?.color || "#a3e635",
                          }}
                        />

                        <span>{category?.name || "Onbekende categorie"}</span>
                      </div>

                      <div className={styles.listMeta}>
                        <Tag size={13} color="#a3e635" />

                        <span>
                          {item.sticker30Percent
                            ? "Dagelijks (30%)"
                            : "Maandelijks"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.removeItem}
                      onClick={() => void handleRemoveItem(item.id)}
                      disabled={busy}
                      aria-label={`${item.name} verwijderen`}
                    >
                      <Trash2 size={19} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {items.length > 0 && (
            <div className={styles.listActions}>
              <button
                type="button"
                className={styles.uploadButton}
                onClick={() => void handleUploadCurrentList()}
                disabled={busy}
              >
                {uploading ? (
                  <>
                    <LoaderCircle size={21} className={styles.spinner} />
                    Bezig met uploaden...
                  </>
                ) : (
                  <>
                    <CloudUpload size={22} />
                    Alles uploaden naar DateCheck
                  </>
                )}
              </button>

              <button
                type="button"
                className={styles.clearButton}
                onClick={() => void handleClearList()}
                disabled={busy}
              >
                <Trash2 size={19} />
                Lijst wissen
              </button>

              <p className={styles.uploadHint}>
                Geüploade producten krijgen {PAST_EXPIRY_DATE} als startdatum en
                kunnen daarna vanuit de voorraad beheerd worden.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

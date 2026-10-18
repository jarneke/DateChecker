"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  LoaderCircle,
  Package,
  Save,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import ProductPhoto from "@/components/product/ProductPhoto";
import { uploadProductPhoto } from "@/components/product/imageUtils";
import styles from "./page.module.css";

type Category = {
  id: string;
  name: string;
  color?: string;
};

type Item = {
  id: string;
  name: string;
  photo_url: string | null;
  category_id: string;
  expiry_date: string | null;
  sticker_30_percent: boolean;
  category_name: string | null;
};

function getDateInputValue(value: string | null): string {
  if (!value) return "";

  if (value.includes("T")) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Brussels",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);

      const year = parts.find((part) => part.type === "year")?.value;
      const month = parts.find((part) => part.type === "month")?.value;
      const day = parts.find((part) => part.type === "day")?.value;

      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  return value.slice(0, 10);
}

export default function ItemDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = searchParams.get("returnTo");
  const backHref =
    returnTo?.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/stockchecker";

  const [item, setItem] = useState<Item | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [itemResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/items/${id}`),
          fetch("/api/categories"),
        ]);

        if (!itemResponse.ok) {
          throw new Error("Product kon niet geladen worden.");
        }

        if (!categoriesResponse.ok) {
          throw new Error("Categorieën konden niet geladen worden.");
        }

        const itemData: Item = await itemResponse.json();
        const categoriesData: Category[] = await categoriesResponse.json();

        if (cancelled) return;

        setItem({
          ...itemData,
          expiry_date: getDateInputValue(itemData.expiry_date),
        });

        setCategories(categoriesData);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Product kon niet geladen worden.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateItem(changes: Partial<Item>) {
    setItem((current) =>
      current
        ? {
            ...current,
            ...changes,
          }
        : current,
    );

    setSaved(false);
  }

  function handlePhotoChange(file: File | null, removed: boolean) {
    setPhoto(file);
    setRemovePhoto(removed);
    setSaved(false);
  }

  async function handleSave() {
    if (!item || saving) return;

    if (!item.name.trim()) {
      setError("Vul een productnaam in.");
      return;
    }

    if (!item.category_id) {
      setError("Selecteer een categorie.");
      return;
    }

    if (!item.expiry_date) {
      setError("Vul een vervaldatum in.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      let photoUrl: string | null = removePhoto ? null : item.photo_url;

      if (photo) {
        photoUrl = await uploadProductPhoto(photo);
      }

      const response = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: item.name.trim(),
          photo_url: photoUrl,
          category_id: item.category_id,
          expiry_date: item.expiry_date,
          sticker_30_percent: item.sticker_30_percent,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(data?.error || "Opslaan van het product mislukt.");
      }

      const updatedItem = await response.json();

      setItem((current) =>
        current
          ? {
              ...current,
              ...updatedItem,
              expiry_date: getDateInputValue(
                updatedItem.expiry_date ?? current.expiry_date,
              ),
              photo_url: photoUrl,
            }
          : current,
      );

      setPhoto(null);
      setRemovePhoto(false);
      setSaved(true);

      if (returnTo && backHref === returnTo) {
        router.push(backHref);
        return;
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Opslaan mislukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(data?.error || "Verwijderen mislukt.");
      }

      router.push("/stockchecker");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Verwijderen mislukt.",
      );

      setSaving(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <LoaderCircle size={28} className={styles.spinner} />
            <span>Product laden...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <Link href="/stockchecker" className={styles.backLink}>
            <ArrowLeft size={20} />
            Terug
          </Link>

          <div className={styles.emptyState}>
            <Package size={36} />
            <h1>Product niet gevonden</h1>
            <p>{error || "Dit product bestaat niet meer."}</p>
          </div>
        </div>
      </main>
    );
  }

  const selectedCategory = categories.find(
    (category) => category.id === item.category_id,
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href={backHref} className={styles.backLink}>
          <ArrowLeft size={20} />
          Terug
        </Link>

        <header className={styles.header}>
          <h1>Product bewerken</h1>
          <p>Pas de gegevens aan en sla je wijzigingen op.</p>
        </header>

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        {saved && (
          <div className={styles.successMessage} role="status">
            <Check size={18} />
            Wijzigingen opgeslagen
          </div>
        )}

        <ProductPhoto
          initialUrl={item.photo_url}
          onChange={handlePhotoChange}
          disabled={saving}
        />

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <Tag size={22} />
            </div>

            <div>
              <h2>Productgegevens</h2>
              <p>Naam, categorie en vervaldatum.</p>
            </div>
          </div>

          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor="product-name">Naam</label>

              <input
                id="product-name"
                type="text"
                value={item.name}
                onChange={(event) =>
                  updateItem({
                    name: event.target.value,
                  })
                }
                disabled={saving}
                autoComplete="off"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="product-category">Categorie</label>

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
                  id="product-category"
                  className={selectedCategory ? styles.categorySelect : ""}
                  value={item.category_id}
                  onChange={(event) =>
                    updateItem({
                      category_id: event.target.value,
                    })
                  }
                  disabled={saving}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <ChevronDown size={19} className={styles.selectChevron} />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="product-expiry">Vervaldatum</label>

              <div className={styles.dateWrapper}>
                <CalendarDays size={19} className={styles.dateIcon} />

                <input
                  id="product-expiry"
                  type="date"
                  value={item.expiry_date || ""}
                  onChange={(event) =>
                    updateItem({
                      expiry_date: event.target.value,
                    })
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <CalendarDays size={22} />
            </div>

            <div>
              <h2>Controle-instellingen</h2>
              <p>Bepaal hoe dit product gecontroleerd wordt.</p>
            </div>
          </div>

          <label className={styles.toggleRow}>
            <span className={styles.toggleText}>
              <strong>Dagelijkse controle (30%)</strong>

              <span>
                {item.sticker_30_percent
                  ? "Toon dit product bij de dagelijkse controle."
                  : "Dit product valt onder de maandelijkse controle."}
              </span>
            </span>

            <input
              type="checkbox"
              className={styles.toggleInput}
              checked={item.sticker_30_percent}
              onChange={(event) =>
                updateItem({
                  sticker_30_percent: event.target.checked,
                })
              }
              disabled={saving}
            />

            <span className={styles.toggleSwitch} aria-hidden="true" />
          </label>
        </section>

        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <LoaderCircle size={21} className={styles.spinner} />
              Opslaan...
            </>
          ) : (
            <>
              <Save size={21} />
              Wijzigingen opslaan
            </>
          )}
        </button>

        <div className={styles.deleteSection}>
          {!showDeleteConfirm ? (
            <button
              type="button"
              className={styles.deleteLink}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
            >
              <Trash2 size={17} />
              Product verwijderen
            </button>
          ) : (
            <div className={styles.deleteConfirm}>
              <div className={styles.deleteConfirmHeader}>
                <Trash2 size={20} />
                <strong>Product verwijderen?</strong>
              </div>

              <p>
                Weet je zeker dat je "{item.name}" wilt verwijderen? Dit kan
                niet ongedaan gemaakt worden.
              </p>

              <div className={styles.deleteActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={saving}
                >
                  <X size={17} />
                  Annuleren
                </button>

                <button
                  type="button"
                  className={styles.confirmDeleteButton}
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle size={17} className={styles.spinner} />
                  ) : (
                    <Trash2 size={17} />
                  )}
                  Verwijderen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

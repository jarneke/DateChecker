"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  LoaderCircle,
  Plus,
  ListPlus,
  Tag,
} from "lucide-react";

import ProductPhoto from "@/components/product/ProductPhoto";
import { uploadProductPhoto } from "@/components/product/imageUtils";
import styles from "./page.module.css";

type Category = {
  id: string;
  name: string;
  color?: string;
};

type CheckType = "daily" | "monthly";

export default function NewItemPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [checkType, setCheckType] = useState<CheckType>("daily");

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories");

        if (!response.ok) {
          throw new Error("Categorieën konden niet geladen worden.");
        }

        const data: Category[] = await response.json();

        if (!cancelled) {
          setCategories(data);
        }
      } catch {
        if (!cancelled) {
          setError("Categorieën konden niet geladen worden.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  function handlePhotoChange(file: File | null, _removed: boolean) {
    setPhoto(file);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    if (!name.trim() || !expiryDate || !categoryId) {
      setError("Vul alle verplichte velden in.");
      return;
    }

    setLoading(true);
    setError("");

    let itemId: string | null = null;

    try {
      let photoUrl: string | null = null;

      if (photo) {
        photoUrl = await uploadProductPhoto(photo);
      }

      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          photo_url: photoUrl,
          expiry_date: expiryDate,
          category_id: categoryId,
          sticker_30_percent: checkType === "daily",
        }),
      });

      const itemData = await response.json();

      if (!response.ok) {
        throw new Error(
          itemData?.error || "Product kon niet toegevoegd worden.",
        );
      }

      itemId = itemData.id;

      router.push("/stockchecker");
      router.refresh();
    } catch (caughtError) {
      console.error("Failed to create product:", caughtError);

      if (itemId) {
        try {
          await fetch(`/api/items/${itemId}`, {
            method: "DELETE",
          });
        } catch (deleteError) {
          console.error("Failed to clean up product:", deleteError);
        }
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Product kon niet toegevoegd worden.",
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/stockchecker" className={styles.backLink}>
            <ArrowLeft size={20} />
            Terug
          </Link>

          <Link href="/fastadd" className={styles.bulkButton}>
            <ListPlus size={18} />
            Bulk toevoegen
          </Link>
        </div>

        <header className={styles.header}>
          <h1>Nieuw product</h1>
          <p>Voeg een nieuw product toe aan de voorraad.</p>
        </header>

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <ProductPhoto onChange={handlePhotoChange} disabled={loading} />

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>
                <Tag size={22} />
              </div>

              <div>
                <h2>Productgegevens</h2>
                <p>Vul de gegevens van het product in.</p>
              </div>
            </div>

            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="product-name">Naam</label>

                <input
                  id="product-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Naam van het product"
                  autoComplete="off"
                  required
                  disabled={loading}
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
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    required
                    disabled={loading || loadingCategories}
                  >
                    <option value="" disabled>
                      {loadingCategories
                        ? "Categorieën laden..."
                        : "Selecteer een categorie"}
                    </option>

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
                    value={expiryDate}
                    onChange={(event) => setExpiryDate(event.target.value)}
                    required
                    disabled={loading}
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

            <div className={styles.checkOptions}>
              <label
                className={`${styles.checkOption} ${
                  checkType === "daily" ? styles.checkOptionActive : ""
                }`}
              >
                <input
                  type="radio"
                  name="checkType"
                  value="daily"
                  checked={checkType === "daily"}
                  onChange={() => setCheckType("daily")}
                  disabled={loading}
                />

                <span className={styles.checkOptionText}>
                  <strong>Dagelijkse controle (30%)</strong>
                  <span>
                    Controleer het product dagelijks wanneer de vervaldatum
                    bereikt is.
                  </span>
                </span>

                <span className={styles.radioIndicator}>
                  {checkType === "daily" && <Check size={14} strokeWidth={3} />}
                </span>
              </label>

              <label
                className={`${styles.checkOption} ${
                  checkType === "monthly" ? styles.checkOptionActive : ""
                }`}
              >
                <input
                  type="radio"
                  name="checkType"
                  value="monthly"
                  checked={checkType === "monthly"}
                  onChange={() => setCheckType("monthly")}
                  disabled={loading}
                />

                <span className={styles.checkOptionText}>
                  <strong>Maandelijkse controle</strong>
                  <span>
                    Controleer het product tijdens de maandelijkse
                    vervaldatumcontrole.
                  </span>
                </span>

                <span className={styles.radioIndicator}>
                  {checkType === "monthly" && (
                    <Check size={14} strokeWidth={3} />
                  )}
                </span>
              </label>
            </div>
          </section>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || loadingCategories}
          >
            {loading ? (
              <>
                <LoaderCircle size={21} className={styles.spinner} />
                Toevoegen...
              </>
            ) : (
              <>
                <Plus size={21} />
                Product toevoegen
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

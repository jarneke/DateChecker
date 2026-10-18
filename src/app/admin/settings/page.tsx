"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  GripVertical,
  Plus,
  Save,
  Trash2,
  AlertCircle,
  Palette,
  Package,
} from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./page.module.css";

type Category = {
  id?: string;
  localId: string;
  name: string;
  color: string;
  sort_order: number;
  item_count: number;
};

type ApiCategory = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  item_count: number;
};

const DEFAULT_COLOR = "#A3E635";

function mapCategories(categories: ApiCategory[]): Category[] {
  return categories.map((category) => ({
    id: category.id,
    localId: category.id,
    name: category.name,
    color: category.color || DEFAULT_COLOR,
    sort_order: category.sort_order,
    item_count: Number(category.item_count),
  }));
}

type SortableCategoryProps = {
  category: Category;
  onColorChange: (localId: string, color: string) => void;
  onDelete: (localId: string) => void;
};

function SortableCategory({
  category,
  onColorChange,
  onDelete,
}: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.localId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: "relative" as const,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.categoryItem} ${isDragging ? styles.dragging : ""}`}
    >
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`${category.name} verslepen`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={19} />
      </button>

      <div
        className={styles.colorPicker}
        style={{ backgroundColor: category.color }}
      >
        <input
          type="color"
          value={category.color}
          onChange={(event) =>
            onColorChange(category.localId, event.target.value.toUpperCase())
          }
          aria-label={`Kleur van ${category.name}`}
        />
      </div>

      <div className={styles.categoryInfo}>
        <span className={styles.categoryName}>{category.name}</span>
        <span className={styles.categoryMeta}>
          {category.item_count} {category.item_count === 1 ? "item" : "items"}
          <span className={styles.metaDot}>·</span>
          {category.color.toUpperCase()}
        </span>
      </div>

      {category.item_count === 0 ? (
        <button
          type="button"
          className={styles.deleteButton}
          onClick={() => onDelete(category.localId)}
          aria-label={`${category.name} verwijderen`}
        >
          <Trash2 size={17} />
        </button>
      ) : (
        <Package
          size={16}
          className={styles.lockedIcon}
          aria-label="Categorie bevat producten"
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [daysBeforeEnd, setDaysBeforeEnd] = useState("5");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_COLOR);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
  );

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Instellingen konden niet geladen worden.");
        }

        const data = await response.json();

        setDaysBeforeEnd(String(data.monthCheckDaysBeforeEnd));
        setCategories(mapCategories(data.categories));
      } catch (err) {
        console.error(err);
        setError("Instellingen konden niet geladen worden.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) return;

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  function markChanged() {
    setHasUnsavedChanges(true);
    setSaved(false);
    setError(null);
  }

  function handleColorChange(localId: string, color: string) {
    setCategories((current) =>
      current.map((category) =>
        category.localId === localId ? { ...category, color } : category,
      ),
    );

    markChanged();
  }

  function handleAddCategory() {
    const name = newCategory.trim();

    if (!name) return;

    const exists = categories.some(
      (category) => category.name.toLowerCase() === name.toLowerCase(),
    );

    if (exists) {
      setError("Deze categorie bestaat al.");
      return;
    }

    setCategories((current) => [
      ...current,
      {
        localId: crypto.randomUUID(),
        name,
        color: newCategoryColor,
        sort_order: current.length + 1,
        item_count: 0,
      },
    ]);

    setNewCategory("");
    setNewCategoryColor(DEFAULT_COLOR);
    markChanged();
  }

  function handleDeleteCategory(localId: string) {
    const category = categories.find((item) => item.localId === localId);

    if (!category) return;

    if (category.item_count > 0) {
      setError(
        `Categorie "${category.name}" bevat nog producten en kan niet verwijderd worden.`,
      );
      return;
    }

    setCategories((current) =>
      current
        .filter((item) => item.localId !== localId)
        .map((item, index) => ({
          ...item,
          sort_order: index + 1,
        })),
    );

    markChanged();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setCategories((current) => {
      const oldIndex = current.findIndex((item) => item.localId === active.id);

      const newIndex = current.findIndex((item) => item.localId === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex).map((item, index) => ({
        ...item,
        sort_order: index + 1,
      }));
    });

    markChanged();
  }

  async function handleSave() {
    const days = Number(daysBeforeEnd);

    if (
      !Number.isInteger(days) ||
      days < 0 ||
      days > 31 ||
      saving ||
      categories.length === 0
    ) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monthCheckDaysBeforeEnd: days,
          categories: categories.map((category) => ({
            id: category.id,
            name: category.name,
            color: category.color,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Instellingen konden niet opgeslagen worden.",
        );
      }

      setDaysBeforeEnd(String(data.monthCheckDaysBeforeEnd));
      setCategories(mapCategories(data.categories));
      setHasUnsavedChanges(false);
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Instellingen konden niet opgeslagen worden.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleBack(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!hasUnsavedChanges) return;

    if (
      !window.confirm(
        "Je hebt niet-opgeslagen wijzigingen. Wil je de pagina verlaten?",
      )
    ) {
      event.preventDefault();
    }
  }

  const days = Number(daysBeforeEnd);

  const isValid =
    daysBeforeEnd !== "" && Number.isInteger(days) && days >= 0 && days <= 31;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/admin" className={styles.backLink} onClick={handleBack}>
          <ArrowLeft size={17} />
          Terug
        </Link>

        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Instellingen</h1>
            <p className={styles.subtitle}>
              Beheer je voorkeuren en categorieën.
            </p>
          </div>
        </header>

        {loading ? (
          <div className={styles.loading}>Instellingen laden...</div>
        ) : (
          <>
            {hasUnsavedChanges && (
              <div className={styles.unsavedNotice}>
                <AlertCircle size={17} />
                Niet-opgeslagen wijzigingen
              </div>
            )}

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionIcon}>
                  <CalendarDays size={19} />
                </div>

                <div>
                  <h2>Maandelijkse controle</h2>
                  <p>Bepaal wanneer de maandcontrole beschikbaar wordt.</p>
                </div>
              </div>

              <div className={styles.daysControl}>
                <div className={styles.daysText}>
                  <span className={styles.fieldLabel}>
                    Dagen voor einde maand
                  </span>
                  <span className={styles.fieldHint}>
                    Ontgrendel de controle zoveel dagen vóór de laatste dag van
                    de maand.
                  </span>
                </div>

                <input
                  type="number"
                  min={0}
                  max={31}
                  value={daysBeforeEnd}
                  onChange={(event) => {
                    setDaysBeforeEnd(event.target.value);
                    markChanged();
                  }}
                  className={styles.daysInput}
                  aria-label="Dagen voor einde maand"
                />
              </div>

              <p className={styles.example}>
                Bijvoorbeeld: bij 5 dagen wordt de maandcontrole 5 dagen vóór
                het einde van de maand ontgrendeld.
              </p>

              {!isValid && (
                <p className={styles.validationError}>
                  Kies een geheel getal tussen 0 en 31.
                </p>
              )}
            </section>

            <section className={styles.section}>
              <button
                type="button"
                className={styles.categoriesHeader}
                onClick={() => setCategoriesOpen((current) => !current)}
                aria-expanded={categoriesOpen}
              >
                <div className={styles.sectionHeading}>
                  <div className={styles.sectionIcon}>
                    <Palette size={19} />
                  </div>

                  <div>
                    <h2>Categorieën</h2>
                    <p>Volgorde en kleuren beheren</p>
                  </div>
                </div>

                <ChevronDown
                  size={20}
                  className={`${styles.chevron} ${
                    categoriesOpen ? styles.chevronOpen : ""
                  }`}
                />
              </button>

              {categoriesOpen && (
                <div className={styles.categoriesContent}>
                  <p className={styles.dragHint}>
                    Sleep via het icoon om de winkelroute te wijzigen. Tik op
                    een kleur om deze aan te passen.
                  </p>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={categories.map((category) => category.localId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className={styles.categoryList}>
                        {categories.map((category) => (
                          <SortableCategory
                            key={category.localId}
                            category={category}
                            onColorChange={handleColorChange}
                            onDelete={handleDeleteCategory}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <div className={styles.addSection}>
                    <h3>Nieuwe categorie</h3>

                    <div className={styles.addFields}>
                      <div
                        className={styles.newColorPicker}
                        style={{
                          backgroundColor: newCategoryColor,
                        }}
                      >
                        <input
                          type="color"
                          value={newCategoryColor}
                          onChange={(event) =>
                            setNewCategoryColor(
                              event.target.value.toUpperCase(),
                            )
                          }
                          aria-label="Kleur nieuwe categorie"
                        />
                      </div>

                      <input
                        type="text"
                        className={styles.nameInput}
                        placeholder="Naam categorie..."
                        value={newCategory}
                        onChange={(event) => setNewCategory(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddCategory();
                          }
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      className={styles.addButton}
                      onClick={handleAddCategory}
                      disabled={!newCategory.trim()}
                    >
                      <Plus size={18} />
                      Categorie toevoegen
                    </button>
                  </div>
                </div>
              )}
            </section>

            {error && (
              <div className={styles.errorNotice}>
                <AlertCircle size={17} />
                {error}
              </div>
            )}

            {saved && (
              <div className={styles.successNotice}>
                <Check size={17} />
                Instellingen opgeslagen.
              </div>
            )}

            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
              disabled={
                !isValid ||
                saving ||
                categories.length === 0 ||
                !hasUnsavedChanges
              }
            >
              {saving ? (
                "Opslaan..."
              ) : (
                <>
                  <Save size={19} />
                  Wijzigingen opslaan
                </>
              )}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

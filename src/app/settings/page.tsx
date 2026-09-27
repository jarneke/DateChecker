"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useState } from "react";

type Category = {
  id?: string;
  name: string;
  sort_order: number;
  item_count: number;
};

export default function SettingsPage() {
  const [daysBeforeEnd, setDaysBeforeEnd] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Instellingen konden niet geladen worden.");
        }

        const data = await res.json();

        setDaysBeforeEnd(String(data.monthCheckDaysBeforeEnd));

        setCategories(
          data.categories.map(
            (category: {
              id: string;
              name: string;
              sort_order: number;
              item_count: number;
            }) => ({
              id: category.id,
              name: category.name,
              sort_order: category.sort_order,
              item_count: Number(category.item_count),
            }),
          ),
        );
      } catch (error) {
        console.error(error);
        setError("Instellingen konden niet geladen worden.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  function markAsChanged() {
    setHasUnsavedChanges(true);
    setSaved(false);
    setError(null);
  }

  function handleDaysChange(value: string) {
    setDaysBeforeEnd(value);
    markAsChanged();
  }

  function handleAddCategory() {
    const name = newCategory.trim();

    if (!name) {
      return;
    }

    const alreadyExists = categories.some(
      (category) => category.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (alreadyExists) {
      setError("Deze categorie bestaat al.");
      return;
    }

    setCategories((current) => [
      ...current,
      {
        name,
        sort_order: current.length + 1,
        item_count: 0,
      },
    ]);

    setNewCategory("");
    markAsChanged();
  }

  function handleDeleteCategory(index: number) {
    const category = categories[index];

    if (category.item_count > 0) {
      setError(
        `Categorie "${category.name}" kan niet verwijderd worden omdat er nog ${category.item_count} ${
          category.item_count === 1 ? "item" : "items"
        } aan gekoppeld ${
          category.item_count === 1 ? "is" : "zijn"
        }. Pas eerst de categorie van deze ${
          category.item_count === 1 ? "item" : "items"
        } aan.`,
      );
      setSaved(false);
      return;
    }

    setCategories((current) => {
      const updated = current.filter(
        (_, currentIndex) => currentIndex !== index,
      );

      return updated.map((category, currentIndex) => ({
        ...category,
        sort_order: currentIndex + 1,
      }));
    });

    markAsChanged();
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    setCategories((current) => {
      const updated = [...current];
      const [draggedCategory] = updated.splice(draggedIndex, 1);

      updated.splice(targetIndex, 0, draggedCategory);

      return updated.map((category, index) => ({
        ...category,
        sort_order: index + 1,
      }));
    });

    setDraggedIndex(null);
    markAsChanged();
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  async function handleSave() {
    const value = Number(daysBeforeEnd);

    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 31 ||
      saving ||
      categories.length === 0
    ) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monthCheckDaysBeforeEnd: value,
          categories: categories.map((category) => ({
            id: category.id,
            name: category.name,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Instellingen konden niet opgeslagen worden.",
        );
      }

      setDaysBeforeEnd(String(data.monthCheckDaysBeforeEnd));

      setCategories(
        data.categories.map(
          (category: {
            id: string;
            name: string;
            sort_order: number;
            item_count: number;
          }) => ({
            id: category.id,
            name: category.name,
            sort_order: category.sort_order,
            item_count: Number(category.item_count),
          }),
        ),
      );

      setHasUnsavedChanges(false);
      setSaved(true);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Instellingen konden niet opgeslagen worden.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleBack(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!hasUnsavedChanges) {
      return;
    }

    const confirmed = window.confirm(
      "Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je de pagina wilt verlaten?",
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  const value = Number(daysBeforeEnd);

  const isValid =
    daysBeforeEnd !== "" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 31;

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          py: 4,
        }}
      >
        <Stack spacing={4}>
          <Button
            className="StyledButton3"
            component={Link}
            href="/"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{
              alignSelf: "flex-start",
            }}
          >
            Terug
          </Button>

          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Instellingen
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Stel de maandcontrole en de volgorde van je categorieën in.
            </Typography>
          </Box>

          {loading ? (
            <Typography color="text.secondary">
              Instellingen laden...
            </Typography>
          ) : (
            <Stack spacing={3}>
              {hasUnsavedChanges && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "warning.main",
                    backgroundColor: "warning.light",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      color: "warning.dark",
                    }}
                  >
                    Je hebt niet-opgeslagen wijzigingen.
                  </Typography>
                </Box>
              )}

              <Box className="StyledBox color-invert">
                <Stack spacing={2}>
                  <TextField
                    label="Dagen voor einde maand"
                    type="number"
                    value={daysBeforeEnd}
                    onChange={(event) => handleDaysChange(event.target.value)}
                    helperText="Bijvoorbeeld 5 = de maandcontrole start 5 dagen voor het einde van de maand."
                    error={!isValid}
                    slotProps={{
                      htmlInput: {
                        min: 0,
                        max: 31,
                      },
                    }}
                    fullWidth
                  />
                </Stack>
              </Box>

              <Box className="StyledBox color-invert">
                <Stack spacing={2}>
                  <Box>
                    <Typography
                      variant="h6"
                      component="h2"
                      sx={{ fontWeight: 700 }}
                    >
                      Categorieën
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Sleep categorieën om de volgorde van de winkelroute te
                      bepalen.
                    </Typography>
                  </Box>

                  <Stack spacing={1}>
                    {categories.map((category, index) => (
                      <Box
                        key={category.id ?? `new-${index}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                        onDragEnd={handleDragEnd}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1.5,
                          py: 1.25,
                          borderRadius: 1.5,
                          border: "1px solid",
                          borderColor:
                            draggedIndex === index ? "primary.main" : "divider",
                          backgroundColor: "background.paper",
                          cursor: "grab",
                          opacity: draggedIndex === index ? 0.5 : 1,
                          userSelect: "none",
                          transition: "border-color 0.15s, opacity 0.15s",
                        }}
                      >
                        <DragIndicatorIcon
                          sx={{
                            color: "text.secondary",
                            flexShrink: 0,
                          }}
                        />

                        <Typography
                          sx={{
                            flex: 1,
                            fontWeight: 500,
                          }}
                        >
                          {category.name}
                        </Typography>

                        {category.item_count > 0 && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              whiteSpace: "nowrap",
                            }}
                          >
                            {category.item_count}{" "}
                            {category.item_count === 1 ? "item" : "items"}
                          </Typography>
                        )}

                        <IconButton
                          color="error"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteCategory(index);
                          }}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          aria-label={`Verwijder ${category.name}`}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}

                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "flex-start",
                        pt: 1,
                      }}
                    >
                      <TextField
                        label="Nieuwe categorie"
                        value={newCategory}
                        onChange={(event) => {
                          setNewCategory(event.target.value);
                          setError(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddCategory();
                          }
                        }}
                        fullWidth
                      />

                      <Button
                        className="StyledButton3"
                        variant="outlined"
                        onClick={handleAddCategory}
                        startIcon={<AddIcon />}
                        sx={{
                          minWidth: "auto",
                          height: 56,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Toevoegen
                      </Button>
                    </Box>
                  </Stack>
                </Stack>
              </Box>

              <Button
                className="StyledButton3"
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!isValid || saving || categories.length === 0}
                fullWidth
              >
                {saving ? "Opslaan..." : "Opslaan"}
              </Button>

              {saved && (
                <Typography color="success.main" sx={{ textAlign: "center" }}>
                  Instellingen opgeslagen.
                </Typography>
              )}

              {error && (
                <Typography color="error" sx={{ textAlign: "center" }}>
                  {error}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </Box>
    </Container>
  );
}

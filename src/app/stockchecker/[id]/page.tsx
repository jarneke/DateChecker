"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import {
  Box,
  Button,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import CameraAltOutlined from "@mui/icons-material/CameraAltOutlined";

type Category = {
  id: string;
  name: string;
};

type Item = {
  id: string;
  name: string;
  photo_url: string | null;
  category_id: string;
  expiry_date: string;
  sticker_30_percent: boolean;
  category_name: string | null;
};

export default function ItemDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [itemResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/items/${id}`),
          fetch("/api/categories"),
        ]);

        if (!itemResponse.ok) {
          throw new Error("Item not found");
        }

        if (!categoriesResponse.ok) {
          throw new Error("Categories could not be loaded");
        }

        const itemData = await itemResponse.json();
        const categoriesData = await categoriesResponse.json();

        setItem(itemData);
        setCategories(categoriesData);

        if (itemData.photo_url) {
          setPhotoPreview(itemData.photo_url);
        }
      } catch {
        setError("Kon item niet laden.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Selecteer een geldige afbeelding.");
      return;
    }

    setError("");
    setPhoto(file);
    setRemovePhoto(false);

    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleRemovePhoto() {
    setPhoto(null);
    setRemovePhoto(true);

    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoPreview("");
  }

  async function handleSave() {
    if (!item) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const oldPhotoUrl = item.photo_url;
      let photoUrl = removePhoto ? null : oldPhotoUrl;

      if (photo) {
        const uploadedBlob = await upload(photo.name, photo, {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({
            itemId: item.id,
          }),
        });

        photoUrl = uploadedBlob.url;

        if (oldPhotoUrl && oldPhotoUrl !== photoUrl) {
          await fetch("/api/upload", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: oldPhotoUrl,
            }),
          });
        }
      } else if (removePhoto && oldPhotoUrl) {
        const deleteResponse = await fetch("/api/upload", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: oldPhotoUrl,
          }),
        });

        if (!deleteResponse.ok) {
          const data = await deleteResponse.json().catch(() => null);

          throw new Error(data?.error || "Foto kon niet verwijderd worden.");
        }
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

        throw new Error(data?.error || "Opslaan van het item mislukt.");
      }

      const updatedItem = await response.json();

      setItem((current) =>
        current
          ? {
              ...current,
              ...updatedItem,
              photo_url: photoUrl,
            }
          : current,
      );

      setPhoto(null);
      setRemovePhoto(false);
      setPhotoPreview(photoUrl || "");

      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) {
      return;
    }

    const confirmed = window.confirm(
      `Weet je zeker dat je "${item.name}" wilt verwijderen?`,
    );

    if (!confirmed) {
      return;
    }

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
    } catch (error) {
      setError(error instanceof Error ? error.message : "Verwijderen mislukt.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography>Laden...</Typography>
        </Box>
      </Container>
    );
  }

  if (!item) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography variant="h5">Item niet gevonden</Typography>

          <Button
            component={Link}
            href="/stockchecker"
            startIcon={<ArrowBackOutlined />}
            sx={{ mt: 2 }}
          >
            Terug naar overzicht
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Button
          className="StyledButton3"
          component={Link}
          href="/stockchecker"
          startIcon={<ArrowBackOutlined />}
          sx={{ mb: 3 }}
        >
          Terug
        </Button>

        <Typography variant="h4" sx={{ mb: 3 }}>
          Item aanpassen
        </Typography>

        <Box className="StyledBox color-invert">
          <Stack spacing={3}>
            {error && <Typography color="error">{error}</Typography>}

            <Box>
              <Stack spacing={2}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Productfoto
                </Typography>

                {photoPreview && (
                  <Box
                    component="img"
                    src={photoPreview}
                    alt={item.name}
                    sx={{
                      width: "100%",
                      maxHeight: 300,
                      objectFit: "contain",
                      borderRadius: 2,
                    }}
                  />
                )}

                <Button
                  className="StyledButton3"
                  component="label"
                  variant="outlined"
                  size="large"
                  startIcon={<CameraAltOutlined />}
                  fullWidth
                  disabled={saving}
                >
                  {photoPreview ? "Andere foto nemen" : "Foto nemen"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    hidden
                    onChange={handlePhotoChange}
                  />
                </Button>

                {photoPreview && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleRemovePhoto}
                    disabled={saving}
                  >
                    Foto verwijderen
                  </Button>
                )}
              </Stack>
            </Box>

            <TextField
              label="Naam"
              value={item.name}
              onChange={(event) =>
                setItem({
                  ...item,
                  name: event.target.value,
                })
              }
              disabled={saving}
              fullWidth
            />

            <TextField
              select
              label="Categorie"
              value={item.category_id}
              onChange={(event) =>
                setItem({
                  ...item,
                  category_id: event.target.value,
                })
              }
              disabled={saving}
              fullWidth
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Vervaldatum"
              type="date"
              value={item.expiry_date ? item.expiry_date.slice(0, 10) : ""}
              onChange={(event) =>
                setItem({
                  ...item,
                  expiry_date: event.target.value,
                })
              }
              disabled={saving}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              fullWidth
            />

            <TextField
              select
              label="Controle"
              value={item.sticker_30_percent ? "daily" : "monthly"}
              onChange={(event) =>
                setItem({
                  ...item,
                  sticker_30_percent: event.target.value === "daily",
                })
              }
              disabled={saving}
              fullWidth
            >
              <MenuItem value="daily">Dagelijkse check</MenuItem>

              <MenuItem value="monthly">Maandelijkse check</MenuItem>
            </TextField>

            <Stack spacing={2}>
              <Button
                className="StyledButton1"
                variant="contained"
                size="large"
                startIcon={<SaveOutlined />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Opslaan..." : "Opslaan"}
              </Button>

              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                disabled={saving}
              >
                Item verwijderen
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}

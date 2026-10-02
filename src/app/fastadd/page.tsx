"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Container,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";

type Category = {
  id: string;
  name: string;
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
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(
        request.result.sort(
          (a: StoredFastAddItem, b: StoredFastAddItem) =>
            a.createdAt - b.createdAt,
        ),
      );
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function saveStoredItem(item: StoredFastAddItem): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.put(item);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

async function deleteStoredItem(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.delete(id);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

async function clearStoredItems(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.clear();

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

async function compressImage(file: File): Promise<Blob> {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("Afbeelding kon niet geladen worden."));
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

export default function FastAddPage() {
  const nameInputRef = useRef<HTMLInputElement>(null);

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

        if (cancelled) {
          return;
        }

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

    load();

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
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Selecteer een geldige afbeelding.");
      return;
    }

    setError("");

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));

    event.target.value = "";
  };

  const handleAddItem = async () => {
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

      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }

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
  };

  const handleRemoveItem = async (id: string) => {
    try {
      setError("");
      setStatus("");

      await deleteStoredItem(id);

      setItems((current) => {
        const item = current.find((entry) => entry.id === id);

        if (item?.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }

        return current.filter((entry) => entry.id !== id);
      });
    } catch (removeError) {
      console.error(removeError);

      setError(
        removeError instanceof Error
          ? removeError.message
          : "Product kon niet verwijderd worden.",
      );
    }
  };

  const uploadPhotoToGitHub = async (
    item: FastAddItem,
  ): Promise<string | null> => {
    if (!item.photo) {
      return null;
    }

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
    };

    if (!response.ok) {
      throw new Error(data.error || "Foto kon niet geüpload worden.");
    }

    return data.url ?? null;
  };

  const deleteGitHubPhoto = async (id: string) => {
    try {
      await fetch("/api/github-upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
        }),
      });
    } catch (deleteError) {
      console.error("Foto kon niet verwijderd worden:", deleteError);
    }
  };

  const handleUploadCurrentList = async () => {
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

      items.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

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
  };

  const handleClearList = async () => {
    try {
      setError("");
      setStatus("");

      await clearStoredItems();

      items.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

      setItems([]);
    } catch (clearError) {
      console.error(clearError);

      setError(
        clearError instanceof Error
          ? clearError.message
          : "De lijst kon niet gewist worden.",
      );
    }
  };

  const getCategoryName = (categoryId: string) => {
    return (
      categories.find((category) => category.id === categoryId)?.name ??
      "Onbekende categorie"
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 4,
        backgroundColor: "#100f0e",
        color: "#fff2dd",
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box>
            <Button
              component={Link}
              href="/stockchecker"
              startIcon={<ArrowBackOutlinedIcon />}
              className="StyledButton3"
              sx={{
                mb: 2,
              }}
            >
              Terug
            </Button>

            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
              }}
            >
              Snel toevoegen
            </Typography>

            <Typography
              variant="body2"
              sx={{
                opacity: 0.7,
                mt: 0.5,
              }}
            >
              Voeg snel meerdere producten toe voordat je ze naar de voorraad
              uploadt.
            </Typography>
          </Box>

          <Box className="StyledBox color-invert">
            <Stack spacing={2}>
              <TextField
                select
                fullWidth
                label="Categorie"
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
                disabled={
                  loading || categories.length === 0 || adding || uploading
                }
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Type controle"
                value={selectedCheckType}
                onChange={(event) =>
                  setSelectedCheckType(event.target.value as CheckType)
                }
                disabled={adding || uploading}
              >
                <MenuItem value="daily">Dagelijks</MenuItem>
                <MenuItem value="monthly">Maandelijks</MenuItem>
              </TextField>

              <TextField
                inputRef={nameInputRef}
                fullWidth
                label="Naam"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAddItem();
                  }
                }}
                disabled={adding || uploading}
                autoComplete="off"
              />

              <Stack direction="column" spacing={1.5}>
                <Button
                  className="StyledButton3"
                  component="label"
                  variant="outlined"
                  fullWidth
                  startIcon={<CameraAltOutlinedIcon />}
                  disabled={adding || uploading}
                  sx={{
                    minHeight: 48,
                  }}
                >
                  {photo ? "Foto geselecteerd" : "Foto nemen"}
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                  />
                </Button>

                <Button
                  className="StyledButton1"
                  variant="contained"
                  fullWidth
                  startIcon={<AddOutlinedIcon />}
                  onClick={() => void handleAddItem()}
                  disabled={adding || uploading || loading}
                  sx={{
                    minHeight: 48,
                  }}
                >
                  Toevoegen
                </Button>
              </Stack>

              {photoPreview && (
                <Box
                  component="img"
                  src={photoPreview}
                  alt="Geselecteerde foto"
                  sx={{
                    width: "100%",
                    maxHeight: 280,
                    objectFit: "cover",
                    borderRadius: 2,
                  }}
                />
              )}
            </Stack>
          </Box>

          {(error || status) && (
            <Box className="StyledBox color-invert">
              {error && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "#ffb4ab",
                  }}
                >
                  {error}
                </Typography>
              )}

              {status && !error && (
                <Typography variant="body2">{status}</Typography>
              )}
            </Box>
          )}

          <Box className="StyledBox color-invert">
            <Stack spacing={2}>
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    Huidige lijst ({items.length})
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.7,
                      mt: 0.5,
                    }}
                  >
                    Producten die klaarstaan om te uploaden.
                  </Typography>
                </Box>

                {items.length > 0 && (
                  <IconButton
                    onClick={() => void handleClearList()}
                    disabled={uploading}
                    aria-label="Lijst wissen"
                  >
                    <DeleteSweepOutlinedIcon />
                  </IconButton>
                )}
              </Stack>

              {items.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.7,
                  }}
                >
                  Nog geen producten toegevoegd.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {items.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        minWidth: 0,
                      }}
                    >
                      {item.previewUrl ? (
                        <Box
                          component="img"
                          src={item.previewUrl}
                          alt={item.name}
                          sx={{
                            width: 58,
                            height: 58,
                            objectFit: "cover",
                            borderRadius: 1.5,
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 58,
                            height: 58,
                            borderRadius: 1.5,
                            border: "1px solid rgba(255,255,255,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <CameraAltOutlinedIcon
                            sx={{
                              opacity: 0.5,
                            }}
                          />
                        </Box>
                      )}

                      <Box
                        sx={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 600,
                            wordBreak: "break-word",
                          }}
                        >
                          {item.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            opacity: 0.7,
                          }}
                        >
                          {getCategoryName(item.categoryId)} ·{" "}
                          {item.sticker30Percent ? "Dagelijks" : "Maandelijks"}
                        </Typography>
                      </Box>

                      <IconButton
                        onClick={() => void handleRemoveItem(item.id)}
                        disabled={uploading}
                        aria-label={`${item.name} verwijderen`}
                      >
                        <DeleteOutlineOutlinedIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}

              {items.length > 0 && (
                <Stack spacing={1}>
                  <Button
                    className="StyledButton1"
                    variant="contained"
                    fullWidth
                    startIcon={<CloudUploadOutlinedIcon />}
                    onClick={() => void handleUploadCurrentList()}
                    disabled={uploading || adding}
                    sx={{
                      minHeight: 48,
                    }}
                  >
                    {uploading
                      ? "Bezig met uploaden..."
                      : "Huidige lijst uploaden"}
                  </Button>

                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.6,
                      textAlign: "center",
                    }}
                  >
                    Geüploade producten krijgen
                    {` `}
                    {PAST_EXPIRY_DATE}
                    {` `}
                    als startdatum en kunnen daarna vanuit de voorraad beheerd
                    worden.
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

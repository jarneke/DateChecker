"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import CameraAltOutlined from "@mui/icons-material/CameraAltOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import DeleteSweepOutlined from "@mui/icons-material/DeleteSweepOutlined";

type StoredFastAddItem = {
  id: string;
  name: string;
  photo: Blob | null;
  photoName: string;
  photoType: string;
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
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error || new Error("Lokale opslag kon niet geopend worden."),
      );
    };
  });
}

async function getStoredItems(): Promise<StoredFastAddItem[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      resolve(
        (request.result as StoredFastAddItem[]).sort(
          (a, b) => a.createdAt - b.createdAt,
        ),
      );
    };

    request.onerror = () => {
      reject(
        request.error || new Error("Lokale items konden niet geladen worden."),
      );
    };
  });
}

async function saveStoredItem(item: StoredFastAddItem) {
  const database = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).put(item);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(
        transaction.error ||
          new Error("Item kon niet lokaal opgeslagen worden."),
      );
    };
  });
}

async function deleteStoredItem(id: string) {
  const database = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(
        transaction.error ||
          new Error("Item kon niet uit lokale opslag verwijderd worden."),
      );
    };
  });
}

async function clearStoredItems() {
  const database = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).clear();

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(
        transaction.error ||
          new Error("Lokale items konden niet gewist worden."),
      );
    };
  });
}

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxSize = 1280;

      let width = image.naturalWidth;
      let height = image.naturalHeight;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height / width) * maxSize);
          width = maxSize;
        } else {
          width = Math.round((width / height) * maxSize);
          height = maxSize;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        resolve(file);
        return;
      }

      context.drawImage(image, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }

          resolve(
            new File([blob], `${file.name.replace(/\.[^/.]+$/, "")}.webp`, {
              type: "image/webp",
              lastModified: Date.now(),
            }),
          );
        },
        "image/webp",
        0.75,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    image.src = objectUrl;
  });
}

export default function FastAddPage() {
  const [items, setItems] = useState<FastAddItem[]>([]);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<FastAddItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    async function load() {
      try {
        const storedItems = await getStoredItems();

        setItems(
          storedItems.map((item) => ({
            ...item,
            previewUrl: item.photo ? URL.createObjectURL(item.photo) : "",
          })),
        );
      } catch (error) {
        console.error(error);
        setError("Lokale items konden niet geladen worden.");
      } finally {
        setLoading(false);
      }
    }

    load();

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

  const names = useMemo(
    () => items.map((item) => item.name).join("\n"),
    [items],
  );

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
    setStatus("");

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));

    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  }

  async function handleAddItem(event: React.FormEvent) {
    event.preventDefault();

    const normalizedName = name.trim().toUpperCase();

    if (!normalizedName) {
      setError("Vul een naam in.");
      return;
    }

    if (items.some((item) => item.name.toUpperCase() === normalizedName)) {
      setError("Dit item staat al in de huidige lijst.");
      return;
    }

    setAdding(true);
    setError("");
    setStatus("");
    setCopied(false);

    try {
      const compressedPhoto = photo ? await compressImage(photo) : null;

      const id = crypto.randomUUID();

      const storedItem: StoredFastAddItem = {
        id,
        name: normalizedName,
        photo: compressedPhoto,
        photoName: compressedPhoto?.name || "",
        photoType: compressedPhoto?.type || "",
        createdAt: Date.now(),
      };

      await saveStoredItem(storedItem);

      setItems((current) => [
        ...current,
        {
          ...storedItem,
          previewUrl: compressedPhoto
            ? URL.createObjectURL(compressedPhoto)
            : "",
        },
      ]);

      setName("");

      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }

      setPhoto(null);
      setPhotoPreview("");

      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Item kon niet lokaal opgeslagen worden.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveItem(id: string) {
    const item = items.find((current) => current.id === id);

    try {
      await deleteStoredItem(id);

      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }

      setItems((current) => current.filter((current) => current.id !== id));

      setStatus("");
      setCopied(false);
    } catch (error) {
      console.error(error);
      setError("Item kon niet verwijderd worden.");
    }
  }

  async function handleSendList() {
    if (!names) {
      setError("De lijst is nog leeg.");
      return;
    }

    setError("");
    setStatus("");
    setCopied(false);

    console.log("FASTADD CURRENT LIST:\n" + names);

    try {
      await navigator.clipboard.writeText(names);
      setCopied(true);
      setStatus("De volledige namenlijst staat op je klembord.");
    } catch {
      setStatus("Kopiëren is niet gelukt. Gebruik het tekstvak hieronder.");
    }
  }

  async function deleteUploadedPhoto(url: string) {
    try {
      const response = await fetch("/api/github-upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        console.error(
          "Failed to clean up uploaded photo:",
          data?.error || response.statusText,
        );
      }
    } catch (error) {
      console.error("Failed to clean up uploaded photo:", error);
    }
  }

  async function uploadPhotos(
    photoItems: FastAddItem[],
  ): Promise<Map<string, string>> {
    if (photoItems.length === 0) {
      return new Map();
    }

    const formData = new FormData();

    for (const item of photoItems) {
      if (!item.photo) {
        continue;
      }

      formData.append("files", item.photo, item.photoName || `${item.id}.webp`);
    }

    const response = await fetch("/api/github-upload", {
      method: "PUT",
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.error || "Foto's konden niet naar GitHub geüpload worden.",
      );
    }

    if (!Array.isArray(data?.images)) {
      throw new Error("GitHub gaf geen foto's terug.");
    }

    if (data.images.length !== photoItems.length) {
      throw new Error("Niet alle foto's zijn naar GitHub geüpload.");
    }

    const photoUrls = new Map<string, string>();

    photoItems.forEach((item, index) => {
      const uploadedImage = data.images[index];

      if (!uploadedImage?.url) {
        throw new Error("GitHub gaf geen geldige foto-URL terug.");
      }

      photoUrls.set(item.id, uploadedImage.url);
    });

    return photoUrls;
  }

  async function handleUploadCurrentList() {
    if (items.length === 0) {
      setError("De lijst is nog leeg.");
      return;
    }

    setUploading(true);
    setError("");
    setStatus("");
    setCopied(false);

    const uploadedPhotoUrls: string[] = [];

    try {
      const itemsWithPhotos = items.filter((item) => item.photo);

      const photoUrls = await uploadPhotos(itemsWithPhotos);

      for (const url of photoUrls.values()) {
        uploadedPhotoUrls.push(url);
      }

      const payload = items.map((item) => ({
        name: item.name,
        photo_url: photoUrls.get(item.id) || null,
      }));

      const response = await fetch("/api/items/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: payload,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "De items konden niet opgeslagen worden.",
        );
      }

      const skippedNames = new Set<string>(data?.skippedNames || []);

      const skippedPhotoUrls = payload
        .filter((item) => skippedNames.has(item.name) && item.photo_url)
        .map((item) => item.photo_url!);

      await Promise.all(
        skippedPhotoUrls.map((url) => deleteUploadedPhoto(url)),
      );

      const skippedPhotoUrlSet = new Set(skippedPhotoUrls);

      for (const url of skippedPhotoUrls) {
        const index = uploadedPhotoUrls.indexOf(url);

        if (index !== -1) {
          uploadedPhotoUrls.splice(index, 1);
        }
      }

      await clearStoredItems();

      for (const item of items) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }

      const insertedCount = data?.insertedCount ?? 0;
      const skippedCount = data?.skippedCount ?? 0;

      setItems([]);
      setStatus(
        `${insertedCount} item(s) toegevoegd.${skippedCount > 0 ? ` ${skippedCount} bestonden al en zijn overgeslagen.` : ""}`,
      );

      void skippedPhotoUrlSet;

      window.location.href = "/check?type=overdue";
    } catch (error) {
      console.error(error);

      await Promise.all(
        uploadedPhotoUrls.map((url) => deleteUploadedPhoto(url)),
      );

      setError(
        error instanceof Error
          ? error.message
          : "Upload mislukt. Je lokale lijst is behouden.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleClearList() {
    if (items.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Weet je zeker dat je de volledige lokale lijst wilt wissen?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await clearStoredItems();

      for (const item of items) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }

      setItems([]);
      setName("");
      setPhoto(null);

      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }

      setPhotoPreview("");
      setError("");
      setStatus("Lokale lijst gewist.");
      setCopied(false);
    } catch (error) {
      console.error(error);
      setError("De lokale lijst kon niet gewist worden.");
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

  return (
    <Container maxWidth="md">
      <Box sx={{ minHeight: "100vh", py: 4 }}>
        <Stack spacing={3}>
          <Button
            className="StyledButton3"
            component={Link}
            href="/stockchecker"
            startIcon={<ArrowBackOutlined />}
            sx={{ alignSelf: "flex-start", color: "inherit" }}
          >
            Terug
          </Button>

          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Fast add
            </Typography>

            <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
              Voeg producten lokaal toe zonder de database te gebruiken. Upload
              alles pas wanneer je klaar bent.
            </Typography>
          </Box>

          <Box className="StyledBox color-invert">
            <Stack component="form" spacing={2} onSubmit={handleAddItem}>
              <Button
                className="StyledButton3"
                component="label"
                variant="outlined"
                size="large"
                startIcon={<CameraAltOutlined />}
                fullWidth
                disabled={adding || uploading}
              >
                {photo ? "Andere foto nemen" : "Foto nemen"}

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={handlePhotoChange}
                />
              </Button>

              {photoPreview && (
                <Box
                  component="img"
                  src={photoPreview}
                  alt="Voorbeeld"
                  sx={{
                    width: "100%",
                    maxHeight: 280,
                    objectFit: "cover",
                    borderRadius: 2,
                  }}
                />
              )}

              <TextField
                inputRef={nameInputRef}
                label="Naam"
                placeholder="Bijvoorbeeld MELK HALF VOL 1L"
                value={name}
                onChange={(event) => setName(event.target.value)}
                fullWidth
                autoComplete="off"
                disabled={adding || uploading}
              />

              <Button
                className="StyledButton1"
                type="submit"
                variant="contained"
                size="large"
                startIcon={<AddOutlined />}
                disabled={adding || uploading}
                fullWidth
              >
                {adding ? "Toevoegen..." : "Item toevoegen"}
              </Button>
            </Stack>
          </Box>

          {error && <Typography color="error">{error}</Typography>}

          {status && <Typography color="text.secondary">{status}</Typography>}

          <Box className="StyledBox color-invert">
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="h6">
                  Huidige lijst ({items.length})
                </Typography>

                <Button
                  variant="text"
                  color="error"
                  startIcon={<DeleteSweepOutlined />}
                  onClick={handleClearList}
                  disabled={items.length === 0 || uploading}
                >
                  Alles wissen
                </Button>
              </Stack>

              {items.length === 0 ? (
                <Typography color="text.secondary">
                  Nog geen items toegevoegd.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {items.map((item, index) => (
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
                            borderRadius: 1.5,
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 58,
                            height: 58,
                            borderRadius: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "action.hover",
                            flexShrink: 0,
                          }}
                        >
                          <CameraAltOutlined sx={{ opacity: 0.5 }} />
                        </Box>
                      )}

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            wordBreak: "break-word",
                          }}
                        >
                          {index + 1}. {item.name}
                        </Typography>
                      </Box>

                      <IconButton
                        color="error"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={uploading}
                      >
                        <DeleteOutlineOutlined />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>

          <Box className="StyledBox color-invert">
            <Stack spacing={2}>
              <Typography variant="h6">Namenlijst</Typography>

              <Typography variant="body2" color="text.secondary">
                Deze lijst is exact wat je naar mij kunt sturen om de
                categorieën automatisch te laten bepalen.
              </Typography>

              <TextField
                multiline
                minRows={6}
                value={names}
                fullWidth
                slotProps={{
                  input: {
                    readOnly: true,
                  },
                }}
              />

              <Button
                className="StyledButton3"
                variant="outlined"
                startIcon={<ContentCopyOutlined />}
                onClick={handleSendList}
                disabled={items.length === 0 || uploading}
                fullWidth
              >
                {copied ? "Lijst gekopieerd" : "Send current list"}
              </Button>
            </Stack>
          </Box>

          <Button
            className="StyledButton1"
            variant="contained"
            size="large"
            startIcon={<CloudUploadOutlined />}
            onClick={handleUploadCurrentList}
            disabled={items.length === 0 || uploading}
            fullWidth
          >
            {uploading ? "Alles uploaden..." : "Upload current list"}
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: "center" }}
          >
            Upload gebruikt vervaldatum {PAST_EXPIRY_DATE} zodat alle nieuwe
            items voorlopig als overdue verschijnen.
          </Typography>
        </Stack>
      </Box>
    </Container>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import styles from "./ProductPhoto.module.css";

type ProductPhotoProps = {
  initialUrl?: string | null;
  onChange: (file: File | null, removed: boolean) => void;
  disabled?: boolean;
};

export default function ProductPhoto({
  initialUrl = null,
  onChange,
  disabled = false,
}: ProductPhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState(initialUrl || "");
  const [error, setError] = useState("");

  useEffect(() => {
    setPreview(initialUrl || "");
  }, [initialUrl]);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecteer een geldige afbeelding.");
      event.target.value = "";
      return;
    }

    setError("");
    setPreview(URL.createObjectURL(file));
    onChange(file, false);

    event.target.value = "";
  }

  function handleRemove() {
    setPreview("");
    setError("");
    onChange(null, true);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconBox}>
          <Camera size={22} />
        </div>

        <div>
          <h2>Foto</h2>
          <p>Voeg een foto toe of vervang de bestaande.</p>
        </div>
      </div>

      <div className={styles.content}>
        {preview ? (
          <div className={styles.preview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Productfoto" />
          </div>
        ) : (
          <div className={styles.placeholder}>
            <Camera size={32} />
            <span>Geen foto</span>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.changeButton}
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <Camera size={19} />
            {preview ? "Foto wijzigen" : "Foto toevoegen"}
          </button>

          {preview && (
            <button
              type="button"
              className={styles.removeButton}
              onClick={handleRemove}
              disabled={disabled}
            >
              <Trash2 size={19} />
              Foto verwijderen
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        disabled={disabled}
      />
    </section>
  );
}

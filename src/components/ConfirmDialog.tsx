"use client";

import { useEffect, useId, useRef } from "react";
import { Trash2, TriangleAlert } from "lucide-react";

import styles from "./ConfirmDialog.module.css";

type ConfirmDialogProps = {
  tone: "warning" | "danger";
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  tone,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const Icon = tone === "danger" ? Trash2 : TriangleAlert;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    cancelRef.current?.focus();

    return () => dialog.close();
  }, []);

  function dismiss(action: () => void) {
    dialogRef.current?.close();
    action();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      data-tone={tone}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        dismiss(onCancel);
      }}
    >
      <div className={styles.icon}>
        <Icon size={22} aria-hidden="true" />
      </div>

      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>

      <div className={styles.actions}>
        <button ref={cancelRef} type="button" onClick={() => dismiss(onCancel)}>
          Annuleren
        </button>
        <button
          type="button"
          className={styles.confirm}
          onClick={() => dismiss(onConfirm)}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

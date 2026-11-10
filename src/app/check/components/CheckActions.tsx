"use client";

import { ArrowLeft, Check, LoaderCircle, X } from "lucide-react";

import type { CheckType } from "../types";
import styles from "../page.module.css";

type CheckActionsProps = {
  type: CheckType;
  isEvening: boolean;
  isStickerQuestion: boolean;
  showDateInput: boolean;
  nextExpiryDate: string;
  todayString: string;
  saving: boolean;
  canGoBack: boolean;
  onYes: () => void;
  onNo: () => void;
  onSaveDate: () => void;
  onEveningNext: () => void;
  onBack: () => void;
};

export default function CheckActions({
  type,
  isEvening,
  isStickerQuestion,
  showDateInput,
  nextExpiryDate,
  todayString,
  saving,
  canGoBack,
  onYes,
  onNo,
  onSaveDate,
  onEveningNext,
  onBack,
}: CheckActionsProps) {
  const validDate = Boolean(nextExpiryDate) && nextExpiryDate >= todayString;

  const stickerNoLabel =
    type === "monthly" ? "Niet gestickerd" : "Niet aanwezig";

  return (
    <div className={styles.actionsContainer}>
      {isEvening ? (
        <button
          type="button"
          className={styles.primaryAction}
          onClick={onEveningNext}
          disabled={saving}
          aria-label="Opgehaald of verkocht, ga naar het volgende product"
        >
          {saving ? (
            <LoaderCircle size={20} className={styles.actionSpinner} />
          ) : (
            <Check size={20} />
          )}
          {saving ? "Opslaan..." : "Opgehaald of verkocht"}
        </button>
      ) : showDateInput ? (
        <button
          type="button"
          className={styles.primaryAction}
          onClick={onSaveDate}
          disabled={!validDate || saving}
        >
          {saving ? (
            <LoaderCircle size={20} className={styles.actionSpinner} />
          ) : (
            <Check size={20} />
          )}
          {saving ? "Opslaan..." : "Nieuwe datum opslaan"}
        </button>
      ) : (
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={onNo}
            disabled={saving}
          >
            <X size={21} />
            {isStickerQuestion ? stickerNoLabel : "Geen voorraad"}
          </button>

          <button
            type="button"
            className={styles.primaryAction}
            onClick={onYes}
            disabled={saving}
          >
            <Check size={21} />
            {isStickerQuestion ? "Gestickerd" : "Vervaldatum invullen"}
          </button>
        </div>
      )}

      {canGoBack && (
        <button
          type="button"
          className={styles.backAction}
          onClick={onBack}
          disabled={saving}
        >
          <ArrowLeft size={17} aria-hidden="true" />
          {showDateInput ? "Datumkeuze annuleren" : "Vorige controlestap"}
        </button>
      )}
    </div>
  );
}

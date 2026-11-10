"use client";

import { ArrowLeft, Check, LoaderCircle, X } from "lucide-react";
import CheckTileGlass from "@/components/home/CheckTileGlass";
import glass from "@/components/home/DateCheckGlass.module.css";

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

  const primaryClass = `${styles.primaryAction} ${glass.surface} ${glass.primary}`;

  return (
    <div
      className={`${styles.actionsContainer} ${glass.surface} ${glass.sticky}`}
    >
      <CheckTileGlass className={glass.marker} />

      {isEvening ? (
        <button
          type="button"
          className={primaryClass}
          onClick={onEveningNext}
          disabled={saving}
          aria-label="Opgehaald of verkocht, ga naar het volgende product"
        >
          <CheckTileGlass foreground className={glass.tint} />
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
          className={primaryClass}
          onClick={onSaveDate}
          disabled={!validDate || saving}
        >
          <CheckTileGlass foreground className={glass.tint} />
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
            className={`${styles.secondaryAction} ${glass.surface} ${glass.warning}`}
            onClick={onNo}
            disabled={saving}
          >
            <CheckTileGlass foreground className={glass.tint} />
            <X size={21} />
            {isStickerQuestion ? stickerNoLabel : "Geen voorraad"}
          </button>

          <button
            type="button"
            className={primaryClass}
            onClick={onYes}
            disabled={saving}
          >
            <CheckTileGlass foreground className={glass.tint} />
            <Check size={21} />
            {isStickerQuestion ? "Gestickerd" : "Vervaldatum invullen"}
          </button>
        </div>
      )}

      {canGoBack && (
        <button
          type="button"
          className={`${styles.backAction} ${glass.surface}`}
          onClick={onBack}
          disabled={saving}
        >
          <CheckTileGlass foreground />
          <ArrowLeft size={17} aria-hidden="true" />
          {showDateInput ? "Datumkeuze annuleren" : "Vorige controlestap"}
        </button>
      )}
    </div>
  );
}

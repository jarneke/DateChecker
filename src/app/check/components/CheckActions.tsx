"use client";

import { ArrowLeft, Check, LoaderCircle, X } from "lucide-react";

import styles from "../page.module.css";

type CheckActionsProps = {
  isEvening: boolean;
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
  isEvening,
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

  return (
    <div className={styles.actionsContainer}>
      {isEvening ? (
        <button
          type="button"
          className={styles.primaryAction}
          onClick={onEveningNext}
          disabled={saving}
        >
          {saving ? (
            <LoaderCircle size={20} className={styles.actionSpinner} />
          ) : (
            <Check size={20} />
          )}

          {saving ? "Opslaan..." : "Gecontroleerd — volgend item"}
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
            Nee
          </button>

          <button
            type="button"
            className={styles.primaryAction}
            onClick={onYes}
            disabled={saving}
          >
            <Check size={21} />
            Ja
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
          <ArrowLeft size={17} />
          Terug
        </button>
      )}
    </div>
  );
}

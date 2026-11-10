import { ArrowLeft, ArrowRight } from "lucide-react";

import styles from "../page.module.css";

type CheckSwipeHintProps = {
  swipeLeftText?: string;
  swipeRightText?: string;
};

export default function CheckSwipeHint({
  swipeLeftText,
  swipeRightText,
}: CheckSwipeHintProps) {
  if (!swipeLeftText && !swipeRightText) return null;

  return (
    <div className={styles.swipeHint}>
      {swipeLeftText && (
        <>
          <ArrowLeft size={15} aria-hidden="true" />
          <span>{swipeLeftText}</span>
        </>
      )}

      <span className={styles.swipeDivider}>
        {swipeLeftText && <span aria-hidden="true">– </span>}
        <em>swipe</em>
        {swipeRightText && <span aria-hidden="true"> –</span>}
      </span>

      {swipeRightText && (
        <>
          <span>{swipeRightText}</span>
          <ArrowRight size={15} aria-hidden="true" />
        </>
      )}
    </div>
  );
}

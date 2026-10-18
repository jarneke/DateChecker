import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <SearchX size={34} aria-hidden="true" />
        </div>

        <span className={styles.label}>404</span>
        <h1>Pagina niet gevonden</h1>
        <p>
          Deze pagina bestaat niet of is verplaatst. Ga terug naar het overzicht
          om verder te gaan.
        </p>

        <Link href="/" className={styles.button}>
          <ArrowLeft size={18} aria-hidden="true" />
          Naar het overzicht
        </Link>
      </div>
    </main>
  );
}

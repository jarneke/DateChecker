"use client";

import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import styles from "./LogoutButton.module.css";

export default function LogoutButton() {
  const pathname = usePathname();

  if (pathname !== "/admin") {
    return null;
  }

  return (
    <form action="/api/logout" method="post" className={styles.form}>
      <button type="submit" className={styles.button}>
        <LogOut size={17} aria-hidden="true" />
        Uitloggen
      </button>
    </form>
  );
}

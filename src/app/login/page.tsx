"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (pin.length !== 6) {
      return;
    }

    setError("");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pin }),
    });

    if (!response.ok) {
      setPin("");
      setError("Incorrect PIN.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 px-6"
      >
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Enter PIN</h1>

          <p className="mt-2 text-sm text-zinc-400">
            Enter your 6-digit PIN to continue.
          </p>
        </div>

        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, ""));

            setError("");
          }}
          autoFocus
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-zinc-400"
          placeholder="••••••"
        />

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pin.length !== 6}
          className="rounded-lg bg-white px-4 py-3 font-medium text-black disabled:opacity-30"
        >
          Unlock
        </button>
      </form>
    </main>
  );
}

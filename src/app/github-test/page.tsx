"use client";

import { useState } from "react";

export default function GitHubTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!file) {
      setMessage("Select an image first.");
      return;
    }

    setMessage("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/github-upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.details || data.error || "Upload failed.");
      return;
    }

    setMessage(`Success: ${data.url}`);
  }

  return (
    <main className="p-10">
      <h1>GitHub Upload Test</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
        }}
      />

      <br />
      <br />

      <button onClick={handleUpload}>Upload</button>

      <p>{message}</p>
    </main>
  );
}

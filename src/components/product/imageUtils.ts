
/**
 * Compress a product photo to WebP.
 *
 * Maximum dimensions: 800 × 800
 * WebP quality: 80%
 */
export function compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const maxSize = 800;

            let width = image.naturalWidth;
            let height = image.naturalHeight;

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round((height / width) * maxSize);
                    width = maxSize;
                } else {
                    width = Math.round((width / height) * maxSize);
                    height = maxSize;
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d");

            if (!context) {
                reject(
                    new Error("Afbeelding kon niet verwerkt worden."),
                );
                return;
            }

            context.drawImage(image, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "Afbeelding kon niet gecomprimeerd worden.",
                            ),
                        );
                        return;
                    }

                    const compressedFile = new File(
                        [blob],
                        `${file.name.replace(/\.[^/.]+$/, "")}.webp`,
                        {
                            type: "image/webp",
                            lastModified: Date.now(),
                        },
                    );

                    resolve(compressedFile);
                },
                "image/webp",
                0.8,
            );
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(
                new Error("Afbeelding kon niet gelezen worden."),
            );
        };

        image.src = objectUrl;
    });
}

/**
 * Compress and upload a product photo to GitHub.
 *
 * Returns the uploaded image URL.
 */
export async function uploadProductPhoto(
    file: File,
): Promise<string> {
    const compressedPhoto = await compressImage(file);

    const formData = new FormData();
    formData.append("file", compressedPhoto);

    const response = await fetch("/api/github-upload", {
        method: "POST",
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.details ||
            data?.error ||
            "Foto kon niet geüpload worden.",
        );
    }

    if (typeof data?.url !== "string" || !data.url) {
        throw new Error(
            "De upload gaf geen geldige foto-URL terug.",
        );
    }

    return data.url;
}

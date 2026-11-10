const MAX_LAYER_EDGE = 2048;

export function createGlassPhotoLayer(schedule: () => void) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const sources = new WeakMap<HTMLImageElement, {
        url: string;
        image: HTMLImageElement;
    }>();

    return {
        render(photos: HTMLImageElement[], width: number, height: number) {
            if (!context || width <= 0 || height <= 0) return null;

            const density = Math.min(1, MAX_LAYER_EDGE / Math.max(width, height));
            const pixelWidth = Math.max(1, Math.round(width * density));
            const pixelHeight = Math.max(1, Math.round(height * density));

            if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
                canvas.width = pixelWidth;
                canvas.height = pixelHeight;
            }

            context.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
            context.clearRect(0, 0, width, height);

            let painted = false;

            for (const photo of new Set(photos)) {
                const url = photo.currentSrc || photo.src;
                if (!url || !photo.complete || !photo.naturalWidth) continue;

                let source = sources.get(photo);

                if (source?.url !== url) {
                    const image = new Image();
                    image.crossOrigin = "anonymous";
                    image.addEventListener("load", schedule, { once: true });
                    image.src = url;
                    source = { url, image };
                    sources.set(photo, source);
                }

                const { image } = source;
                if (!image.complete || !image.naturalWidth) continue;

                const rect = photo.getBoundingClientRect();
                const fit = Math.min(
                    rect.width / image.naturalWidth,
                    rect.height / image.naturalHeight,
                );
                if (fit <= 0) continue;

                const photoWidth = image.naturalWidth * fit;
                const photoHeight = image.naturalHeight * fit;

                context.drawImage(
                    image,
                    rect.left + (rect.width - photoWidth) / 2,
                    rect.top + (rect.height - photoHeight) / 2,
                    photoWidth,
                    photoHeight,
                );

                painted = true;
            }

            return painted ? canvas : null;
        },
    };
}

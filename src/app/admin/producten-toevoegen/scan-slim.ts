export type OcrWorker = {
    recognize: (image: Blob) => Promise<{
        data: {
            text: string;
            confidence: number;
        };
    }>;
    setParameters: (
        parameters: Record<string, string>,
    ) => Promise<unknown>;
    terminate: () => Promise<unknown>;
};

type Glyph = {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    bottom: number;
};

type TextLine = {
    centerX: number;
    centerY: number;
    width: number;
    height: number;
    angle: number;
    score: number;
};

type CvMat = {
    rows: number;
    cols: number;
    delete: () => void;
};

type CvVector = {
    size: () => number;
    get: (index: number) => CvMat;
    delete: () => void;
};

type CvSize = {
    width: number;
    height: number;
};

type CvApi = {
    Mat: new () => CvMat;
    MatVector: new () => CvVector;
    Size: new (width: number, height: number) => CvSize;
    COLOR_RGBA2GRAY: number;
    ADAPTIVE_THRESH_GAUSSIAN_C: number;
    THRESH_BINARY_INV: number;
    THRESH_OTSU: number;
    MORPH_RECT: number;
    MORPH_OPEN: number;
    RETR_EXTERNAL: number;
    CHAIN_APPROX_SIMPLE: number;
    CV_32FC2: number;
    INTER_CUBIC: number;
    BORDER_REPLICATE: number;
    imread: (canvas: HTMLCanvasElement) => CvMat;
    imshow: (canvas: HTMLCanvasElement, image: CvMat) => void;
    cvtColor: (source: CvMat, target: CvMat, code: number) => void;
    adaptiveThreshold: (
        source: CvMat,
        target: CvMat,
        maximum: number,
        method: number,
        type: number,
        blockSize: number,
        constant: number,
    ) => void;
    threshold: (
        source: CvMat,
        target: CvMat,
        threshold: number,
        maximum: number,
        type: number,
    ) => void;
    findContours: (
        source: CvMat,
        contours: CvVector,
        hierarchy: CvMat,
        mode: number,
        method: number,
    ) => void;
    boundingRect: (contour: CvMat) => {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    contourArea: (contour: CvMat) => number;
    getStructuringElement: (shape: number, size: CvSize) => CvMat;
    morphologyEx: (
        source: CvMat,
        target: CvMat,
        operation: number,
        kernel: CvMat,
    ) => void;
    subtract: (a: CvMat, b: CvMat, target: CvMat) => void;
    bitwise_not: (source: CvMat, target: CvMat) => void;
    matFromArray: (
        rows: number,
        columns: number,
        type: number,
        values: number[],
    ) => CvMat;
    getPerspectiveTransform: (source: CvMat, target: CvMat) => CvMat;
    warpPerspective: (
        source: CvMat,
        target: CvMat,
        matrix: CvMat,
        size: CvSize,
        interpolation: number,
        borderMode: number,
    ) => void;
};

type CvRuntime = CvApi & {
    then?: (
        ready: (runtime: CvRuntime) => void,
        failed: (cause: unknown) => void,
    ) => unknown;
    onRuntimeInitialized?: () => void;
};

type Reading = {
    name: string;
    confidence: number;
    image: Blob;
};

let cvPromise: Promise<{ cv: CvApi }> | null = null;

function loadCv(): Promise<{ cv: CvApi }> {
    if (cvPromise) return cvPromise;

    cvPromise = new Promise((resolve, reject) => {
        const existing = (
            window as unknown as { cv?: CvRuntime }
        ).cv;

        if (existing && typeof existing.Mat === "function") {
            resolve({ cv: existing });
            return;
        }

        const script = document.createElement("script");
        script.src =
            "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js";
        script.async = true;

        const timer = window.setTimeout(() => {
            fail(new Error("De etiketscanner kon niet op tijd geladen worden."));
        }, 60000);

        function fail(cause: unknown) {
            window.clearTimeout(timer);
            script.remove();

            reject(
                cause instanceof Error
                    ? cause
                    : new Error("De etiketscanner kon niet geladen worden."),
            );
        }

        function ready(runtime: CvRuntime) {
            if (typeof runtime.Mat !== "function") {
                fail(new Error("De etiketscanner kon niet gestart worden."));
                return;
            }

            window.clearTimeout(timer);
            resolve({ cv: runtime });
        }

        script.onerror = () => {
            fail(new Error("De etiketscanner kon niet gedownload worden."));
        };

        script.onload = () => {
            const runtime = (
                window as unknown as { cv?: CvRuntime }
            ).cv;

            if (!runtime) {
                fail(new Error("De etiketscanner is niet beschikbaar."));
                return;
            }

            if (typeof runtime.Mat === "function") {
                ready(runtime);
            } else if (typeof runtime.then === "function") {
                runtime.then(ready, fail);
            } else {
                runtime.onRuntimeInitialized = () => ready(runtime);
            }
        };

        document.head.appendChild(script);
    });

    void cvPromise.catch(() => {
        cvPromise = null;
    });

    return cvPromise;
}

function createCanvas(width: number, height: number) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));

    return canvas;
}

function contextFor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("De foto kon niet verwerkt worden.");
    }

    return context;
}

async function loadImage(
    file: File,
    maximumSize: number,
): Promise<HTMLCanvasElement> {
    if (!file.type.startsWith("image/")) {
        throw new Error("Kies een geldige foto.");
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    try {
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () =>
                reject(new Error("Deze foto kon niet gelezen worden."));
            image.src = url;
        });

        const scale = Math.min(
            1,
            maximumSize / Math.max(image.naturalWidth, image.naturalHeight),
        );

        const canvas = createCanvas(
            image.naturalWidth * scale,
            image.naturalHeight * scale,
        );

        const context = contextFor(canvas);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        return canvas;
    } finally {
        URL.revokeObjectURL(url);
    }
}

function canvasBlob(
    canvas: HTMLCanvasElement,
    type = "image/png",
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("De foto kon niet verwerkt worden."));
                }
            },
            type,
            0.9,
        );
    });
}

export async function prepareImage(
    file: File,
    maximumSize: number,
): Promise<Blob> {
    return canvasBlob(await loadImage(file, maximumSize), "image/jpeg");
}

function findTextLines(cv: CvApi, source: CvMat): TextLine[] {
    const gray = new cv.Mat();
    const binary = new cv.Mat();
    const hierarchy = new cv.Mat();
    const contours = new cv.MatVector();
    const glyphs: Glyph[] = [];

    try {
        cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);

        cv.adaptiveThreshold(
            gray,
            binary,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY_INV,
            35,
            12,
        );

        cv.findContours(
            binary,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE,
        );

        // Zoek eerst vormen met de afmetingen van afzonderlijke letters.
        // Lange plastic randen en grote prijscijfers vallen daardoor af.
        for (let index = 0; index < contours.size(); index++) {
            const contour = contours.get(index);

            try {
                const box = cv.boundingRect(contour);
                const area = cv.contourArea(contour);
                const relativeY = (box.y + box.height / 2) / source.rows;

                if (
                    box.height < source.rows * 0.009 ||
                    box.height > source.rows * 0.045 ||
                    box.width < 2 ||
                    box.width > box.height * 3.5 ||
                    area < 12 ||
                    area / (box.width * box.height) < 0.08 ||
                    relativeY < 0.2 ||
                    relativeY > 0.78
                ) {
                    continue;
                }

                glyphs.push({
                    ...box,
                    centerX: box.x + box.width / 2,
                    bottom: box.y + box.height,
                });
            } finally {
                contour.delete();
            }
        }

        const parents = glyphs.map((_, index) => index);

        function findRoot(index: number): number {
            while (parents[index] !== index) {
                parents[index] = parents[parents[index]];
                index = parents[index];
            }

            return index;
        }

        // Verbind naburige letters van ongeveer dezelfde hoogte.
        for (let first = 0; first < glyphs.length; first++) {
            for (let second = first + 1; second < glyphs.length; second++) {
                const a = glyphs[first];
                const b = glyphs[second];

                const height = Math.max(a.height, b.height);
                const heightRatio = Math.min(a.height, b.height) / height;

                const gap =
                    Math.max(a.x, b.x) -
                    Math.min(a.x + a.width, b.x + b.width);

                if (
                    heightRatio < 0.65 ||
                    gap > height * 3 ||
                    gap < -height * 0.8 ||
                    Math.abs(a.bottom - b.bottom) > height * 0.6
                ) {
                    continue;
                }

                parents[findRoot(second)] = findRoot(first);
            }
        }

        const groups = new Map<number, Glyph[]>();

        for (let index = 0; index < glyphs.length; index++) {
            const root = findRoot(index);
            const group = groups.get(root);

            if (group) {
                group.push(glyphs[index]);
            } else {
                groups.set(root, [glyphs[index]]);
            }
        }

        const lines: TextLine[] = [];

        for (const group of groups.values()) {
            if (group.length < 5) continue;

            const heights = group
                .map((glyph) => glyph.height)
                .sort((a, b) => a - b);

            const height = heights[Math.floor(heights.length / 2)];
            const left = Math.min(...group.map((glyph) => glyph.x));
            const right = Math.max(
                ...group.map((glyph) => glyph.x + glyph.width),
            );

            const width = right - left;

            if (width < source.cols * 0.23 || width / height < 5) {
                continue;
            }

            const meanX =
                group.reduce((sum, glyph) => sum + glyph.centerX, 0) /
                group.length;

            const meanY =
                group.reduce((sum, glyph) => sum + glyph.bottom, 0) /
                group.length;

            let numerator = 0;
            let denominator = 0;

            for (const glyph of group) {
                const differenceX = glyph.centerX - meanX;

                numerator += differenceX * (glyph.bottom - meanY);
                denominator += differenceX * differenceX;
            }

            const slope = denominator ? numerator / denominator : 0;
            const angle = (Math.atan(slope) * 180) / Math.PI;

            if (Math.abs(angle) > 16) continue;

            const residual =
                group.reduce(
                    (sum, glyph) =>
                        sum +
                        Math.abs(
                            glyph.bottom -
                            (meanY + slope * (glyph.centerX - meanX)),
                        ),
                    0,
                ) / group.length;

            if (residual > height * 0.3) continue;

            const centerX = (left + right) / 2;
            const centerY =
                meanY + slope * (centerX - meanX) - height / 2;

            const relativeY = centerY / source.rows;

            lines.push({
                centerX,
                centerY,
                width: width / Math.cos((angle * Math.PI) / 180),
                height,
                angle,
                score:
                    (width / source.cols) * 0.65 -
                    Math.abs(relativeY - 0.5) * 1.4 +
                    (height / source.rows) * 3,
            });
        }

        return lines
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    } finally {
        gray.delete();
        binary.delete();
        hierarchy.delete();
        contours.delete();
    }
}

function extractTextLine(
    cv: CvApi,
    source: CvMat,
    line: TextLine,
    scaleX: number,
    scaleY: number,
): HTMLCanvasElement {
    const allocated: CvMat[] = [];

    function keep(matrix: CvMat) {
        allocated.push(matrix);
        return matrix;
    }

    try {
        const angle = (line.angle * Math.PI) / 180;
        const horizontalX = Math.cos(angle);
        const horizontalY = Math.sin(angle);
        const verticalX = -horizontalY;
        const verticalY = horizontalX;

        const halfWidth = line.width / 2 + line.height * 0.4;
        const halfHeight = line.height * 0.8;

        const points = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
        ].flatMap(([x, y]) => [
            (
                line.centerX +
                x * horizontalX * halfWidth +
                y * verticalX * halfHeight
            ) * scaleX,
            (
                line.centerY +
                x * horizontalY * halfWidth +
                y * verticalY * halfHeight
            ) * scaleY,
        ]);

        const width = Math.min(
            2000,
            Math.max(1000, Math.round(halfWidth * 2 * scaleX * 1.5)),
        );

        const height = Math.max(
            50,
            Math.round((width * halfHeight) / halfWidth),
        );

        const from = keep(
            cv.matFromArray(4, 1, cv.CV_32FC2, points),
        );

        const to = keep(
            cv.matFromArray(4, 1, cv.CV_32FC2, [
                0, 0,
                width - 1, 0,
                width - 1, height - 1,
                0, height - 1,
            ]),
        );

        const transform = keep(cv.getPerspectiveTransform(from, to));
        const corrected = keep(new cv.Mat());

        cv.warpPerspective(
            source,
            corrected,
            transform,
            new cv.Size(width, height),
            cv.INTER_CUBIC,
            cv.BORDER_REPLICATE,
        );

        const canvas = createCanvas(width, height);
        cv.imshow(canvas, corrected);

        return canvas;
    } finally {
        for (const matrix of allocated.reverse()) {
            matrix.delete();
        }
    }
}

function cleanTextLine(
    cv: CvApi,
    canvas: HTMLCanvasElement,
): HTMLCanvasElement {
    const allocated: CvMat[] = [];

    function keep(matrix: CvMat) {
        allocated.push(matrix);
        return matrix;
    }

    try {
        const source = keep(cv.imread(canvas));
        const gray = keep(new cv.Mat());
        const binary = keep(new cv.Mat());
        const vertical = keep(new cv.Mat());
        const cleaned = keep(new cv.Mat());
        const monochrome = keep(new cv.Mat());

        const kernel = keep(
            cv.getStructuringElement(
                cv.MORPH_RECT,
                new cv.Size(1, Math.max(3, Math.round(canvas.height * 0.82))),
            ),
        );

        cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);

        cv.threshold(
            gray,
            binary,
            0,
            255,
            cv.THRESH_BINARY_INV | cv.THRESH_OTSU,
        );

        // Verwijder verticale lijnen die bijna de volledige strookhoogte
        // beslaan. Normale letters hebben boven en onder extra marge.
        cv.morphologyEx(binary, vertical, cv.MORPH_OPEN, kernel);
        cv.subtract(binary, vertical, cleaned);
        cv.bitwise_not(cleaned, monochrome);

        const result = createCanvas(canvas.width, canvas.height);
        cv.imshow(result, monochrome);

        const padded = createCanvas(
            result.width + 48,
            result.height + 32,
        );

        const context = contextFor(padded);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, padded.width, padded.height);
        context.drawImage(result, 24, 16);

        return padded;
    } finally {
        for (const matrix of allocated.reverse()) {
            matrix.delete();
        }
    }
}

function readableName(text: string, confidence: number): string {
    const name = text
        .replace(/\s+/g, " ")
        .replace(/^\s*\|\s*/, "")
        .trim()
        .toUpperCase();

    const letters = name.match(/\p{L}/gu)?.length ?? 0;
    const allowed =
        name.match(/[\p{L}\p{N}\s/.,%()+&:'-]/gu)?.length ?? 0;

    if (
        !Number.isFinite(confidence) ||
        confidence < 65 ||
        letters < 5 ||
        name.length > 120 ||
        allowed / Math.max(1, name.length) < 0.9 ||
        /€|\d{8,}|\/\s*(?:KG|LIT)\b|\b(?:EUR|BARCODE|EAN)\b/i.test(name)
    ) {
        return "";
    }

    return name;
}

async function readTextLine(
    worker: OcrWorker,
    image: Blob,
): Promise<Reading | null> {
    const result = await worker.recognize(image);
    const confidence = result.data.confidence;
    const name = readableName(result.data.text, confidence);

    return name ? { name, confidence, image } : null;
}

export async function scanSlim(
    file: File,
    pendingWorker: Promise<OcrWorker>,
    report: (message: string) => void,
    showStrip: (image: Blob) => void,
): Promise<{ name: string; confidence: number }> {
    report("Etiketscanner voorbereiden…");

    const [{ cv }, original, worker] = await Promise.all([
        loadCv(),
        loadImage(file, 2200),
        pendingWorker,
    ]);

    report("Productnaam zoeken…");

    const scale = Math.min(
        1,
        1400 / Math.max(original.width, original.height),
    );

    const reduced = createCanvas(
        original.width * scale,
        original.height * scale,
    );

    contextFor(reduced).drawImage(
        original,
        0,
        0,
        reduced.width,
        reduced.height,
    );

    const detectionSource = cv.imread(reduced);
    let lines: TextLine[];

    try {
        lines = findTextLines(cv, detectionSource);
    } finally {
        detectionSource.delete();
    }

    if (lines.length === 0) {
        throw new Error(
            "Geen duidelijke naamregel gevonden. Fotografeer één slimmetje van dichtbij, ongeveer in het midden van de foto.",
        );
    }

    await worker.setParameters({
        tessedit_pageseg_mode: "7",
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
    });

    const source = cv.imread(original);

    try {
        for (let index = 0; index < lines.length; index++) {
            report(
                "Naamstrook lezen… " + (index + 1) + "/" + lines.length,
            );

            const stripCanvas = extractTextLine(
                cv,
                source,
                lines[index],
                original.width / reduced.width,
                original.height / reduced.height,
            );

            const originalStrip = await canvasBlob(stripCanvas);

            if (index === 0) {
                showStrip(originalStrip);
            }

            const originalReading = await readTextLine(
                worker,
                originalStrip,
            );

            report("Naamstrook zonder plastic lijnen lezen…");

            const cleanedStrip = await canvasBlob(
                cleanTextLine(cv, stripCanvas),
            );

            const cleanedReading = await readTextLine(
                worker,
                cleanedStrip,
            );

            let best = originalReading;

            if (
                cleanedReading &&
                (!best || cleanedReading.confidence > best.confidence)
            ) {
                best = cleanedReading;
            }

            if (best) {
                showStrip(best.image);

                return {
                    name: best.name,
                    confidence: best.confidence,
                };
            }
        }
    } finally {
        source.delete();
    }

    throw new Error(
        "De naam kon niet duidelijk gelezen worden. Controleer of het kaartje goed in de houder zit en neem een scherpere foto.",
    );
}
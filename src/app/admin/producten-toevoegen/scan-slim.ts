export type OcrWorker = {
    recognize: (image: Blob) => Promise<{
        data: {
            text: string;
            confidence: number;
        };
    }>;
    setParameters: (parameters: Record<string, string>) => Promise<unknown>;
    terminate: () => Promise<unknown>;
};

type Point = {
    x: number;
    y: number;
};

type Candidate = {
    points: Point[];
    ratio: number;
    score: number;
};

type CvMat = {
    rows: number;
    cols: number;
    data32S: Int32Array;
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
    MORPH_RECT: number;
    MORPH_CLOSE: number;
    THRESH_BINARY: number;
    THRESH_OTSU: number;
    RETR_LIST: number;
    CHAIN_APPROX_SIMPLE: number;
    CV_32FC2: number;
    imread: (canvas: HTMLCanvasElement) => CvMat;
    imshow: (canvas: HTMLCanvasElement, image: CvMat) => void;
    cvtColor: (source: CvMat, target: CvMat, code: number) => void;
    GaussianBlur: (
        source: CvMat,
        target: CvMat,
        size: CvSize,
        sigma: number,
    ) => void;
    Canny: (
        source: CvMat,
        target: CvMat,
        lower: number,
        upper: number,
    ) => void;
    threshold: (
        source: CvMat,
        target: CvMat,
        threshold: number,
        maximum: number,
        type: number,
    ) => void;
    getStructuringElement: (shape: number, size: CvSize) => CvMat;
    morphologyEx: (
        source: CvMat,
        target: CvMat,
        operation: number,
        kernel: CvMat,
    ) => void;
    findContours: (
        source: CvMat,
        contours: CvVector,
        hierarchy: CvMat,
        mode: number,
        method: number,
    ) => void;
    contourArea: (contour: CvMat) => number;
    convexHull: (
        source: CvMat,
        target: CvMat,
        clockwise: boolean,
        returnPoints: boolean,
    ) => void;
    arcLength: (contour: CvMat, closed: boolean) => number;
    approxPolyDP: (
        source: CvMat,
        target: CvMat,
        epsilon: number,
        closed: boolean,
    ) => void;
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
    ) => void;
};

type CvRuntime = CvApi & {
    then?: (
        ready: (runtime: CvRuntime) => void,
        failed: (cause: unknown) => void,
    ) => unknown;
    onRuntimeInitialized?: () => void;
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

            // De wrapper voorkomt problemen met de then-functie van OpenCV.
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

function distance(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function orderCorners(points: Point[]): Point[] {
    const sorted = [...points].sort((a, b) => a.y - b.y);
    const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = sorted.slice(2).sort((a, b) => a.x - b.x);

    return [top[0], top[1], bottom[1], bottom[0]];
}

function findCandidates(cv: CvApi, source: CvMat): Candidate[] {
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const mask = new cv.Mat();
    const closed = new cv.Mat();
    const hierarchy = new cv.Mat();
    const kernel = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(5, 5),
    );

    const candidates: Candidate[] = [];

    try {
        cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

        // Zowel randen als verschillende helderheidsniveaus onderzoeken.
        // Hierdoor is een donkere achtergrond geen vereiste.
        for (const threshold of [-1, 0, 130, 175, 210]) {
            if (threshold === -1) {
                cv.Canny(blurred, mask, 40, 120);
            } else {
                cv.threshold(
                    blurred,
                    mask,
                    threshold,
                    255,
                    cv.THRESH_BINARY | (threshold === 0 ? cv.THRESH_OTSU : 0),
                );
            }

            cv.morphologyEx(mask, closed, cv.MORPH_CLOSE, kernel);

            const contours = new cv.MatVector();

            try {
                cv.findContours(
                    closed,
                    contours,
                    hierarchy,
                    cv.RETR_LIST,
                    cv.CHAIN_APPROX_SIMPLE,
                );

                for (let index = 0; index < contours.size(); index++) {
                    const contour = contours.get(index);
                    const hull = new cv.Mat();
                    const polygon = new cv.Mat();

                    try {
                        const area = cv.contourArea(contour);
                        const fraction = area / (source.cols * source.rows);

                        if (fraction < 0.04 || fraction > 0.96) continue;

                        cv.convexHull(contour, hull, false, true);
                        const perimeter = cv.arcLength(hull, true);

                        for (const epsilon of [0.02, 0.04, 0.065]) {
                            cv.approxPolyDP(
                                hull,
                                polygon,
                                perimeter * epsilon,
                                true,
                            );

                            if (polygon.rows !== 4) continue;

                            const points = orderCorners(
                                Array.from({ length: 4 }, (_, pointIndex) => ({
                                    x: polygon.data32S[pointIndex * 2],
                                    y: polygon.data32S[pointIndex * 2 + 1],
                                })),
                            );

                            const topWidth = distance(points[0], points[1]);
                            const bottomWidth = distance(points[3], points[2]);
                            const width = (topWidth + bottomWidth) / 2;
                            const height =
                                (distance(points[0], points[3]) +
                                    distance(points[1], points[2])) /
                                2;

                            const ratio = width / height;

                            if (
                                ratio < 1.15 ||
                                ratio > 2.5 ||
                                width < 160 ||
                                height < 90
                            ) {
                                continue;
                            }

                            const polygonArea = cv.contourArea(polygon);
                            if (polygonArea <= 0) continue;

                            const fill = area / polygonArea;
                            const parallel =
                                Math.min(topWidth, bottomWidth) /
                                Math.max(topWidth, bottomWidth);

                            if (fill < 0.7 || fill > 1.12 || parallel < 0.55) {
                                continue;
                            }

                            const duplicate = candidates.some((candidate) =>
                                candidate.points.every(
                                    (point, pointIndex) =>
                                        distance(point, points[pointIndex]) < 25,
                                ),
                            );

                            if (!duplicate) {
                                candidates.push({
                                    points,
                                    ratio,
                                    score:
                                        fraction * 2 +
                                        fill -
                                        Math.abs(Math.log(ratio / 1.6)) * 0.5,
                                });
                            }

                            break;
                        }
                    } finally {
                        contour.delete();
                        hull.delete();
                        polygon.delete();
                    }
                }
            } finally {
                contours.delete();
            }
        }

        return candidates
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    } finally {
        gray.delete();
        blurred.delete();
        mask.delete();
        closed.delete();
        hierarchy.delete();
        kernel.delete();
    }
}

function extractNameStrip(
    cv: CvApi,
    source: CvMat,
    candidate: Candidate,
    scaleX: number,
    scaleY: number,
): HTMLCanvasElement {
    const allocated: CvMat[] = [];

    function keep(matrix: CvMat) {
        allocated.push(matrix);
        return matrix;
    }

    try {
        const width = 1600;
        const height = Math.round(width / candidate.ratio);

        const from = keep(
            cv.matFromArray(
                4,
                1,
                cv.CV_32FC2,
                candidate.points.flatMap((point) => [
                    point.x * scaleX,
                    point.y * scaleY,
                ]),
            ),
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
        );

        const label = createCanvas(width, height);
        cv.imshow(label, corrected);

        // Bij deze slim-indeling staat de productnaam bovenaan.
        const left = 24;
        const top = Math.round(height * 0.02);
        const stripWidth = 1552;
        const stripHeight = Math.round(height * 0.2);
        const strip = createCanvas(stripWidth, stripHeight);

        contextFor(strip).drawImage(
            label,
            left,
            top,
            stripWidth,
            stripHeight,
            0,
            0,
            strip.width,
            strip.height,
        );

        return strip;
    } finally {
        for (const matrix of allocated.reverse()) {
            matrix.delete();
        }
    }
}

function readableName(text: string, confidence: number): string {
    const name = text.replace(/\s+/g, " ").trim().toUpperCase();
    const letters = name.match(/\p{L}/gu)?.length ?? 0;
    const allowed = name.match(/[\p{L}\p{N}\s/.,%()+&:'-]/gu)?.length ?? 0;

    if (
        !Number.isFinite(confidence) ||
        confidence < 65 ||
        letters < 5 ||
        name.length > 120 ||
        allowed / Math.max(1, name.length) < 0.9 ||
        /€|\d{8,}|\/\s*KG\b|\b(?:EUR|BARCODE|EAN)\b/i.test(name)
    ) {
        return "";
    }

    return name;
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

    report("Etiket zoeken…");

    const scale = Math.min(
        1,
        960 / Math.max(original.width, original.height),
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
    let candidates: Candidate[];

    try {
        candidates = findCandidates(cv, detectionSource);
    } finally {
        detectionSource.delete();
    }

    if (candidates.length === 0) {
        throw new Error(
            "Geen volledig etiket gevonden. Fotografeer één slim rechtop en zorg dat de vier randen zichtbaar zijn.",
        );
    }

    await worker.setParameters({
        tessedit_pageseg_mode: "7",
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
    });

    const source = cv.imread(original);
    let best: { name: string; confidence: number; strip: Blob } | null =
        null;

    try {
        for (let index = 0; index < candidates.length; index++) {
            report(`Naamstrook lezen… ${index + 1}/${candidates.length}`);

            const stripCanvas = extractNameStrip(
                cv,
                source,
                candidates[index],
                original.width / reduced.width,
                original.height / reduced.height,
            );

            const strip = await canvasBlob(stripCanvas);

            if (index === 0) showStrip(strip);

            const result = await worker.recognize(strip);
            const confidence = result.data.confidence;
            const name = readableName(result.data.text, confidence);

            if (name && (!best || confidence > best.confidence)) {
                best = { name, confidence, strip };
                showStrip(strip);
            }

            if (best && best.confidence >= 85) break;
        }
    } finally {
        source.delete();
    }

    if (!best) {
        throw new Error(
            "De naam kon niet duidelijk gelezen worden. Controleer de getoonde strook en neem een scherpere foto van dichtbij.",
        );
    }

    return {
        name: best.name,
        confidence: best.confidence,
    };
}
"use client";

import { useEffect, type RefObject } from "react";

type Surface = {
    element: HTMLElement;
    marker: HTMLElement;
    attribute: string;
};

type Lens = {
    rect: DOMRect;
    radii: number[];
};

type Renderer = {
    draw: (width: number, height: number, lenses: Lens[]) => void;
    dispose: () => void;
};

type SharedGlass = {
    add: (canvas: HTMLCanvasElement, readyOnParent: boolean) => () => void;
};

const sharedRenderers = new WeakMap<HTMLElement, SharedGlass>();

const VERTEX = [
    "attribute vec2 a_position;",
    "varying vec2 v_uv;",
    "void main() {",
    "  v_uv = a_position * 0.5 + 0.5;",
    "  gl_Position = vec4(a_position, 0.0, 1.0);",
    "}",
].join("\n");

function createRenderer(
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
): Renderer | null {
    const context = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
    });

    if (!context) return null;

    const gl: WebGLRenderingContext = context;
    const capacity = Math.min(
        8,
        Math.floor(
            (Number(gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)) - 8) / 2,
        ),
    );

    if (capacity < 1) return null;

    const fragment = [
        "precision highp float;",
        "uniform sampler2D u_photo;",
        "uniform vec2 u_viewport;",
        "uniform vec2 u_photoSize;",
        "uniform vec4 u_boxes[" + capacity + "];",
        "uniform vec4 u_radii[" + capacity + "];",
        "uniform int u_count;",
        "varying vec2 v_uv;",
        "void main() {",
        "  vec2 p = vec2(v_uv.x, 1.0 - v_uv.y) * u_viewport;",
        "  vec2 offset = vec2(0.0);",
        "  float glassMask = 0.0;",
        "  for (int i = 0; i < " + capacity + "; i++) {",
        "    if (i >= u_count) break;",
        "    vec4 box = u_boxes[i];",
        "    vec2 local = p - box.xy;",
        "    if (local.x < 0.0 || local.y < 0.0 || local.x > box.z || local.y > box.w) continue;",
        "    vec2 halfSize = box.zw * 0.5;",
        "    vec4 corners = u_radii[i];",
        "    float r = local.x < halfSize.x ? (local.y < halfSize.y ? corners.x : corners.w) : (local.y < halfSize.y ? corners.y : corners.z);",
        "    r = min(r, min(halfSize.x, halfSize.y));",
        "    vec2 q = abs(local - halfSize) - halfSize + vec2(r);",
        "    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;",
        "    float mask = 1.0 - smoothstep(-0.8, 0.8, d);",
        "    glassMask = max(glassMask, mask);",
        "    vec2 wave = vec2(sin(local.y * 0.055 + sin(local.x * 0.025) * 1.2), cos(local.x * 0.045 + sin(local.y * 0.03) * 1.3)) * 5.0;",
        "    vec2 edgeDistance = min(local, box.zw - local);",
        "    float edge = exp(-min(edgeDistance.x, edgeDistance.y) / 14.0);",
        "    vec2 direction = normalize(local - halfSize + vec2(0.001));",
        "    offset = mix(offset, wave + direction * edge * 4.0, mask);",
        "  }",
        "  if (glassMask <= 0.0) discard;",
        "  float scale = max(u_viewport.x / u_photoSize.x, u_viewport.y / u_photoSize.y);",
        "  vec2 renderedSize = u_photoSize * scale;",
        "  vec2 origin = vec2((u_viewport.x - renderedSize.x) * 0.5, 0.0);",
        "  vec2 uv = clamp((p + offset - origin) / renderedSize, 0.0, 1.0);",
        "  vec3 color = texture2D(u_photo, vec2(uv.x, 1.0 - uv.y)).rgb;",
        "  float darkness = 0.12 * clamp(p.y / u_viewport.y, 0.0, 1.0);",
        "  gl_FragColor = vec4(color * (1.0 - darkness), glassMask);",
        "}",
    ].join("\n");

    const shaders: WebGLShader[] = [];
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();

    function dispose() {
        shaders.forEach((shader) => gl.deleteShader(shader));
        gl.deleteProgram(program);
        gl.deleteBuffer(buffer);
        gl.deleteTexture(texture);
    }

    function compile(type: number, code: string) {
        const shader = gl.createShader(type);

        if (!shader) {
            throw new Error("Shader is niet beschikbaar.");
        }

        shaders.push(shader);
        gl.shaderSource(shader, code);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error("Shader kon niet gecompileerd worden.");
        }

        return shader;
    }

    try {
        if (!program || !buffer || !texture) {
            throw new Error("Glasweergave is niet beschikbaar.");
        }

        gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("Glasweergave kon niet gestart worden.");
        }

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW,
        );

        const position = gl.getAttribLocation(program, "a_position");

        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        const limit = Math.min(
            2048,
            Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
        );
        const factor = Math.min(
            1,
            limit / image.naturalWidth,
            limit / image.naturalHeight,
        );

        const source = document.createElement("canvas");
        source.width = Math.max(1, Math.round(image.naturalWidth * factor));
        source.height = Math.max(1, Math.round(image.naturalHeight * factor));

        const painter = source.getContext("2d");

        if (!painter) {
            throw new Error("Achtergrond is niet beschikbaar.");
        }

        painter.drawImage(image, 0, 0, source.width, source.height);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            source,
        );

        if (gl.getError() !== gl.NO_ERROR) {
            throw new Error("Achtergrond kon niet verwerkt worden.");
        }

        gl.uniform1i(gl.getUniformLocation(program, "u_photo"), 0);

        const viewport = gl.getUniformLocation(program, "u_viewport");
        const photoSize = gl.getUniformLocation(program, "u_photoSize");
        const boxes = gl.getUniformLocation(program, "u_boxes[0]");
        const radii = gl.getUniformLocation(program, "u_radii[0]");
        const count = gl.getUniformLocation(program, "u_count");
        const boxValues = new Float32Array(capacity * 4);
        const radiusValues = new Float32Array(capacity * 4);

        return {
            dispose,
            draw(width, height, lenses) {
                if (gl.isContextLost()) {
                    throw new Error("Glascontext is verloren.");
                }

                const visible = lenses.slice(0, capacity);

                visible.forEach(({ rect, radii: corners }, index) => {
                    boxValues.set(
                        [rect.left, rect.top, rect.width, rect.height],
                        index * 4,
                    );
                    radiusValues.set(corners, index * 4);
                });

                const density = Math.min(window.devicePixelRatio || 1, 1.5);
                const pixelWidth = Math.max(1, Math.round(width * density));
                const pixelHeight = Math.max(1, Math.round(height * density));

                if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
                    canvas.width = pixelWidth;
                    canvas.height = pixelHeight;
                    canvas.style.width = width + "px";
                    canvas.style.height = height + "px";
                }

                gl.useProgram(program);
                gl.viewport(0, 0, pixelWidth, pixelHeight);
                gl.uniform2f(viewport, width, height);
                gl.uniform2f(photoSize, image.naturalWidth, image.naturalHeight);
                gl.uniform4fv(boxes, boxValues);
                gl.uniform4fv(radii, radiusValues);
                gl.uniform1i(count, visible.length);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            },
        };
    } catch {
        dispose();
        return null;
    }
}

function createSharedGlass(host: HTMLElement): SharedGlass {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");

    Object.assign(canvas.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        zIndex: "-1",
        pointerEvents: "none",
        display: "none",
    });

    host.append(canvas);

    const image = new window.Image();
    const reduced = window.matchMedia(
        "(prefers-reduced-transparency: reduce)",
    );
    const surfaces = new Map<HTMLCanvasElement, Surface>();

    let renderer: Renderer | null = null;
    let frame = 0;
    let settleTimer = 0;
    let disposed = false;
    let ready = false;

    function setReady(nextReady: boolean) {
        if (ready === nextReady) return;
        ready = nextReady;

        for (const surface of surfaces.values()) {
            surface.marker.setAttribute(surface.attribute, String(ready));
        }

        canvas.style.display = ready ? "block" : "none";
    }

    function draw() {
        frame = 0;

        if (disposed || document.hidden) return;

        if (!renderer || reduced.matches) {
            setReady(false);
            return;
        }

        const width = document.documentElement.clientWidth;
        const height = window.innerHeight;
        const lenses: Lens[] = [];

        for (const surface of surfaces.values()) {
            const rect = surface.element.getBoundingClientRect();

            if (
                rect.width <= 0 ||
                rect.height <= 0 ||
                rect.bottom <= 0 ||
                rect.top >= height ||
                rect.right <= 0 ||
                rect.left >= width
            ) {
                continue;
            }

            const style = window.getComputedStyle(surface.element);
            const corners = [
                style.borderTopLeftRadius,
                style.borderTopRightRadius,
                style.borderBottomRightRadius,
                style.borderBottomLeftRadius,
            ].map((value) => {
                const radius = Number.parseFloat(value) || 0;

                return value.includes("%")
                    ? (Math.min(rect.width, rect.height) * radius) / 100
                    : radius;
            });

            lenses.push({ rect, radii: corners });
        }

        try {
            renderer.draw(width, height, lenses);
            setReady(true);
        } catch {
            setReady(false);
        }
    }

    function schedule() {
        if (!disposed && !frame && !document.hidden) {
            frame = window.requestAnimationFrame(draw);
        }
    }

    function viewportChanged() {
        schedule();
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(schedule, 150);
    }

    function initialize() {
        if (disposed) return;

        renderer?.dispose();
        renderer = createRenderer(canvas, image);
        schedule();
    }

    function contextLost(event: Event) {
        event.preventDefault();
        setReady(false);
    }

    function visibilityChanged() {
        if (document.hidden) {
            window.cancelAnimationFrame(frame);
            frame = 0;
        } else {
            schedule();
        }
    }

    const observer = new ResizeObserver(schedule);

    window.addEventListener("scroll", viewportChanged, { passive: true });
    window.addEventListener("resize", viewportChanged);
    document.addEventListener("scrollend", schedule);
    window.visualViewport?.addEventListener("resize", viewportChanged);
    window.visualViewport?.addEventListener("scroll", viewportChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    reduced.addEventListener("change", schedule);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", initialize);
    image.addEventListener("load", initialize);

    image.src = "/images/datecheck-carrefour-dark.png";

    return {
        add(marker, readyOnParent) {
            const element = marker.parentElement;
            if (!element) return () => { };

            const attribute = readyOnParent ? "data-glass-ready" : "data-ready";
            const target = readyOnParent ? element : marker;

            target.setAttribute(attribute, String(ready));
            surfaces.set(marker, { element, marker: target, attribute });
            observer.observe(element);
            schedule();

            return () => {
                observer.unobserve(element);
                target.removeAttribute(attribute);
                surfaces.delete(marker);

                if (surfaces.size > 0) {
                    schedule();
                    return;
                }

                disposed = true;
                window.cancelAnimationFrame(frame);
                observer.disconnect();
                window.clearTimeout(settleTimer);
                window.removeEventListener("scroll", viewportChanged);
                window.removeEventListener("resize", viewportChanged);
                document.removeEventListener("scrollend", schedule);
                window.visualViewport?.removeEventListener("resize", viewportChanged);
                window.visualViewport?.removeEventListener("scroll", viewportChanged);
                document.removeEventListener("visibilitychange", visibilityChanged);
                reduced.removeEventListener("change", schedule);
                canvas.removeEventListener("webglcontextlost", contextLost);
                canvas.removeEventListener("webglcontextrestored", initialize);
                image.removeEventListener("load", initialize);
                renderer?.dispose();
                canvas.remove();
                sharedRenderers.delete(host);
            };
        },
    };
}

export function useSharedGlass(
    canvasRef: RefObject<HTMLCanvasElement | null>,
    readyOnParent = false,
) {
    useEffect(() => {
        const canvas = canvasRef.current;
        const host = canvas?.closest("main");

        if (!canvas || !host) return;

        let shared = sharedRenderers.get(host);

        if (!shared) {
            shared = createSharedGlass(host);
            sharedRenderers.set(host, shared);
        }

        return shared.add(canvas, readyOnParent);
    }, [canvasRef, readyOnParent]);
}
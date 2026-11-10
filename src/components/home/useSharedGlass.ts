"use client";

import { useEffect, type RefObject } from "react";
import { createGlassPhotoLayer } from "./glassPhotoLayer";

type Surface = {
    element: HTMLElement;
    marker: HTMLElement;
    attribute: string;
    paintTarget: HTMLCanvasElement | null;
};

type Lens = {
    rect: DOMRect;
    radii: number[];
};

type Renderer = {
    draw: (
        width: number,
        height: number,
        lenses: Lens[],
        photoLayer?: HTMLCanvasElement,
    ) => void;
    dispose: () => void;
};

type SharedGlass = {
    add: (
        canvas: HTMLCanvasElement,
        readyOnParent: boolean,
        paintOnMarker: boolean,
    ) => () => void;
};

const sharedRenderers = new WeakMap<HTMLElement, SharedGlass>();

const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;

uniform sampler2D u_photo;
uniform bool u_usePhotoAlpha;
uniform vec2 u_viewport;
uniform vec2 u_photoSize;
uniform vec4 u_box;
uniform vec4 u_radii;

varying vec2 v_uv;

void main() {
  vec2 p = vec2(v_uv.x, 1.0 - v_uv.y) * u_viewport;
  vec2 local = p - u_box.xy;

  if (
    local.x < 0.0 ||
    local.y < 0.0 ||
    local.x > u_box.z ||
    local.y > u_box.w
  ) {
    discard;
  }

  vec2 halfSize = u_box.zw * 0.5;

  float radius = local.x < halfSize.x
    ? (local.y < halfSize.y ? u_radii.x : u_radii.w)
    : (local.y < halfSize.y ? u_radii.y : u_radii.z);

  radius = min(radius, min(halfSize.x, halfSize.y));

  vec2 q = abs(local - halfSize) - halfSize + vec2(radius);

  float distanceToEdge =
    length(max(q, 0.0)) +
    min(max(q.x, q.y), 0.0) -
    radius;

  float mask = 1.0 - smoothstep(-0.8, 0.8, distanceToEdge);

  if (mask <= 0.0) {
    discard;
  }

  vec2 wave = vec2(
    sin(local.y * 0.055 + sin(local.x * 0.025) * 1.2),
    cos(local.x * 0.045 + sin(local.y * 0.03) * 1.3)
  ) * 5.0;

  vec2 edgeDistance = min(local, u_box.zw - local);

  float edge = exp(
    -min(edgeDistance.x, edgeDistance.y) / 14.0
  );

  vec2 direction = normalize(
    local - halfSize + vec2(0.001)
  );

  vec2 offset = wave + direction * edge * 4.0;

  float scale = max(
    u_viewport.x / u_photoSize.x,
    u_viewport.y / u_photoSize.y
  );

  vec2 renderedSize = u_photoSize * scale;

  vec2 origin = vec2(
    (u_viewport.x - renderedSize.x) * 0.5,
    0.0
  );

  vec2 uv = clamp(
    (p + offset - origin) / renderedSize,
    0.0,
    1.0
  );

    vec4 sampled = texture2D(
    u_photo,
    vec2(uv.x, 1.0 - uv.y)
  );

  float darkness = 0.12 * clamp(
    p.y / u_viewport.y,
    0.0,
    1.0
  );

  gl_FragColor = vec4(
    sampled.rgb * (1.0 - darkness),
    mask * (u_usePhotoAlpha ? sampled.a : 1.0)
  );
}
`;

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
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    const photoTexture = gl.createTexture();

    function dispose() {
        shaders.forEach((shader) => gl.deleteShader(shader));
        gl.deleteProgram(program);
        gl.deleteBuffer(buffer);
        gl.deleteTexture(texture);
        gl.deleteTexture(photoTexture);
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
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("Glasweergave kon niet gestart worden.");
        }

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1,
                1, -1,
                -1, 1,
                -1, 1,
                1, -1,
                1, 1,
            ]),
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
        source.width = Math.max(
            1,
            Math.round(image.naturalWidth * factor),
        );
        source.height = Math.max(
            1,
            Math.round(image.naturalHeight * factor),
        );

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

        if (!photoTexture) {
            throw new Error("Fotolaag is niet beschikbaar.");
        }
        gl.bindTexture(gl.TEXTURE_2D, photoTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.uniform1i(gl.getUniformLocation(program, "u_photo"), 0);
        const usePhotoAlpha = gl.getUniformLocation(program, "u_usePhotoAlpha");
        const viewport = gl.getUniformLocation(program, "u_viewport");
        const photoSize = gl.getUniformLocation(program, "u_photoSize");
        const box = gl.getUniformLocation(program, "u_box");
        const radii = gl.getUniformLocation(program, "u_radii");

        return {
            dispose,

            draw(width, height, lenses, layer) {
                if (gl.isContextLost()) {
                    throw new Error("Glascontext is verloren.");
                }

                if (width <= 0 || height <= 0) return;

                const density = Math.min(window.devicePixelRatio || 1, 1.5);
                const pixelWidth = Math.max(1, Math.round(width * density));
                const pixelHeight = Math.max(1, Math.round(height * density));

                if (
                    canvas.width !== pixelWidth ||
                    canvas.height !== pixelHeight
                ) {
                    canvas.width = pixelWidth;
                    canvas.height = pixelHeight;
                }

                canvas.style.width = width + "px";
                canvas.style.height = height + "px";

                gl.useProgram(program);
                gl.viewport(0, 0, pixelWidth, pixelHeight);
                gl.uniform2f(viewport, width, height);
                gl.bindTexture(gl.TEXTURE_2D, layer ? photoTexture : texture);
                if (layer) {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layer);
                }
                gl.uniform1i(usePhotoAlpha, layer ? 1 : 0);
                gl.uniform2f(
                    photoSize,
                    layer ? width : image.naturalWidth,
                    layer ? height : image.naturalHeight,
                );

                gl.disable(gl.SCISSOR_TEST);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.enable(gl.SCISSOR_TEST);

                const scaleX = pixelWidth / width;
                const scaleY = pixelHeight / height;

                for (const { rect, radii: corners } of lenses) {
                    const left = Math.max(
                        0,
                        Math.floor(rect.left * scaleX),
                    );
                    const right = Math.min(
                        pixelWidth,
                        Math.ceil(rect.right * scaleX),
                    );
                    const top = Math.max(
                        0,
                        Math.floor(rect.top * scaleY),
                    );
                    const bottom = Math.min(
                        pixelHeight,
                        Math.ceil(rect.bottom * scaleY),
                    );

                    if (right <= left || bottom <= top) continue;

                    gl.scissor(
                        left,
                        pixelHeight - bottom,
                        right - left,
                        bottom - top,
                    );

                    gl.uniform4f(
                        box,
                        rect.left,
                        rect.top,
                        rect.width,
                        rect.height,
                    );
                    gl.uniform4f(
                        radii,
                        corners[0],
                        corners[1],
                        corners[2],
                        corners[3],
                    );

                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                }

                gl.disable(gl.SCISSOR_TEST);
            },
        };
    } catch {
        dispose();
        return null;
    }
}

function paintGlassMarker(
    target: HTMLCanvasElement,
    source: HTMLCanvasElement,
    rect: DOMRect,
    width: number,
    height: number,
) {
    const context = target.getContext("2d");
    if (!context) return false;

    const scaleX = source.width / width;
    const scaleY = source.height / height;
    const sourceWidth = rect.width * scaleX;
    const sourceHeight = rect.height * scaleY;
    const targetWidth = Math.max(1, Math.round(sourceWidth));
    const targetHeight = Math.max(1, Math.round(sourceHeight));

    if (target.width !== targetWidth || target.height !== targetHeight) {
        target.width = targetWidth;
        target.height = targetHeight;
    }

    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(
        source,
        rect.left * scaleX,
        rect.top * scaleY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight,
    );

    return true;
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
    const photoLayer = createGlassPhotoLayer(schedule);

    let renderer: Renderer | null = null;
    let frame = 0;
    let settleTimer = 0;
    let disposed = false;

    function setReady(active: Set<Surface> | null) {
        for (const surface of surfaces.values()) {
            const value = String(active?.has(surface) ?? false);

            if (surface.marker.getAttribute(surface.attribute) !== value) {
                surface.marker.setAttribute(surface.attribute, value);
            }
        }

        const hasBackdrop = active && [...active].some(
            (surface) => !surface.paintTarget,
        );

        canvas.style.display = hasBackdrop ? "block" : "none";
    }

    function draw() {
        frame = 0;

        if (disposed || document.hidden) return;

        if (!renderer || reduced.matches) {
            setReady(null);
            return;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        const lenses: Lens[] = [];
        const foreground: { surface: Surface; lens: Lens }[] = [];
        const photoForeground: {
            surface: Surface;
            lens: Lens;
            photo: HTMLImageElement;
        }[] = [];
        const active = new Set<Surface>();

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

            if (
                style.display === "none" ||
                style.visibility === "hidden"
            ) {
                continue;
            }

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

            const lens = { rect, radii: corners };

            if (surface.paintTarget) {
                const photoFrame = surface.element.closest("[data-glass-photo]");

                if (photoFrame) {
                    const photo = photoFrame.querySelector("img");
                    if (photo) photoForeground.push({ surface, lens, photo });
                } else {
                    foreground.push({ surface, lens });
                }
            } else {
                lenses.push(lens);
                active.add(surface);
            }
        }

        function renderForeground(
            entries: { surface: Surface; lens: Lens }[],
            source?: HTMLCanvasElement,
        ) {
            if (!renderer || entries.length === 0) return;

            renderer.draw(width, height, entries.map(({ lens }) => lens), source);

            for (const { surface, lens } of entries) {
                if (
                    surface.paintTarget &&
                    paintGlassMarker(surface.paintTarget, canvas, lens.rect, width, height)
                ) {
                    active.add(surface);
                }
            }
        }

        try {
            renderForeground(foreground);

            const source = photoLayer.render(
                photoForeground.map(({ photo }) => photo),
                width,
                height,
            );

            if (source) {
                renderForeground(photoForeground, source);
            }

            if (lenses.length > 0) {
                renderer.draw(width, height, lenses);
            }

            setReady(active);
        } catch {
            setReady(null);
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
        setReady(null);
    }

    function imageFailed() {
        setReady(null);
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

    document.addEventListener("scroll", viewportChanged, {
        passive: true,
        capture: true,
    });
    window.addEventListener("resize", viewportChanged);
    document.addEventListener("scrollend", schedule);
    host.addEventListener("load", schedule, true);
    host.addEventListener("transitionend", schedule);
    window.visualViewport?.addEventListener("resize", viewportChanged);
    window.visualViewport?.addEventListener("scroll", viewportChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    reduced.addEventListener("change", schedule);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", initialize);
    image.addEventListener("load", initialize);
    image.addEventListener("error", imageFailed);

    image.src = "/images/datecheck-carrefour-dark.png";

    return {
        add(marker, readyOnParent, paintOnMarker) {
            const element = marker.parentElement;
            if (!element) return () => { };

            const attribute = readyOnParent
                ? "data-glass-ready"
                : "data-ready";
            const target = readyOnParent ? element : marker;

            target.setAttribute(attribute, "false");
            surfaces.set(marker, {
                element,
                marker: target,
                attribute,
                paintTarget: paintOnMarker ? marker : null,
            });
            observer.observe(element);
            schedule();

            return () => {
                target.removeAttribute(attribute);
                surfaces.delete(marker);

                const stillObserved = [...surfaces.values()].some(
                    (surface) => surface.element === element,
                );

                if (!stillObserved) {
                    observer.unobserve(element);
                }

                if (surfaces.size > 0) {
                    schedule();
                    return;
                }

                disposed = true;
                window.cancelAnimationFrame(frame);
                window.clearTimeout(settleTimer);
                observer.disconnect();

                document.removeEventListener(
                    "scroll",
                    viewportChanged,
                    true,
                );
                window.removeEventListener("resize", viewportChanged);
                document.removeEventListener("scrollend", schedule);
                host.removeEventListener("load", schedule, true);
                host.removeEventListener("transitionend", schedule);
                window.visualViewport?.removeEventListener(
                    "resize",
                    viewportChanged,
                );
                window.visualViewport?.removeEventListener(
                    "scroll",
                    viewportChanged,
                );
                document.removeEventListener(
                    "visibilitychange",
                    visibilityChanged,
                );
                reduced.removeEventListener("change", schedule);
                canvas.removeEventListener(
                    "webglcontextlost",
                    contextLost,
                );
                canvas.removeEventListener(
                    "webglcontextrestored",
                    initialize,
                );
                image.removeEventListener("load", initialize);
                image.removeEventListener("error", imageFailed);

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
    paintOnMarker = false,
) {
    useEffect(() => {
        const canvas = canvasRef.current;
        const host = canvas?.closest<HTMLElement>(
            paintOnMarker ? "dialog, main" : "main",
        );

        if (!canvas || !host) return;

        let shared = sharedRenderers.get(host);

        if (!shared) {
            shared = createSharedGlass(host);
            sharedRenderers.set(host, shared);
        }

        return shared.add(canvas, readyOnParent, paintOnMarker);
    }, [canvasRef, readyOnParent, paintOnMarker]);
}
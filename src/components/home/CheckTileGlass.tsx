"use client";

import { useEffect, useRef, useState } from "react";

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
  uniform vec2 u_viewport;
  uniform vec2 u_photoSize;
  uniform vec4 u_box;

  varying vec2 v_uv;

  void main() {
    vec2 local = vec2(v_uv.x, 1.0 - v_uv.y) * u_box.zw;
    vec2 p = u_box.xy + local;

    vec2 wave = vec2(
      sin(local.y * 0.055 + sin(local.x * 0.025) * 1.2),
      cos(local.x * 0.045 + sin(local.y * 0.03) * 1.3)
    ) * 5.0;

    vec2 edgeDistance = min(local, u_box.zw - local);
    float edge = exp(-min(edgeDistance.x, edgeDistance.y) / 14.0);
    vec2 direction = normalize(local - u_box.zw * 0.5 + vec2(0.001));
    vec2 offset = wave + direction * edge * 4.0;

    float scale = max(
      u_viewport.x / u_photoSize.x,
      u_viewport.y / u_photoSize.y
    );

    vec2 renderedSize = u_photoSize * scale;
    vec2 origin = vec2((u_viewport.x - renderedSize.x) * 0.5, 0.0);

    vec2 uv = clamp(
      (p + offset - origin) / renderedSize,
      vec2(0.0),
      vec2(1.0)
    );

    vec3 color = texture2D(u_photo, vec2(uv.x, 1.0 - uv.y)).rgb;

    float darkness = mix(
      0.0,
      0.12,
      clamp(p.y / u_viewport.y, 0.0, 1.0)
    );

    gl_FragColor = vec4(color * (1.0 - darkness), 1.0);
  }
`;

export default function CheckTileGlass({ className }: { className: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement;

    if (!canvas || !root) return;

    const reducedTransparency = window.matchMedia(
      "(prefers-reduced-transparency: reduce)",
    );

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });

    if (!gl) return;

    let disposed = false;
    let frame = 0;
    let drawScene: (() => void) | null = null;
    let disposeRenderer: (() => void) | null = null;

    const image = new window.Image();

    function schedule() {
      if (disposed || frame || document.hidden) return;

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        drawScene?.();
      });
    }

    function initialize() {
      if (disposed || !image.naturalWidth || !gl || !canvas || !root) return;

      disposeRenderer?.();
      disposeRenderer = null;
      drawScene = null;

      const shaders: WebGLShader[] = [];
      let program: WebGLProgram | null = null;
      let buffer: WebGLBuffer | null = null;
      let texture: WebGLTexture | null = null;

      function cleanup() {
        if (texture) gl!.deleteTexture(texture);
        if (buffer) gl!.deleteBuffer(buffer);
        if (program) gl!.deleteProgram(program);
        shaders.forEach((shader) => gl!.deleteShader(shader));
      }

      function compile(type: number, source: string) {
        const shader = gl!.createShader(type);

        if (!shader) throw new Error("Shader kon niet aangemaakt worden.");

        shaders.push(shader);
        gl!.shaderSource(shader, source);
        gl!.compileShader(shader);

        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
          throw new Error("Shader kon niet gecompileerd worden.");
        }

        return shader;
      }

      try {
        const vertex = compile(gl.VERTEX_SHADER, VERTEX);
        const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);

        program = gl.createProgram();
        buffer = gl.createBuffer();
        texture = gl.createTexture();

        if (!program || !buffer || !texture) {
          throw new Error("Glasweergave is niet beschikbaar.");
        }

        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
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

        const context = source.getContext("2d");

        if (!context) throw new Error("Achtergrond kon niet geladen worden.");

        context.drawImage(image, 0, 0, source.width, source.height);

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

        const viewportUniform = gl.getUniformLocation(program, "u_viewport");
        const photoUniform = gl.getUniformLocation(program, "u_photoSize");
        const boxUniform = gl.getUniformLocation(program, "u_box");
        const activeProgram = program;

        drawScene = () => {
          if (disposed || gl.isContextLost()) return;

          if (reducedTransparency.matches) {
            setReady(false);
            return;
          }

          const rect = root.getBoundingClientRect();

          if (
            rect.width <= 0 ||
            rect.height <= 0 ||
            rect.bottom < 0 ||
            rect.top > window.innerHeight
          ) {
            return;
          }

          const density = Math.min(window.devicePixelRatio || 1, 1.5);
          const width = Math.max(1, Math.round(rect.width * density));
          const height = Math.max(1, Math.round(rect.height * density));

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          gl.useProgram(activeProgram);
          gl.viewport(0, 0, width, height);

          gl.uniform2f(
            viewportUniform,
            document.documentElement.clientWidth,
            window.innerHeight,
          );

          gl.uniform2f(photoUniform, image.naturalWidth, image.naturalHeight);

          gl.uniform4f(
            boxUniform,
            rect.left,
            rect.top,
            rect.width,
            rect.height,
          );

          gl.drawArrays(gl.TRIANGLES, 0, 6);
          setReady(true);
        };

        disposeRenderer = cleanup;
        schedule();
      } catch {
        cleanup();
        setReady(false);
      }
    }

    function contextLost(event: Event) {
      event.preventDefault();
      drawScene = null;
      setReady(false);
    }

    function contextRestored() {
      initialize();
    }

    function imageFailed() {
      setReady(false);
    }

    image.addEventListener("load", initialize);
    image.addEventListener("error", imageFailed);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(root);

    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    reducedTransparency.addEventListener("change", schedule);

    image.src = "/images/datecheck-carrefour-dark.png";

    return () => {
      disposed = true;

      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();

      image.removeEventListener("load", initialize);
      image.removeEventListener("error", imageFailed);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);

      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      document.removeEventListener("visibilitychange", schedule);
      reducedTransparency.removeEventListener("change", schedule);

      disposeRenderer?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      data-ready={ready ? "true" : "false"}
      aria-hidden="true"
    />
  );
}

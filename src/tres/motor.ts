import * as THREE from 'three';
import { H, RES, W } from '../config';

/**
 * MOTOR — un solo contexto WebGL (three.js) para todo.
 *
 * Las escenas 3D (el teatro) se renderizan a una textura; las 2D (titulo)
 * se dibujan en un lienzo. En los dos casos, la imagen pasa despues por el
 * mismo shader final: deformacion, mapeo polar al pozo, encuadre de tinta,
 * virado frio, grano. Arriba de todo va la capa 2D sin deformar (dialogos,
 * glifos, titulo).
 */

export interface EstadoPost {
  t: number;
  miedo: number;
  polar: number;
  giro: number;
  marco: number;
  centroMarco: [number, number];
  flash: number;
  fundido: number;
  temblor: number;
  /** 0 = el presente (noche fria), 1 = el recuerdo (siesta sepia) */
  recuerdo: number;
  /** 0..1 el barro que sube desde abajo cuando se pierde la calma */
  pantano: number;
  /** 0..1 el papel que se rasga (final AUDERE) */
  desgarro: number;
  /** 0..1 la cinta que se rebobina (cuando la alcanzan) */
  rebobinar?: number;
}

const VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = `
uniform sampler2D uMundo;
uniform sampler2D uCapa;
uniform vec2 uRes;
uniform float uT;
uniform float uMiedo;
uniform float uPolar;
uniform float uGiro;
uniform float uMarco;
uniform vec2 uCentroMarco;
uniform float uFlash;
uniform float uFundido;
uniform float uTemblor;
uniform float uRecuerdo;
uniform float uPantano;
uniform float uDesgarro;
uniform float uRebobinar;
varying vec2 vUv;

float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float n(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = h(i), b = h(i + vec2(1.0, 0.0)), c = h(i + vec2(0.0, 1.0)), d = h(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 uv = vUv;
  uv += vec2(n(vec2(uT * 9.0, 1.0)) - 0.5, n(vec2(2.0, uT * 9.0)) - 0.5) * uTemblor * 0.012;
  float m = uMiedo, m2 = m * m;

  float w = m2 * 0.011;
  vec2 mu = uv;
  mu.x += (n(vec2(uv.y * 4.0, uT * 0.5)) - 0.5) * w * 2.0 + sin(uv.y * 26.0 + uT * 2.2) * w * 0.25;
  mu.y += (n(vec2(uv.x * 3.5 + 7.0, uT * 0.45)) - 0.5) * w * 1.4;

  // el pantano: el aire tiembla sobre el barro
  mu.x += sin(uv.y * 38.0 + uT * 3.0) * 0.0035 * uPantano * (1.0 - uv.y);

  // el desgarro: el papel se abre al medio
  float x0 = 0.5 + (n(vec2(uv.y * 14.0, 3.0)) - 0.5) * 0.05 + (n(vec2(uv.y * 60.0, 9.0)) - 0.5) * 0.012;
  float ladoD = step(x0, uv.x) * 2.0 - 1.0;
  float offD = uDesgarro * 0.36;
  mu.x -= ladoD * offD;
  mu.y += uDesgarro * uDesgarro * 0.08 * (n(vec2(uv.x * 30.0, 1.0)));
  float huecoD = uDesgarro > 0.0 ? step(0.0, (x0 - (uv.x - ladoD * offD)) * ladoD) : 0.0;

  // la cinta que se rebobina: franjas corridas, lineas, un temblor horizontal
  float franja = step(0.975, n(vec2(floor(uv.y * 110.0), floor(uT * 24.0))));
  mu.x += (franja * 0.04 + sin(uv.y * 300.0 + uT * 80.0) * 0.0015) * uRebobinar;
  mu.y += fract(uT * 3.0) * 0.02 * uRebobinar * step(0.96, n(vec2(uT * 30.0, 2.0)));

  vec2 p = (uv - 0.5) * asp;
  float r = length(p);
  float a = atan(p.y, p.x);
  vec2 pol = vec2(fract(a / 6.2831853 + 0.5 + uGiro), clamp(1.0 - r * 1.25, 0.0, 1.0));
  mu = mix(mu, pol, uPolar);

  vec2 d = uv - 0.5;
  float ab = 0.0008 + m2 * 0.005 + uTemblor * 0.004;
  vec3 c;
  c.r = texture2D(uMundo, mu + d * ab).r;
  c.g = texture2D(uMundo, mu).g;
  c.b = texture2D(uMundo, mu - d * ab).b;
  c *= mix(1.0, 1.0 - smoothstep(0.28, 0.8, r) * 0.85, uPolar);

  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, vec3(l), m * 0.45);
  float calido = clamp((c.r - c.b) * 5.0, 0.0, 1.0);
  vec3 frio = c * vec3(0.86, 0.95, 1.1) + vec3(0.004, 0.012, 0.026) * (1.0 - smoothstep(0.0, 0.5, l));
  vec3 presente = mix(frio, c * vec3(1.06, 1.0, 0.9), calido);
  // el recuerdo: sepia, pasado de luz, los bordes se queman de blanco
  vec3 sepia = vec3(l) * vec3(1.07, 0.94, 0.74) * 0.92 + vec3(0.07, 0.05, 0.02);
  sepia = mix(sepia, c * vec3(1.05, 0.95, 0.8), 0.25);
  c = mix(presente, sepia, uRecuerdo);

  // el barro, desde abajo
  float nivel = uPantano * 0.36 + (n(vec2(uv.x * 7.0, uT * 0.5)) - 0.5) * 0.05 * uPantano + sin(uv.x * 21.0 + uT * 1.4) * 0.008 * uPantano;
  float bajo = smoothstep(nivel + 0.012, nivel - 0.012, uv.y) * step(0.001, uPantano);
  vec3 barro = vec3(0.012, 0.014, 0.017) + vec3(0.05, 0.06, 0.07) * n(vec2(uv.x * 40.0 + uT, uv.y * 20.0)) * (1.0 - bajo * 0.5);
  c = mix(c, barro, bajo * 0.94);
  c += vec3(0.16, 0.18, 0.2) * smoothstep(0.008, 0.0, abs(uv.y - nivel)) * uPantano;

  float vin = length(d * asp);
  c *= mix(smoothstep(1.25 - m * 0.35, 0.25, vin), 1.0, uRecuerdo);
  c = mix(c, vec3(0.98, 0.95, 0.87), smoothstep(0.45, 1.05, vin) * uRecuerdo * 0.85);

  // el encierro es del mundo; la interfaz (dialogos, glifos) queda por encima
  vec2 q = (uv - uCentroMarco) * asp;
  vec2 mitad = vec2(0.5 * asp.x, 0.5) * uMarco;
  float borde = max(abs(q.x) - mitad.x, abs(q.y) - mitad.y);
  borde += (n(q * 9.0 + uT * 0.3) - 0.5) * 0.03 * (1.0 - uMarco) + (n(q * 40.0) - 0.5) * 0.008 * (1.0 - uMarco);
  c *= 1.0 - smoothstep(-0.006, 0.004, borde) * step(uMarco, 0.995);

  // el hueco del desgarro es papel blanco con fibras
  vec3 papel = vec3(0.95, 0.93, 0.88) - n(uv * vec2(300.0, 40.0)) * 0.06;
  c = mix(c, papel, huecoD);
  c *= 1.0 - uDesgarro * 0.5 * (1.0 - huecoD);

  float lr = dot(c, vec3(0.3, 0.59, 0.11));
  c = mix(c, vec3(lr) * vec3(0.9, 1.0, 1.08), uRebobinar * 0.6);
  c *= 1.0 - uRebobinar * 0.18 * step(0.5, fract(uv.y * 160.0 + uT * 40.0));
  c += vec3(0.05) * franja * uRebobinar;

  vec4 k = texture2D(uCapa, uv);
  c = mix(c, k.rgb, k.a);

  c = mix(c, vec3(0.96, 0.95, 0.92), uFlash);
  c += (h(vUv * uRes + fract(uT * 7.3)) - 0.5) * (0.04 + m * 0.05);
  c *= 1.0 - uFundido;
  gl_FragColor = vec4(c, 1.0);
}
`;

export class Motor {
  renderer: THREE.WebGLRenderer;
  private rt: THREE.WebGLRenderTarget;
  private postEscena = new THREE.Scene();
  private postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mat: THREE.ShaderMaterial;
  private texMundo2d: THREE.CanvasTexture;
  private texCapa: THREE.CanvasTexture;

  constructor(canvas: HTMLCanvasElement, mundo2d: HTMLCanvasElement, capa: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(canvas.width, canvas.height, false);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.rt = new THREE.WebGLRenderTarget(W * RES, H * RES, { samples: 4 });

    this.texMundo2d = new THREE.CanvasTexture(mundo2d);
    this.texCapa = new THREE.CanvasTexture(capa);
    for (const t of [this.texMundo2d, this.texCapa]) {
      t.colorSpace = THREE.NoColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
    }

    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uMundo: { value: this.texMundo2d },
        uCapa: { value: this.texCapa },
        uRes: { value: new THREE.Vector2(W * RES, H * RES) },
        uT: { value: 0 }, uMiedo: { value: 0 }, uPolar: { value: 0 }, uGiro: { value: 0 },
        uMarco: { value: 1 }, uCentroMarco: { value: new THREE.Vector2(0.5, 0.5) },
        uFlash: { value: 0 }, uFundido: { value: 0 }, uTemblor: { value: 0 }, uRecuerdo: { value: 0 }, uPantano: { value: 0 }, uDesgarro: { value: 0 }, uRebobinar: { value: 0 },
      },
    });
    this.postEscena.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
  }

  /** Renderiza un frame. Si hay escena 3D la usa como mundo; si no, el lienzo 2D. */
  dibujar(tres: { escena: THREE.Scene; camara: THREE.Camera } | null, e: EstadoPost) {
    const u = this.mat.uniforms;
    if (tres) {
      this.renderer.setRenderTarget(this.rt);
      this.renderer.render(tres.escena, tres.camara);
      u.uMundo.value = this.rt.texture;
    } else {
      this.texMundo2d.needsUpdate = true;
      u.uMundo.value = this.texMundo2d;
    }
    this.texCapa.needsUpdate = true;
    u.uT.value = e.t;
    u.uMiedo.value = e.miedo;
    u.uPolar.value = e.polar;
    u.uGiro.value = e.giro;
    u.uMarco.value = e.marco;
    u.uCentroMarco.value.set(e.centroMarco[0], e.centroMarco[1]);
    u.uFlash.value = e.flash;
    u.uFundido.value = e.fundido;
    u.uTemblor.value = e.temblor;
    u.uRecuerdo.value = e.recuerdo;
    u.uPantano.value = e.pantano;
    u.uDesgarro.value = e.desgarro;
    u.uRebobinar.value = e.rebobinar ?? 0;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postEscena, this.postCam);
  }
}

import * as THREE from 'three';

/**
 * CARTAS — el teatro de papel.
 *
 * Todo el mundo son recortes planos colgados en un espacio 3D: dos telones
 * (el derecho y el reves), un tablon estrecho que hace de escenario y, encima,
 * los recortes de la nina, las figuras, las cortinas, los muebles.
 *
 * Cada carta puede tener dos caras: la que se ve desde la platea (A, el
 * derecho) y la que se ve desde atras (C, el reves). Los personajes giran para
 * mirar siempre a la camara; los muebles no, y en primera persona se ven de
 * canto: finitos como el papel que son.
 *
 * La luz es propia: ambiente, lamparas y el halo de la voz. En el presente el
 * halo alumbra; en el recuerdo, que esta lavado como una foto pasada de luz,
 * lo revela.
 */

export const LUCES = 10;

export const GLOBAL = {
  uHalo: { value: new THREE.Vector3() },
  uHaloR: { value: 0 },
  uHaloI: { value: 0 },
  uHaloTinta: { value: 0 },
  uAmb: { value: 0.08 },
  uCam: { value: new THREE.Vector3() },
  uNieblaColor: { value: new THREE.Color(0x020306) },
  uNiebla: { value: new THREE.Vector2(1300, 3000) },
  uLuzPos: { value: Array.from({ length: LUCES }, () => new THREE.Vector3(0, -9999, 0)) },
  uLuzI: { value: new Array(LUCES).fill(0) },
  uLuzR: { value: new Array(LUCES).fill(1) },
  uAlba: { value: 0 },
  /** en primera persona, todo lo que no es quien habla se hunde en lo oscuro */
  uFoco: { value: new THREE.Vector3() },
  uFocoI: { value: 0 },
};

const VERT = `
varying vec2 vUv;
varying vec3 vPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = `
uniform sampler2D map;
uniform float uAlpha;
uniform float uRevelar;
uniform float uPropia;
uniform float uLavado;
uniform vec3 uHalo;
uniform float uHaloR;
uniform float uHaloI;
uniform float uHaloTinta;
uniform float uAmb;
uniform vec3 uCam;
uniform vec3 uNieblaColor;
uniform vec2 uNiebla;
uniform vec3 uLuzPos[${LUCES}];
uniform float uLuzI[${LUCES}];
uniform float uLuzR[${LUCES}];
uniform float uAlba;
uniform vec3 uFoco;
uniform float uFocoI;
varying vec2 vUv;
varying vec3 vPos;

void main() {
  vec4 t = texture2D(map, vUv);
  float dh = distance(vPos, uHalo);
  float h = uHaloI * (1.0 - smoothstep(uHaloR * 0.3, uHaloR, dh));
  float a = t.a * uAlpha;
  // revelables: 1 = los revela la luz de la voz; 2 = los revela la tinta de la voz
  if (uRevelar > 0.5) {
    float quien = uRevelar > 1.5 ? uHaloTinta : 1.0 - uHaloTinta;
    a *= clamp(h * 1.8 * quien, 0.0, 1.0);
  }
  if (a < 0.01) discard;

  float luz = uAmb + uAlba * 0.9;
  for (int i = 0; i < ${LUCES}; i++) {
    luz += uLuzI[i] * (1.0 - smoothstep(0.0, uLuzR[i], distance(vPos, uLuzPos[i])));
  }
  luz += h * (1.0 - uHaloTinta) * 1.15;
  // en primera persona, quien esta enfrente tiene su propia luz
  luz += uFocoI * 0.6 * (1.0 - smoothstep(60.0, 220.0, length(vPos.xz - uFoco.xz)));
  luz = max(luz, uPropia);
  vec3 c = t.rgb * min(luz, 1.35);
  // la unica luz calida: la voz
  c += vec3(0.95, 0.7, 0.4) * h * (1.0 - uHaloTinta) * 0.16;
  // en el recuerdo todo esta lavado, pasado de luz, como una foto vieja;
  // la voz lo revela, como el liquido revelador en el cuarto oscuro
  float revela = clamp(h * 1.7 * uHaloTinta, 0.0, 1.0);
  c = mix(c, vec3(0.97, 0.93, 0.84), uLavado * (1.0 - revela));
  c *= 1.0 - revela * 0.12;

  float fd = length(vPos.xz - uFoco.xz);
  c *= mix(1.0, 0.32, uFocoI * smoothstep(140.0, 420.0, fd));

  float d = distance(vPos, uCam);
  c = mix(c, uNieblaColor, smoothstep(uNiebla.x, uNiebla.y, d) * (1.0 - uPropia * 0.6));
  gl_FragColor = vec4(c, a);
}
`;

export type Plano = 'A' | 'C' | 'ambos';

export interface OpcCarta {
  w: number;
  h: number;
  /** pixeles de textura por unidad del mundo */
  res?: number;
  x: number;
  y?: number;
  z: number;
  rotY?: number;
  /** gira para mirar a la camara (personajes) */
  billboard?: boolean;
  plano?: Plano;
  /** se redibuja cada frame */
  animada?: boolean;
  /** 0 no; 1 la revela la luz; 2 la revela la tinta */
  revelar?: number;
  /** 0 = la iluminan las luces; 1 = se ve como de dia (el recuerdo) */
  propia?: number;
  /** cuanto la lava la luz del recuerdo (0..1); la voz la revela */
  lavado?: number;
  /** si esta, la carta animada solo se redibuja cuando cambia este numero (el cuadro de la hoja) */
  clave?: () => number;
  /** balanceo de recorte de papel sobre su base (radianes) */
  vaiven?: number;
  /** dibuja la cara. `lado` es 1 visto desde A, -1 visto desde C, 0 de frente (B). */
  dibujar: (c: CanvasRenderingContext2D, lado: number, carta: Carta) => void;
  opaca?: boolean;
  orden?: number;
  /** carta horizontal (el tablon del escenario) */
  acostada?: boolean;
}

export class Carta {
  /** reloj comun, para el vaiven */
  static tiempo = 0;
  private semilla = Math.random() * 100;
  mesh: THREE.Mesh;
  canvas = document.createElement('canvas');
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  mat: THREE.ShaderMaterial;
  o: OpcCarta;
  private ladoDibujado = 99;
  private claveDibujada = NaN;
  visible = 1;

  constructor(o: OpcCarta) {
    this.o = o;
    const res = o.res ?? 1;
    this.canvas.width = Math.max(2, Math.round(o.w * res));
    this.canvas.height = Math.max(2, Math.round(o.h * res));
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(res, res);
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.NoColorSpace;
    this.tex.anisotropy = 4;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: !o.opaca,
      depthWrite: !!o.opaca,
      side: THREE.DoubleSide,
      uniforms: {
        ...GLOBAL,
        map: { value: this.tex },
        uAlpha: { value: 1 },
        uRevelar: { value: o.revelar ?? 0 },
        uPropia: { value: o.propia ?? 0 },
        uLavado: { value: o.lavado ?? 0 },
      },
    });
    const geo = new THREE.PlaneGeometry(o.w, o.h);
    // el ancla es abajo al centro: los recortes se paran sobre el tablon
    if (!o.acostada) geo.translate(0, o.h / 2, 0);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.set(o.x, o.y ?? 0, o.z);
    this.mesh.rotation.order = 'YXZ';
    this.mesh.rotation.y = o.rotY ?? 0;
    if (o.acostada) this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.renderOrder = o.orden ?? 0;
  }

  /**
   * phi: 0 = A, PI/2 = B, PI = C. visA / visC: cuanto se ve cada plano (el
   * escenario los funde cuando se cruza de uno al otro).
   */
  actualizar(phi: number, rotCam: number, cam: THREE.Vector3, visA: number, visC: number, forzarDibujo = false) {
    const o = this.o;
    const v = o.plano === 'A' ? visA : o.plano === 'C' ? visC : 1;
    this.mat.uniforms.uAlpha.value = v * this.visible;
    // las opacas no pueden fundirse: aparecen o desaparecen a mitad del fundido
    this.mesh.visible = o.opaca ? v * this.visible > 0.5 : v * this.visible > 0.01;
    if (o.billboard) this.mesh.rotation.y = rotCam;
    if (o.vaiven) this.mesh.rotation.z = Math.sin(Carta.tiempo * 0.9 + this.semilla) * o.vaiven + Math.sin(Carta.tiempo * 2.3 + this.semilla * 2) * o.vaiven * 0.3;

    // de que lado se esta viendo la carta
    let lado: number;
    if (o.billboard) {
      lado = phi < Math.PI * 0.3 ? 1 : phi > Math.PI * 0.7 ? -1 : 0;
    } else if (o.acostada) {
      lado = 1;
    } else {
      const ry = this.mesh.rotation.y;
      const dx = cam.x - this.mesh.position.x, dz = cam.z - this.mesh.position.z;
      lado = dx * Math.sin(ry) + dz * Math.cos(ry) >= 0 ? 1 : -1;
    }
    if (!this.mesh.visible) return;
    const k = o.clave ? o.clave() : NaN;
    const cambio = o.clave ? k !== this.claveDibujada : !!o.animada;
    if (cambio || forzarDibujo || lado !== this.ladoDibujado) {
      this.claveDibujada = k;
      this.redibujar(lado);
    }
  }

  redibujar(lado: number) {
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.restore();
    // las cartas fijas vistas desde atras se espejan, como el papel a trasluz
    c.save();
    if (!this.o.billboard && lado < 0) { c.translate(this.o.w, 0); c.scale(-1, 1); }
    this.o.dibujar(c, lado, this);
    c.restore();
    this.tex.needsUpdate = true;
    this.ladoDibujado = lado;
  }
}

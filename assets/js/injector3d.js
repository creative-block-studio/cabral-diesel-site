// Bico injetor 3D: peças de revolução (torno) montadas no eixo; --p do hero (site.js) explode e gira.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildInjector } from './injector-model.js?v=12';

const hero = document.querySelector('.hero');
const box = document.querySelector('.injector-3d');

const touch = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: touch ? 'low-power' : 'default' });
// celular: menos pixels = menos memória de GPU, o que evita o navegador derrubar o contexto WebGL
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.5 : 2));
box.appendChild(renderer.domElement);
// realismo: tone mapping de cinema e exposição um pouco acima
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
// metal só aparece com algo para refletir: ambiente de estúdio gerado, sem baixar HDR
const makeEnv = () => { scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture; };
makeEnv();
const camera = new THREE.PerspectiveCamera(28, 1, 1, 1000);
scene.environmentIntensity = 1.2;
const key = new THREE.DirectionalLight(0xfff4e8, 2.2); key.position.set(30, 60, 80); scene.add(key);
const fill = new THREE.DirectionalLight(0xdfe8ff, .5); fill.position.set(-50, 10, 40); scene.add(fill);
const rim = new THREE.DirectionalLight(0xf9230e, 1.1); rim.position.set(-60, -30, -40); scene.add(rim);

// realismo: texturas geradas em canvas (sem baixar imagem)
// aço torneado = riscos finos ao redor da peça; fundido = granulado irregular
const tex = (draw, repeat) => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  return t;
};
const lathed = tex(g => {
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .22})`; g.fillRect(0, y, 256, 1); }
}, [1, 6]);
const grain = tex(g => {
  const d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = 110 + Math.random() * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
}, [3, 3]);

const steel = new THREE.MeshPhysicalMaterial({ color: 0xcfd0d2, metalness: 1, roughness: .3, roughnessMap: lathed, bumpMap: lathed, bumpScale: .015 });
const cast = new THREE.MeshPhysicalMaterial({ color: 0x6f6b66, metalness: .9, roughness: .62, roughnessMap: grain, bumpMap: grain, bumpScale: .05 });
const plastic = new THREE.MeshPhysicalMaterial({ color: 0x121212, metalness: 0, roughness: .42, clearcoat: .35, clearcoatRoughness: .5 });
const rubber = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, metalness: 0, roughness: .85, sheen: .3, sheenColor: 0x222222 });
const copper = new THREE.MeshPhysicalMaterial({ color: 0xc8804c, metalness: 1, roughness: .28, roughnessMap: lathed });
const parts = buildInjector({ steel, cast, plastic, rubber, copper });

// inner gira no próprio eixo; outer deita a peça e dá a vista 3/4
const inner = new THREE.Group();
parts.forEach(([o]) => inner.add(o));
const outer = new THREE.Group();
outer.add(inner);
outer.rotation.set(.25, -.35, -Math.PI / 2);
// espelho fica num grupo de fora para inverter a cena já girada: ponta para a esquerda, apontando para o texto
const mirror = new THREE.Group();
mirror.scale.x = -1;
mirror.add(outer);
scene.add(mirror);

let spread = 1;
const fit = () => {
  const w = box.clientWidth, h = box.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // tela em pé (celular): peça na vertical, bico para baixo; enquadra a peça explodida no lado maior
  const portrait = innerHeight > innerWidth;
  outer.rotation.z = portrait ? Math.PI : -Math.PI / 2;
  // tela deitada: diagonal subindo da ponta (embaixo, esquerda) ao conector (em cima, direita)
  const tilt = portrait ? .18 : .72;
  mirror.rotation.z = tilt;
  const vhalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // canvas ocupa a tela toda (nada corta); a peça vive numa faixa à direita: começa em 38% e vai até a borda
  const span = portrait ? 1 : .66, center = portrait ? .5 : .68;
  const half = portrait ? 44 : 60; // meia-peça explodida, em unidades da cena
  spread = portrait ? .45 : .42; // peça grande no desktop: explosão mais curta para caber
  // deitada: comprimento na horizontal; em pé: comprimento na vertical
  const along = half * Math.cos(tilt), across = half * Math.sin(tilt);
  const d = portrait
    ? Math.max(along / vhalf, across / (vhalf * camera.aspect))
    : Math.max(along / (vhalf * camera.aspect * span), across / vhalf);
  mirror.position.x = (center - .5) * 2 * d * vhalf * camera.aspect;
  // câmera um pouco abaixo = peça um pouco acima, longe do parágrafo
  camera.position.set(0, portrait ? 0 : -.12 * d * vhalf, d);
  camera.updateProjectionMatrix();
};

let visible = true, lost = false;
const render = () => {
  if (!visible || lost) return; // fora da tela ou sem GPU: não desenha
  const p = parseFloat(getComputedStyle(hero).getPropertyValue('--p')) || 0;
  parts.forEach(([o, dy]) => { o.position.y = o.userData.y + p * dy * spread; });
  inner.rotation.y = p * Math.PI * 1.2;
  renderer.render(scene, camera);
};

let queued = false;
const frame = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; render(); }); } };
addEventListener('scroll', frame, { passive: true });
// barra de endereço do celular muda a altura ao rolar; só refaz o tamanho em mudança real
let lastW = 0, lastH = 0;
new ResizeObserver(() => {
  const w = box.clientWidth, h = box.clientHeight;
  if (w === lastW && Math.abs(h - lastH) < 160) return;
  lastW = w; lastH = h; fit(); render();
}).observe(box);
new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) frame(); }).observe(hero);

// se o navegador derrubar o WebGL (falta de memória no celular), reconstrói ao voltar; sem volta, mostra o SVG
const canvas = renderer.domElement;
let fallback;
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  lost = true;
  fallback = setTimeout(() => hero.classList.remove('has-3d'), 1500);
});
canvas.addEventListener('webglcontextrestored', () => {
  clearTimeout(fallback);
  lost = false;
  makeEnv();
  hero.classList.add('has-3d');
  fit(); render();
});
hero.classList.add('has-3d');

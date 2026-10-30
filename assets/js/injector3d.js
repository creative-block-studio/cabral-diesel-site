// Bico injetor 3D: peças de revolução (torno) montadas no eixo; --p do hero (site.js) explode e gira.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const hero = document.querySelector('.hero');
const box = document.querySelector('.injector-3d');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
box.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// metal só aparece com algo para refletir: ambiente de estúdio gerado, sem baixar HDR
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
const camera = new THREE.PerspectiveCamera(28, 1, 1, 1000);
const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(30, 60, 80); scene.add(key);
const rim = new THREE.DirectionalLight(0xf9230e, .6); rim.position.set(-60, -30, -40); scene.add(rim);

// materiais de bancada: aço usinado, corpo fundido (mais fosco), plástico do conector, borracha e cobre
const steel = new THREE.MeshStandardMaterial({ color: 0xd0d0cf, metalness: .95, roughness: .22 });
const cast = new THREE.MeshStandardMaterial({ color: 0x77736e, metalness: .85, roughness: .55 });
const plastic = new THREE.MeshStandardMaterial({ color: 0x161616, metalness: 0, roughness: .55 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, metalness: 0, roughness: .8 });
const copper = new THREE.MeshStandardMaterial({ color: 0xc27a45, metalness: 1, roughness: .3 });
const line = new THREE.LineBasicMaterial({ color: 0xd4d4d3, transparent: true, opacity: .12 });

// perfil [raio, y] girado em torno do eixo Y; y é o comprimento da peça (conector em -y, ponta em +y)
const lathe = pts => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64);
const mesh = (geo, mat, edges = false) => {
  const m = new THREE.Mesh(geo, mat);
  if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 24), line));
  return m;
};
const ring = (r, tube, y, mat = rubber) => {
  const m = mesh(new THREE.TorusGeometry(r, tube, 12, 64), mat);
  m.rotation.x = Math.PI / 2; m.position.y = y;
  return m;
};
// rosca: perfil em dente de serra ao longo do eixo
const thread = (r, len) => lathe([[0, 0], ...Array.from({ length: Math.round(len / .35) }, (_, i) => [[r, i * .35], [r + .2, i * .35 + .17]]).flat(), [r, len], [0, len]]);

// cada peça: [objeto, deslocamento na explosão]; ordem de bancada: cabeça, corpo, internos, porca, bico
const parts = [];
const add = (obj, dy) => { parts.push([obj, dy]); return obj; };

// cabeça: conector plástico do solenoide + capa + porca sextavada
const head = new THREE.Group();
const plug = mesh(new THREE.BoxGeometry(5.6, 6, 6.4), plastic); plug.position.set(.6, -37, 0); head.add(plug);
const socket = mesh(new THREE.BoxGeometry(3.8, 4, 1), rubber); socket.position.set(.6, -37.4, 3.3); head.add(socket);
const latch = mesh(new THREE.BoxGeometry(2.2, 1.2, 2.4), plastic); latch.position.set(.6, -40.4, 1.6); head.add(latch);
head.add(mesh(lathe([[0, -34], [3.1, -34], [3.6, -33.4], [3.6, -29.6], [3.1, -29], [0, -29]]), steel));
head.add(mesh(new THREE.CylinderGeometry(4.3, 4.3, 4, 6).translate(0, -27, 0), steel, true));
add(head, -24);

// corpo fundido com colar, entrada de alta pressão em ângulo e retorno
const body = new THREE.Group();
body.add(mesh(lathe([[0, -25], [3.4, -25], [3.4, -21.5], [4, -21], [4, -15], [3.4, -14.5],
  [3.4, -3], [3.6, -2.6], [3.6, 4], [0, 4]]), cast, true));
body.add(ring(3.45, .35, -9), ring(3.45, .35, -6));
const inlet = new THREE.Group();
inlet.add(mesh(new THREE.CylinderGeometry(2, 2.2, 3, 32).translate(0, 1.5, 0), cast));
inlet.add(mesh(new THREE.CylinderGeometry(2.3, 2.3, 2, 6).translate(0, 3.8, 0), steel, true));
inlet.add(mesh(thread(1.3, 4.5).translate(0, 4.8, 0), steel));
inlet.position.set(3.2, -18, 0);
inlet.rotation.z = -(Math.PI / 2 + .45); // sai pelo lado, inclinada para o conector
body.add(inlet);
const leak = mesh(new THREE.CylinderGeometry(.8, .8, 2.6, 24), steel);
leak.rotation.z = Math.PI / 2; leak.position.set(-4.2, -23, 0); body.add(leak);
add(body, -12);

// internos (escondidos quando montado): haste da válvula, mola e placa intermediária
const internals = new THREE.Group();
internals.add(mesh(new THREE.CylinderGeometry(.55, .55, 7, 24).translate(0, 1.5, 0), cast));
const helix = new THREE.CatmullRomCurve3(Array.from({ length: 160 }, (_, i) => {
  const t = i / 159, a = t * Math.PI * 2 * 7;
  return new THREE.Vector3(Math.cos(a) * 1.6, -.5 + t * 6, Math.sin(a) * 1.6);
}));
internals.add(mesh(new THREE.TubeGeometry(helix, 320, .22, 8), steel));
internals.add(mesh(new THREE.CylinderGeometry(2.5, 2.5, .9, 48).translate(0, 6.6, 0), steel));
add(internals, 0);

// porca do bico com o-ring
const nut = new THREE.Group();
nut.add(mesh(lathe([[0, 4], [3.5, 4], [3.5, 13], [3.25, 13.4], [3.25, 15], [2.2, 18], [2.2, 20], [0, 20]]), steel, true));
nut.add(ring(3.5, .38, 9.5));
add(nut, 12);

// bico: corpo (dentro da porca), haste curta, ponta arredondada e arruela de cobre
const nozzle = new THREE.Group();
nozzle.add(mesh(lathe([[0, 7.5], [2.4, 7.5], [2.4, 17], [1.6, 17.5], [1.3, 20.5], [1.2, 25],
  [.9, 26.5], [.7, 27.5], [.35, 28.2], [0, 28.5]]), steel));
nozzle.add(mesh(lathe([[1.3, 20], [2.6, 20], [2.6, 20.7], [1.3, 20.7], [1.3, 20]]), copper));
add(nozzle, 22);

// inner gira no próprio eixo; outer deita a peça e dá a vista 3/4
const inner = new THREE.Group();
parts.forEach(([o]) => { o.position.y += 6; o.userData.y = o.position.y; inner.add(o); }); // +6 centraliza a peça (-41..28.5) no eixo
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
  const tilt = portrait ? .18 : .3;
  mirror.rotation.z = tilt;
  const vhalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // canvas ocupa a tela toda (nada corta); a peça vive numa faixa à direita: começa em 38% e vai até a borda
  const span = portrait ? 1 : .66, center = portrait ? .5 : .68;
  const half = portrait ? 56 : 44; // meia-peça explodida, em unidades da cena
  spread = portrait ? .45 : .6; // peça grande no desktop: explosão mais curta para caber
  // deitada: comprimento na horizontal; em pé: comprimento na vertical
  const along = half * Math.cos(tilt), across = half * Math.sin(tilt);
  const d = portrait
    ? Math.max(along / vhalf, across / (vhalf * camera.aspect))
    : Math.max(along / (vhalf * camera.aspect * span), across / vhalf);
  mirror.position.x = (center - .5) * 2 * d * vhalf * camera.aspect;
  // câmera um pouco abaixo = peça um pouco acima, longe do parágrafo
  camera.position.set(0, portrait ? 0 : -.3 * d * vhalf, d);
  camera.updateProjectionMatrix();
};

const render = () => {
  const p = parseFloat(getComputedStyle(hero).getPropertyValue('--p')) || 0;
  parts.forEach(([o, dy]) => { o.position.y = o.userData.y + p * dy * spread; });
  inner.rotation.y = p * Math.PI * 1.2;
  renderer.render(scene, camera);
};

let queued = false;
const frame = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; render(); }); } };
addEventListener('scroll', frame, { passive: true });
new ResizeObserver(() => { fit(); render(); }).observe(box);
hero.classList.add('has-3d');

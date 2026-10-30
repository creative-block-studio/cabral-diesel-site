// Serviços: bico e bomba em desenho de linhas que giram e desmontam com o scroll, com o nome de cada peça.
// Só no desktop: no celular a seção não fica presa e a ficha de testes basta.
import * as THREE from 'three';
import { buildInjector } from './injector-model.js?v=12';

const sec = document.querySelector('.services');
const box = document.querySelector('.svc-3d');
const labelsBox = document.querySelector('.svc-labels');
const desktop = matchMedia('(min-width: 861px) and (prefers-reduced-motion: no-preference)');

if (desktop.matches && sec && box) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 1000);

  // traço de desenho técnico: faces na cor do fundo escondem as linhas de trás; só as arestas aparecem
  const fill = new THREE.MeshBasicMaterial({ color: 0x1b1b1a, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const ink = new THREE.LineBasicMaterial({ color: 0xe6e6e5, transparent: true, opacity: .7 });
  const lineArt = root => root.traverse(o => {
    if (!o.isMesh) return;
    o.material = fill;
    o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 1), ink)); // 1°: todo gomo e degrau vira traço
  });

  // bico: a mesma geometria do hero, deitada na diagonal
  const injParts = buildInjector({ steel: fill, cast: fill, plastic: fill, rubber: fill, copper: fill }, 20)
    .map(([o, dy, name]) => ({ o, dir: new THREE.Vector3(0, dy * .6, 0), name }));
  const injSpin = new THREE.Group();
  injParts.forEach(p => injSpin.add(p.o));
  const injector = new THREE.Group();
  injector.add(injSpin);
  injector.rotation.z = -Math.PI / 2 + .35;

  // bomba de alta radial: carcaça no eixo X, três elementos de bombeamento em volta, válvula atrás
  const pumpParts = [];
  const pumpSpin = new THREE.Group();
  const pump = new THREE.Group();
  pump.add(pumpSpin);
  const part = (name, dir, ...meshes) => {
    const g = new THREE.Group();
    meshes.forEach(m => g.add(m));
    g.userData.y = 0;
    pumpParts.push({ o: g, dir: new THREE.Vector3(...dir).multiplyScalar(.7), name });
    pumpSpin.add(g);
    return g;
  };
  const cyl = (r, len, x, segs = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, segs).rotateZ(Math.PI / 2).translate(x, 0, 0));
  part('Carcaça', [0, 0, 0], cyl(6, 9, 0), cyl(5.4, 2, -5.5), cyl(4.2, 1.2, -7));
  const flange = part('Flange de fixação', [9, 0, 0], cyl(7.6, 1.2, 5.2, 6));
  [0, 1, 2].forEach(k => {
    const a = k * Math.PI * 2 / 3;
    flange.add(new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 1.6, 20).rotateZ(Math.PI / 2).translate(5.2, Math.cos(a) * 6.2, Math.sin(a) * 6.2)));
  });
  part('Eixo de acionamento', [18, 0, 0], cyl(1.3, 7, 9), cyl(1.8, 1, 6.3),
    new THREE.Mesh(new THREE.BoxGeometry(2.4, .6, .6).translate(10.5, 1.3, 0)));
  [0, 1, 2].forEach(k => {
    const a = k * Math.PI * 2 / 3, up = new THREE.Vector3(0, Math.cos(a), Math.sin(a)); // k=0 aponta para cima
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.4, 4.4).translate(0, 7, 0)));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.6, 20).translate(0, 9.5, 0)));
    if (k === 0) { // saída de alta pressão no elemento de cima
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.4, 6).translate(0, 11, 0)));
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 2.4, 20).translate(0, 12.9, 0)));
    }
    g.rotation.x = a;
    part(k === 0 ? 'Elemento e saída de alta' : 'Elemento de bombeamento', up.multiplyScalar(9).toArray(), g);
  });
  part('Válvula reguladora', [-10, 4, 0],
    new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 5, 20).rotateZ(Math.PI / 2).translate(-7.5, 4.6, 0)),
    new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 3).translate(-10.8, 4.6, 0)));
  part('Entrada de combustível', [-9, -4, 0],
    new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 3.4, 20).rotateZ(Math.PI / 2).translate(-9, -3.2, 0)),
    new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1, 6).rotateZ(Math.PI / 2).translate(-8.6, -3.2, 0)));
  pump.rotation.set(.35, 0, .12);

  lineArt(injector); lineArt(pump);
  const models = [
    { root: injector, spin: injSpin, axis: 'y', parts: injParts, size: 50 },
    { root: pump, spin: pumpSpin, axis: 'x', parts: pumpParts, size: 29 },
  ];
  const turn = new THREE.Group();
  turn.scale.x = -1; // espelhado: a ponta (frente) aponta para a esquerda, para o texto
  models.forEach(m => { turn.add(m.root); m.parts.forEach(p => { p.base = p.o.position.clone(); }); });
  scene.add(turn);

  // um rótulo por peça: ponto, linha e nome; posicionado projetando a peça na tela
  models.forEach(m => m.parts.forEach((p, k) => {
    if (m.parts.findIndex(q => q.name === p.name) !== k) { p.el = document.createElement('div'); return; } // nome repetido: rótulo só uma vez
    p.el = document.createElement('div');
    p.el.className = 'svc-label';
    p.el.innerHTML = `<i></i><span>${p.name}</span>`;
    labelsBox.appendChild(p.el);
  }));

  const fit = () => {
    const w = box.clientWidth, h = box.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const v = new THREE.Vector3(), box3 = new THREE.Box3();
  let visible = false;
  const render = () => {
    if (!visible) return;
    const r = sec.getBoundingClientRect();
    const t = Math.min(Math.max(-r.top / (r.height - innerHeight), 0), .999);
    // o serviço ativo vem do texto (site.js marca .svc.active): modelo e informações trocam juntos
    const i = Math.max(0, [...document.querySelectorAll('.svc')].findIndex(el => el.classList.contains('active')));
    const u = Math.min(Math.max(t * models.length - i, 0), 1);
    // em cada metade do trilho: entra montado, desmonta no meio, monta de novo no fim
    const e = Math.sin(Math.PI * Math.min(Math.max((u - .08) / .84, 0), 1));
    const m = models[i];
    models.forEach((x, k) => { x.root.visible = k === i; });
    camera.position.set(0, 0, m.size / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(camera.aspect, 1.4) * 1.1);
    turn.rotation.y = -.35 + u * .7; // balanço leve; o giro de verdade é no eixo da peça
    m.spin.rotation[m.axis] = u * Math.PI * 1.5;
    m.parts.forEach(p => p.o.position.copy(p.base).addScaledVector(p.dir, e));
    renderer.render(scene, camera);
    const w = box.clientWidth, h = box.clientHeight;
    const shown = [];
    models.forEach((x, k) => x.parts.forEach(p => {
      const on = k === i && e > .55 && p.el.firstChild;
      p.el.classList.toggle('on', !!on);
      if (!on) return;
      box3.setFromObject(p.o).getCenter(v).project(camera); // centro da peça, não a origem do grupo
      shown.push({ p, x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h });
    }));
    // rótulos sem sobrepor: peça à esquerda do centro leva o nome para a esquerda; se ainda bater
    // com um rótulo já colocado do mesmo lado, o nome desce (o ponto fica na peça)
    const cx = shown.reduce((s, l) => s + l.x, 0) / (shown.length || 1);
    const placed = [];
    shown.sort((a, b) => a.y - b.y).forEach(l => {
      const wid = l.p.el.offsetWidth;
      // lado preferido pelo centro; se não couber na área do 3D (borda da tela ou ficha à esquerda), troca
      let flip = l.x < cx;
      if (flip && l.x - wid < 0) flip = false;
      if (!flip && l.x + wid > w - 24) flip = true;
      const x0 = flip ? l.x - wid : l.x, x1 = flip ? l.x : l.x + wid;
      let y = l.y;
      while (placed.some(q => Math.abs(q.y - y) < 24 && q.x0 < x1 && x0 < q.x1)) y += 6;
      placed.push({ y, x0, x1 });
      l.p.el.classList.toggle('flip', flip);
      l.p.el.style.setProperty('--dy', `${y - l.y}px`);
      l.p.el.style.transform = `translate(${l.x}px, ${l.y}px)`;
    });
  };

  let queued = false;
  const frame = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; render(); }); } };
  addEventListener('scroll', frame, { passive: true });
  new ResizeObserver(() => { fit(); frame(); }).observe(box);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; frame(); }).observe(sec);
  sec.classList.add('has-3d');
}

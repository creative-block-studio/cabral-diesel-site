// Geometria do bico injetor common rail, usada no hero (realista) e nos serviços (só linhas).
// Devolve [objeto, deslocamento na explosão, nome] na ordem de bancada: cabeça, corpo, internos, porca, bico.
import * as THREE from 'three';

// perfil [raio, y] girado em torno do eixo Y; y é o comprimento da peça (conector em -y, ponta em +y)
// segs: 128 no hero (curva lisa); poucos no desenho de linhas, onde cada gomo vira uma linha do traço
let segs = 128;
const lathe = pts => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
// rosca: perfil em dente de serra ao longo do eixo
const thread = (r, len) => lathe([[0, 0], ...Array.from({ length: Math.round(len / .35) }, (_, i) => [[r, i * .35], [r + .2, i * .35 + .17]]).flat(), [r, len], [0, len]]);

export function buildInjector({ steel, cast, plastic, rubber, copper }, radial = 128) {
  segs = radial;
  const mesh = (geo, mat) => new THREE.Mesh(geo, mat);
  const ring = (r, tube, y) => {
    const m = mesh(new THREE.TorusGeometry(r, tube, 12, radial), rubber);
    m.rotation.x = Math.PI / 2; m.position.y = y;
    return m;
  };
  const parts = [];
  const add = (obj, dy, name) => { parts.push([obj, dy, name]); return obj; };

  // cabeça: conector plástico do solenoide + capa + porca sextavada
  const head = new THREE.Group();
  const plug = mesh(new THREE.BoxGeometry(5.6, 6, 6.4), plastic); plug.position.set(.6, -37, 0); head.add(plug);
  const socket = mesh(new THREE.BoxGeometry(3.8, 4, 1), rubber); socket.position.set(.6, -37.4, 3.3); head.add(socket);
  const latch = mesh(new THREE.BoxGeometry(2.2, 1.2, 2.4), plastic); latch.position.set(.6, -40.4, 1.6); head.add(latch);
  head.add(mesh(lathe([[0, -34], [3.1, -34], [3.6, -33.4], [3.6, -29.6], [3.1, -29], [0, -29]]), steel));
  head.add(mesh(new THREE.CylinderGeometry(4.3, 4.3, 4, 6).translate(0, -27, 0), steel));
  add(head, -24, 'Solenoide e conector');

  // corpo fundido com colar, entrada de alta pressão em ângulo e retorno
  const body = new THREE.Group();
  body.add(mesh(lathe([[0, -25], [3.4, -25], [3.4, -21.5], [4, -21], [4, -15], [3.4, -14.5],
    [3.4, -3], [3.6, -2.6], [3.6, 4], [0, 4]]), cast));
  body.add(ring(3.45, .35, -9), ring(3.45, .35, -6));
  const inlet = new THREE.Group();
  inlet.add(mesh(new THREE.CylinderGeometry(2, 2.2, 3, radial).translate(0, 1.5, 0), cast));
  inlet.add(mesh(new THREE.CylinderGeometry(2.3, 2.3, 2, 6).translate(0, 3.8, 0), steel));
  inlet.add(mesh(thread(1.3, 4.5).translate(0, 4.8, 0), steel));
  inlet.position.set(3.2, -18, 0);
  inlet.rotation.z = -(Math.PI / 2 + .45); // sai pelo lado, inclinada para o conector
  body.add(inlet);
  const leak = mesh(new THREE.CylinderGeometry(.8, .8, 2.6, 24), steel);
  leak.rotation.z = Math.PI / 2; leak.position.set(-4.2, -23, 0); body.add(leak);
  add(body, -12, 'Corpo e entrada de alta');

  // internos (escondidos quando montado): haste da válvula, mola e placa intermediária
  const internals = new THREE.Group();
  internals.add(mesh(new THREE.CylinderGeometry(.55, .55, 7, 24).translate(0, 1.5, 0), cast));
  const helix = new THREE.CatmullRomCurve3(Array.from({ length: 160 }, (_, i) => {
    const t = i / 159, a = t * Math.PI * 2 * 7;
    return new THREE.Vector3(Math.cos(a) * 1.6, -.5 + t * 6, Math.sin(a) * 1.6);
  }));
  internals.add(mesh(new THREE.TubeGeometry(helix, 320, .22, 8), steel));
  internals.add(mesh(new THREE.CylinderGeometry(2.5, 2.5, .9, 48).translate(0, 6.6, 0), steel));
  add(internals, 0, 'Válvula e mola');

  // porca do bico com o-ring
  const nut = new THREE.Group();
  nut.add(mesh(lathe([[0, 4], [3.5, 4], [3.5, 13], [3.25, 13.4], [3.25, 15], [2.2, 18], [2.2, 20], [0, 20]]), steel));
  nut.add(ring(3.5, .38, 9.5));
  add(nut, 12, 'Porca do bico');

  // bico: corpo (dentro da porca), haste curta, ponta arredondada e arruela de cobre
  const nozzle = new THREE.Group();
  nozzle.add(mesh(lathe([[0, 7.5], [2.4, 7.5], [2.4, 17], [1.6, 17.5], [1.3, 20.5], [1.2, 25],
    [.9, 26.5], [.7, 27.5], [.35, 28.2], [0, 28.5]]), steel));
  nozzle.add(mesh(lathe([[1.3, 20], [2.6, 20], [2.6, 20.7], [1.3, 20.7], [1.3, 20]]), copper));
  add(nozzle, 22, 'Bico e arruela de cobre');

  // +6 centraliza a peça (-41..28.5) no eixo; userData.y guarda a posição montada
  parts.forEach(([o]) => { o.position.y += 6; o.userData.y = o.position.y; });
  return parts;
}

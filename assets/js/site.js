// recarregar sempre volta ao topo: o navegador não restaura a rolagem nem pula para a âncora da URL
history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
scrollTo(0, 0);

// Hero: a peça começa desmontada (--p=1) e termina de montar em 80% do trilho, com easing
const hero = document.querySelector('.hero');
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const update = () => {
    const r = hero.getBoundingClientRect();
    const x = Math.min(Math.max(-r.top / ((r.height - innerHeight) * .8), 0), 1);
    hero.style.setProperty('--p', (1 - x * x * (3 - 2 * x)).toFixed(3));
  };
  addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  update();
}

// motion leve: textos, listas e botões aparecem ao entrar na tela; irmãos entram em cascata (--i)
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const els = document.querySelectorAll('.hero .tag, .hero h1, .hero-foot > *, .section h2, .two-col > p, .symptoms-intro > p, .symptoms-intro > .btn, .readout li, .applications, .sheet li, .about > div > *, .faq details, .contact h2, .contact p, .contact .btn, .info');
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    io.unobserve(el);
    // depois de entrar, devolve as transições próprias do elemento (hover dos botões)
    setTimeout(() => el.classList.remove('reveal', 'in'), 1500);
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => {
    el.style.setProperty('--i', [...el.parentElement.children].filter(c => c.matches('.reveal')).length);
    el.classList.add('reveal');
    io.observe(el);
  });
}

// navbar: esconde ao rolar para baixo, volta ao rolar para cima (ou perto do topo)
const header = document.querySelector('.header');
let lastY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  if (Math.abs(y - lastY) < 6) return; // ignora tremidas do trackpad
  header.classList.toggle('hide', y > lastY && y > 120);
  lastY = y;
}, { passive: true });

// serviços: a posição no trilho escolhe o serviço ativo; as linhas animam em CSS ao ativar
const svcSec = document.querySelector('.services');
const svcs = [...document.querySelectorAll('.svc')];
const pinned = matchMedia('(min-width: 861px) and (prefers-reduced-motion: no-preference)');
const pickSvc = () => {
  if (!pinned.matches) { svcs.forEach(s => s.classList.add('active')); return; }
  const r = svcSec.getBoundingClientRect();
  const t = Math.min(Math.max(-r.top / (r.height - innerHeight), 0), .999);
  const i = Math.floor(t * svcs.length);
  svcs.forEach((s, k) => s.classList.toggle('active', k === i));
};
addEventListener('scroll', pickSvc, { passive: true });
addEventListener('resize', pickSvc);
pickSvc();

// mapa: rotas se desenham quando a seção entra na tela
const map = document.querySelector('.map');
if (map) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { map.classList.add('drawn'); o.disconnect(); } }, { threshold: .3 }).observe(map);

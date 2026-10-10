/* Revelação ao rolar das páginas de serviço. A classe sp-anim só entra
   quando o IntersectionObserver existe: sem ele, o conteúdo fica parado e
   visível, nunca escondido esperando um script que não roda. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var alvos = document.querySelectorAll('.rv');
  document.documentElement.classList.add('sp-anim');
  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  alvos.forEach(function (el) { io.observe(el); });
})();

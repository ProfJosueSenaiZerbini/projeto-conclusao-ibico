document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    aceitos: document.getElementById('panel-aceitos'),
    pendentes: document.getElementById('panel-pendentes'),
  };

  function activate(target) {
    tabs.forEach(tab => {
      const isActive = tab.dataset.target === target;
      tab.classList.toggle('tab--active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });

    Object.entries(panels).forEach(([key, panel]) => {
      if (key === target) {
        panel.classList.remove('panel--hidden');
        // reinicia a animação de entrada toda vez que a aba é trocada
        panel.style.animation = 'none';
        // force reflow para o navegador "esquecer" a animação anterior
        void panel.offsetWidth;
        panel.style.animation = '';
      } else {
        panel.classList.add('panel--hidden');
      }
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activate(tab.dataset.target));
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const cardContratante = document.getElementById('cardContratante');
  const cardTrabalhador = document.getElementById('cardTrabalhador');
  const fieldsContratante = document.getElementById('fieldsContratante');
  const fieldsTrabalhador = document.getElementById('fieldsTrabalhador');
  const tipoPerfilInput = document.getElementById('tipoPerfilInput');
  const visualImage = document.getElementById('visualImage');

  // Função para alternar para a view de Trabalhador
  function ativarModoTrabalhador() {
    cardContratante.classList.remove('active');
    cardTrabalhador.classList.add('active');
    
    document.body.classList.add('theme-trabalhador');
    tipoPerfilInput.value = 'Trabalhador';

    // Exibe/oculta seções específicas de cada wireframe
    fieldsTrabalhador.style.display = 'block';

    // Opcional: Atualizar a imagem lateral temporária para o trabalhador
    visualImage.src = 'https://placehold.co/600x400/0284c7/ffffff?text=Imagem+Trabalhador';
  }

  // Função para alternar para a view de Contratante
  function ativarModoContratante() {
    cardTrabalhador.classList.remove('active');
    cardContratante.classList.add('active');
    
    document.body.classList.remove('theme-trabalhador');
    tipoPerfilInput.value = 'Contratante';

    fieldsTrabalhador.style.display = 'none';

    // Voltar imagem temporária do contratante
    visualImage.src = 'https://placehold.co/600x400/16a34a/ffffff?text=Imagem+Contratante';
  }

  cardContratante.addEventListener('click', ativarModoContratante);
  cardTrabalhador.addEventListener('click', ativarModoTrabalhador);

  // Toggle de visibilidade da senha
  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const inputId = button.getAttribute('data-toggle-password');
      const input = document.getElementById(inputId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });
});
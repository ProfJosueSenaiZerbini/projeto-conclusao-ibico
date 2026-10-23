document.addEventListener('DOMContentLoaded', () => {
  const cardContratante = document.getElementById('cardContratante');
  const cardTrabalhador = document.getElementById('cardTrabalhador');
  const fieldsContratante = document.getElementById('fieldsContratante');
  const fieldsTrabalhador = document.getElementById('fieldsTrabalhador');
  const tipoPerfilInput = document.getElementById('tipoPerfilInput');
  const visualImage = document.getElementById('visualImage');
  const visualTag = document.getElementById('visualTag');
  const visualTitle = document.getElementById('visualTitle');
  const visualDesc = document.getElementById('visualDesc');
  const signupTitle = document.getElementById('signupTitle');
  const signupSubtitle = document.getElementById('signupSubtitle');

  // Função para alternar para a view de Trabalhador
  function ativarModoTrabalhador() {
    cardContratante.classList.remove('active');
    cardTrabalhador.classList.add('active');

    document.body.classList.add('theme-trabalhador');
    tipoPerfilInput.value = 'Trabalhador';
    visualTag.textContent = 'Para quem trabalha';
    visualTitle.textContent = 'Seu talento pode abrir novas oportunidades.';
    visualDesc.textContent = 'Crie seu perfil, encontre serviços locais e conecte-se a quem precisa do seu trabalho.';
    signupTitle.textContent = 'Crie sua conta de Trabalhador';
    signupSubtitle.textContent = 'Encontre oportunidades e mostre o valor do seu trabalho.';

    // Exibe/oculta seções específicas de cada wireframe
    fieldsTrabalhador.style.display = 'block';

    // Opcional: Atualizar a imagem lateral temporária para o trabalhador
    visualImage.src = 'https://s2-g1.glbimg.com/4GbQBWVUJfunH7obkbycC1-BAPk=/0x0:1233x815/600x0/smart/filters:gifv():strip_icc()/i.s3.glbimg.com/v1/AUTH_59edd422c0c84a879bd37670ae4f538a/internal_photos/bs/2021/V/M/4RwaQ1SPewxbgBM4uAgA/rudimar.jpg';
    visualImage.alt = 'Tiê-de-sangue, identidade do perfil Trabalhador';
  }

  // Função para alternar para a view de Contratante
  function ativarModoContratante() {
    cardTrabalhador.classList.remove('active');
    cardContratante.classList.add('active');

    document.body.classList.remove('theme-trabalhador');
    tipoPerfilInput.value = 'Contratante';
    visualTag.textContent = 'Para quem contrata';
    visualTitle.textContent = 'Conecte seus projetos a talentos locais.';
    visualDesc.textContent = 'Publique seus bicos e encontre profissionais para realizar cada oportunidade com agilidade.';
    signupTitle.textContent = 'Crie sua conta de Contratante';
    signupSubtitle.textContent = 'Encontre profissionais para tirar seus projetos do papel.';

    fieldsTrabalhador.style.display = 'none';

    // Voltar imagem temporária do contratante
    visualImage.src = 'https://www.coisasdaroca.com/wp-content/uploads/2017/05/v-27-e1496090254861.jpg';
    visualImage.alt = 'Araponga, identidade do perfil Contratante';
  }

  cardContratante.addEventListener('click', ativarModoContratante);
  cardTrabalhador.addEventListener('click', ativarModoTrabalhador);

  if (tipoPerfilInput.value.toLowerCase() === 'trabalhador') {
    ativarModoTrabalhador();
  } else {
    ativarModoContratante();
  }

  // Toggle de visibilidade da senha
  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const inputId = button.getAttribute('data-toggle-password');
      const input = document.getElementById(inputId);
      if (input) {
        const isVisible = input.type === 'password';
        input.type = isVisible ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(isVisible));
        button.setAttribute(
          'aria-label',
          `${isVisible ? 'Ocultar' : 'Mostrar'} ${button.getAttribute('data-toggle-label')}`
        );
      }
    });
  });
});
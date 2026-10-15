document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-finalizar-bico');
  const botao = document.getElementById('btn-finalizar-bico');
  const feedback = document.getElementById('feedback-finalizar-bico');
  const statusBico = document.getElementById('status-bico');

  if (!form || !botao || !feedback || !statusBico) return;

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (!window.confirm('Deseja realmente finalizar este serviço?')) return;

    botao.disabled = true;
    feedback.textContent = '';

    try {
      const resposta = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      });

      let dados;
      try {
        dados = await resposta.json();
      } catch (_erroJson) {
        throw new Error('O servidor retornou uma resposta inválida.');
      }

      if (!resposta.ok || dados.sucesso !== true) {
        throw new Error(dados.erro || 'Não foi possível finalizar o serviço.');
      }

      statusBico.textContent = `• ${dados.status}`;
      feedback.textContent = dados.mensagem || 'Serviço finalizado com sucesso.';
      form.remove();
    } catch (erro) {
      feedback.textContent = erro instanceof TypeError
        ? 'Falha de conexão. Verifique sua rede e tente novamente.'
        : erro.message || 'Não foi possível finalizar o serviço.';
      botao.disabled = false;
    }
  });
});

// Função para alternar entre "Quero Contratar" e "Quero Trabalhar"
function selecionarPerfil(perfil) {
    document.getElementById('card-contratar').classList.remove('active');
    document.getElementById('card-trabalhar').classList.remove('active');
    
    if (perfil === 'Contratante') {
        document.getElementById('card-contratar').classList.add('active');
    } else {
        document.getElementById('card-trabalhar').classList.add('active');
    }

    // Atualiza o valor do input escondido que vai para o backend
    document.getElementById('tipoPerfil').value = perfil;
}

// Função para mostrar/esconder a senha
function toggleSenha() {
    const senhaInput = document.getElementById('senha');
    const icon = document.querySelector('.toggle-password');
    
    if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        senhaInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}
import db from '../config/database.js';
import bcrypt from 'bcrypt';

// 1. Renderiza a tela visualizada no PDF (Perfil do Contratante / Trabalhador)
import pool from '../config/database.js';

export const exibirPerfil = async (req, res) => {
    const usuarioSession = req.session?.usuario;

    if (!usuarioSession) {
        return res.redirect('/login');
    }

    const usuarioId = usuarioSession.id || usuarioSession.id_usuario;

    try {
        // Busca os dados atualizados do banco de dados
        const [usuarios] = await pool.query(
            "SELECT id, nome, email, cpf, idade, tipo_perfil, DATE_FORMAT(criado_em, '%d/%m/%Y') AS data_cadastro_formatada FROM usuarios WHERE id = ?",
            [usuarioId]
        );

        const usuario = Array.isArray(usuarios) ? usuarios[0] : usuarios;

        if (!usuario) {
            return res.redirect('/login');
        }

        // Seleciona a view de acordo com o perfil
        const viewDestino = usuario.tipo_perfil && usuario.tipo_perfil.toLowerCase() === 'trabalhador' 
            ? 'perfilTrabalhador' 
            : 'perfilContratante';

        return res.render(viewDestino, { usuario });

    } catch (erro) {
        console.error('❌ Erro ao exibir perfil:', erro);
        return res.status(500).send('Erro ao carregar os dados do perfil.');
    }
};

// 2. Renderiza formulário de edição de dados
export const exibirFormularioEditarPerfil = async (req, res) => {
    try {
        const usuarioId = req.session?.usuario?.id;
        if (!usuarioId) return res.redirect('/login');

        const [usuarios] = await pool.query(
            'SELECT id, nome, email, cpf, idade, tipo_perfil FROM usuarios WHERE id = ?',
            [usuarioId]
        );

        if (!usuarios || usuarios.length === 0) {
            return res.status(404).send('Usuário não encontrado.');
        }

        return res.render('editarPerfil', { usuario: usuarios[0] });
    } catch (erro) {
        console.error('❌ Erro ao carregar edição de perfil:', erro);
        return res.status(500).send('Erro ao carregar a página de edição.');
    }
};

// 3. Processa a atualização do perfil
// Processa a atualização dos dados no banco MySQL e atualiza a sessão
export const atualizarPerfil = async (req, res) => {
    // Pega o ID do usuário logado na sessão
    const usuarioId = req.session?.usuario?.id || req.session?.usuario?.id_usuario;

    if (!usuarioId) {
        return res.redirect('/login');
    }

    const { nome, email, idade } = req.body;

    try {
        // 1. Executa a atualização no banco de dados
        await pool.query(
            'UPDATE usuarios SET nome = ?, email = ?, idade = ? WHERE id = ?',
            [nome.trim(), email.trim(), idade || null, usuarioId]
        );

        // 2. Atualiza as informações guardadas na sessão
        if (req.session.usuario) {
            req.session.usuario.nome = nome.trim();
            req.session.usuario.email = email.trim();
            req.session.usuario.idade = idade;
        }

        console.log(`✅ Perfil atualizado com sucesso via modal para o usuário ID ${usuarioId}!`);

        // 3. Redireciona de volta para a mesma tela de perfil atualizada
        return res.redirect('/perfil');

    } catch (erro) {
        console.error('❌ Erro ao atualizar o perfil:', erro);
        return res.status(500).send('Erro interno do servidor ao tentar salvar o perfil.');
    }
};

// 4. Renderiza formulário de alteração de senha
export const exibirFormularioAlterarSenha = (req, res) => {
    return res.render('alterarSenha', { usuario: req.session.usuario });
};

// 5. Processa a alteração de senha
export const atualizarSenha = async (req, res) => {
    const usuarioId = req.session?.usuario?.id || req.session?.usuario?.id_usuario;
    if (!usuarioId) return res.redirect('/login');

    const { senhaAtual, novaSenha, confirmarNovaSenha } = req.body;

    // 1. Validações básicas de preenchimento
    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
        return res.status(400).send('Por favor, preencha todos os campos de senha.');
    }

    if (novaSenha !== confirmarNovaSenha) {
        return res.status(400).send('A nova senha e a confirmação não conferem.');
    }

    try {
        // 2. Busca a senha atual criptografada no banco de dados
        const [usuarios] = await pool.query('SELECT senha FROM usuarios WHERE id = ?', [usuarioId]);
        const usuario = Array.isArray(usuarios) ? usuarios[0] : usuarios;

        if (!usuario) {
            return res.status(404).send('Usuário não encontrado.');
        }

        // 3. Compara a senha informada com a senha salva no banco
        const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
        if (!senhaCorreta) {
            return res.status(401).send('A senha atual está incorreta.');
        }

        // 4. Criptografa a nova senha e atualiza no MySQL
        const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
        await pool.query('UPDATE usuarios SET senha = ? WHERE id = ?', [novaSenhaHash, usuarioId]);

        console.log(`✅ Senha alterada com sucesso para o usuário ID ${usuarioId}!`);
        return res.redirect('/perfil');

    } catch (erro) {
        console.error('❌ Erro ao alterar senha:', erro);
        return res.status(500).send('Erro interno ao tentar alterar a senha.');
    }
};
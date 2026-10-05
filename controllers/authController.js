import pool from '../config/database.js';
import bcrypt from 'bcrypt';
import {
    normalizarCPF,
    validarConfirmacaoSenha,
    validarEmail,
    validarNome,
    validarSenha
} from '../validations/usuarioValidation.js';

export const criarCadastradorUsuario = (banco, hasher = bcrypt) => async (req, res) => {
    const body = req.body || {};

    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const cpfInformado = typeof body.cpf === 'string' ? body.cpf.trim() : '';
    const cpf = normalizarCPF(cpfInformado);
    const tipoPerfilRecebido = typeof body.tipoPerfil === 'string' ? body.tipoPerfil.trim().toLowerCase() : '';
    const tipoPerfil = ['contratante', 'trabalhador'].includes(tipoPerfilRecebido) ? tipoPerfilRecebido : null;

    if (!nome || !email || !cpfInformado) {
        return res.status(400).send('Preencha nome, e-mail e CPF.');
    }

    if (!validarEmail(email)) {
        return res.status(400).send('Digite um e-mail válido.');
    }

    if (!cpf) {
        return res.status(400).send('Digite um CPF válido.');
    }

    if (!validarNome(nome, 3)) {
        return res.status(400).send('O nome deve ter entre 3 e 100 caracteres.');
    }

    if (!validarSenha(body.senha)) {
        return res.status(400).send('A senha deve ter ao menos 6 caracteres e no máximo 72 bytes.');
    }

    if (typeof body.confirmarSenha !== 'string' || !body.confirmarSenha) {
        return res.status(400).send('A confirmação da senha é obrigatória.');
    }

    if (!validarConfirmacaoSenha(body.senha, body.confirmarSenha)) {
        return res.status(400).send('As senhas não coincidem.');
    }

    if (!tipoPerfil) {
        return res.status(400).send('Tipo de usuário inválido.');
    }

    if (!['on', 'true', '1', true].includes(body.termos)) {
        return res.status(400).send('É necessário aceitar os termos de uso e a política de privacidade.');
    }

    if (!['on', 'true', '1', true].includes(body.maiorIdade)) {
        return res.status(400).send('É necessário confirmar que possui 18 anos ou mais.');
    }

    try {
        const usuarioExistente = await banco.query(
            'SELECT id FROM usuarios WHERE email = ? OR cpf = ? OR cpf = ?',
            [email, cpf, cpf.replace(/\D/g, '')]
        );

        if (usuarioExistente.length > 0) {
            return res.status(409).send('E-mail ou CPF já cadastrado no sistema.');
        }

        const salt = await hasher.genSalt(10);
        const senhaCriptografada = await hasher.hash(body.senha, salt);

        await banco.query(
            `INSERT INTO usuarios (nome, email, cpf, idade, senha, tipo_perfil)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nome, email, cpf, 18, senhaCriptografada, tipoPerfil]
        );

        return res.redirect('/login');
    } catch (erro) {
        if (erro?.code === 'ER_DUP_ENTRY' || erro?.errno === 1062) {
            return res.status(409).send('E-mail ou CPF já cadastrado no sistema.');
        }
        console.error('Erro interno durante cadastro:', erro?.code || 'erro inesperado');
        return res.status(500).send('Erro interno ao tentar cadastrar.');
    }
};

export const cadastrarUsuario = criarCadastradorUsuario(pool, bcrypt);

export const criarAutenticadorUsuario = (banco, hasher = bcrypt) => async (req, res) => {
    const body = req.body || {};

    const emailLimpo = typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    const senha = body.senha;
    const tipoPerfil = body.tipoPerfil;

    if (!validarEmail(emailLimpo) || typeof senha !== 'string' || !senha) {
        return res.status(400).send('Preencha o e-mail e a senha.');
    }

    try {
        const usuarios = await banco.query(
            'SELECT id, nome, email, cpf, senha, tipo_perfil, saldo_simulado FROM usuarios WHERE email = ?',
            [emailLimpo]
        );

        if (!usuarios || usuarios.length === 0) {
            return res.status(401).send('E-mail não cadastrado!');
        }

        const usuario = usuarios[0];

        if (!usuario || !usuario.senha) {
            console.error('Erro: consulta de login retornou um usuário sem senha.');
            return res.status(500).send('Erro ao processar os dados do usuário.');
        }

        // Comparação da senha criptografada
        const senhaValida = await hasher.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).send('Senha incorreta!');
        }

        // Validação de tipo de perfil (se selecionado na tela de login)
        if (tipoPerfil && usuario.tipo_perfil.toLowerCase() !== tipoPerfil.toLowerCase()) {
            return res.status(403).send(`Sua conta está cadastrada como ${usuario.tipo_perfil}. Alterne a opção para continuar.`);
        }

        // Salva os dados do usuário na sessão
        req.session.usuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            cpf: usuario.cpf,
            tipo_perfil: usuario.tipo_perfil,
            saldo_simulado: usuario.saldo_simulado
        };

        console.log(`✅ Login realizado! Usuário: ${usuario.nome} (ID: ${usuario.id}) | Perfil: ${usuario.tipo_perfil}`);

        if (usuario.tipo_perfil.toLowerCase() === 'trabalhador') {
            return res.redirect('/hometrabalhador');
        }

        return res.redirect('/homeContratante');

    } catch (error) {
        console.error('Erro no login:', error?.code || 'erro inesperado');
        return res.status(500).send('Erro interno do servidor ao tentar logar.');
    }
};

export const logarUsuario = criarAutenticadorUsuario(pool, bcrypt);

export const homeContratante = async (req, res) => {
    try {
        if (!req.session?.usuario) {
            return res.redirect('/login');
        }

        const contratanteId = req.session.usuario.id;
        const usuarios = await pool.query(
            'SELECT nome, saldo_simulado FROM usuarios WHERE id = ?',
            [contratanteId]
        );
        const usuario = usuarios[0];

        const bicos = await pool.query(
            'SELECT id, titulo, descricao, valor, bairro, status FROM bicos WHERE contratante_id = ? ORDER BY id DESC',
            [contratanteId]
        );

        return res.render('homeContratante', {
            usuario,
            bicos
        });
    } catch (erro) {
        console.error('Erro ao carregar dashboard do contratante:', erro);
        return res.status(500).send('Erro interno ao carregar a página.');
    }
};

export const exibirHistoricoTrabalhador = async (req, res) => {
    const trabalhador_id = req.session?.usuario?.id || req.session?.usuario?.id_usuario;

    if (!trabalhador_id) {
        return res.redirect('/login');
    }

    try {
        const queryAceitos = `
            SELECT 
                b.id AS bico_id,
                b.titulo,
                b.descricao,
                b.valor,
                b.status AS bico_status,
                DATE_FORMAT(b.data_servico, '%d/%m/%Y') AS data_servico_formatada,
                c.status AS candidatura_status
            FROM candidaturas c
            JOIN bicos b ON c.bico_id = b.id
            WHERE c.trabalhador_id = ? AND c.status = 'Aceito'
            ORDER BY b.data_servico DESC
        `;

        const queryPendentes = `
            SELECT 
                b.id AS bico_id,
                b.titulo,
                b.descricao,
                b.valor,
                b.status AS bico_status,
                DATE_FORMAT(b.data_servico, '%d/%m/%Y') AS data_servico_formatada,
                c.status AS candidatura_status
            FROM candidaturas c
            JOIN bicos b ON c.bico_id = b.id
            WHERE c.trabalhador_id = ? AND c.status = 'Pendente'
            ORDER BY c.criado_em DESC
        `;

        // Alterado de "db.query" para "pool.query"
        const bicosAceitos = await pool.query(queryAceitos, [trabalhador_id]);
        const bicosPendentes = await pool.query(queryPendentes, [trabalhador_id]);

        return res.render('historicoTrabalhador', {
            aceitos: bicosAceitos,
            pendentes: bicosPendentes,
            usuario: req.session.usuario
        });

    } catch (erro) {
        console.error('❌ Erro ao buscar histórico do trabalhador:', erro);
        return res.status(500).send('Erro ao carregar seu histórico.');
    }
};

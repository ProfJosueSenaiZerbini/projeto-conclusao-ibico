import pool from '../config/database.js';
import bcrypt from 'bcrypt';
import {
    erroDeDuplicidade,
    normalizarCpf,
    normalizarEmail,
    normalizarNome,
    senhaValida
} from '../utils/validacaoUsuario.js';

export const criarCadastradorUsuario = (banco, hasher = bcrypt) => async (req, res) => {
    const body = req.body || {};
    const nome = normalizarNome(body.nome, 3);
    const email = normalizarEmail(body.email);
    const cpf = normalizarCpf(body.cpf);
    const tipoPerfilRecebido = typeof body.tipoPerfil === 'string' ? body.tipoPerfil.trim().toLowerCase() : '';
    const tipoPerfil = ['contratante', 'trabalhador'].includes(tipoPerfilRecebido) ? tipoPerfilRecebido : null;

    if (!nome) return res.status(400).send('Informe um nome entre 3 e 100 caracteres.');
    if (!email) return res.status(400).send('Informe um e-mail válido com até 100 caracteres.');
    if (!cpf) return res.status(400).send('Informe um CPF no formato 000.000.000-00.');
    if (!body.senha || !body.confirmarSenha || typeof body.senha !== 'string' || typeof body.confirmarSenha !== 'string') {
        return res.status(400).send('Senha e confirmação são obrigatórias.');
    }
    if (!senhaValida(body.senha)) {
        return res.status(400).send('A senha deve ter ao menos 6 caracteres e no máximo 72 bytes.');
    }
    if (body.senha !== body.confirmarSenha) {
        return res.status(400).send('As senhas não coincidem.');
    }
    if (!tipoPerfil) return res.status(400).send('Tipo de usuário inválido.');
    if (!['on', 'true', '1', true].includes(body.termos)) {
        return res.status(400).send('É necessário aceitar os termos de uso e a política de privacidade.');
    }
    if (!['on', 'true', '1', true].includes(body.maiorIdade)) {
        return res.status(400).send('É necessário confirmar que possui 18 anos ou mais.');
    }

    try {
        const usuarioExistente = await banco.query(
            'SELECT id FROM usuarios WHERE email = ? OR cpf = ?',
            [email, cpf]
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
        if (erroDeDuplicidade(erro)) {
            return res.status(409).send('E-mail ou CPF já cadastrado no sistema.');
        }
        console.error('Erro interno durante cadastro:', erro?.code || 'erro inesperado');
        return res.status(500).send('Erro interno ao tentar cadastrar.');
    }
};

export const cadastrarUsuario = criarCadastradorUsuario(pool, bcrypt);

export const criarAutenticadorUsuario = (banco, hasher = bcrypt) => async (req, res) => {
    const emailLimpo = req.body.email ? req.body.email.trim() : '';
    const { senha, tipoPerfil } = req.body;

    try {
        // Executa a consulta
        const resultado = await banco.query(
            'SELECT id, nome, email, cpf, senha, tipo_perfil, saldo_simulado FROM usuarios WHERE email = ?',
            [emailLimpo]
        );

        // Trata o retorno do driver MySQL (seja array direto ou tupla [rows, fields])
        const usuarios = Array.isArray(resultado[0]) ? resultado[0] : resultado;

        // Se não houver nenhum registro retornado
        if (!usuarios || usuarios.length === 0) {
            return res.status(401).send('E-mail não cadastrado!');
        }

        // Pega o primeiro usuário encontrado
        const usuario = usuarios[0];

        // Garante que o usuário e a propriedade senha existam
        if (!usuario || !usuario.senha) {
            console.error('❌ Erro de estrutura do usuário retornado:', usuario);
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
        const resAceitos = await pool.query(queryAceitos, [trabalhador_id]);
        const resPendentes = await pool.query(queryPendentes, [trabalhador_id]);

        const bicosAceitos = Array.isArray(resAceitos[0]) ? resAceitos[0] : resAceitos;
        const bicosPendentes = Array.isArray(resPendentes[0]) ? resPendentes[0] : resPendentes;

        return res.render('historicoTrabalhador', {
            aceitos: Array.isArray(bicosAceitos) ? bicosAceitos : [],
            pendentes: Array.isArray(bicosPendentes) ? bicosPendentes : [],
            usuario: req.session.usuario
        });

    } catch (erro) {
        console.error('❌ Erro ao buscar histórico do trabalhador:', erro);
        return res.status(500).send('Erro ao carregar seu histórico.');
    }
};

import pool from '../config/database.js';
import bcrypt from 'bcrypt';

export const cadastrarUsuario = async (req, res) => {
    const { nome, email, cpf, maiorIdade, senha, confirmarSenha, tipoPerfil } = req.body;

    try {
        if (!nome || !email || !cpf || !senha || !confirmarSenha || !tipoPerfil) {
            return res.status(400).send('Todos os campos obrigatórios devem ser preenchidos.');
        }

        if (senha !== confirmarSenha) {
            return res.status(400).send('As senhas não coincidem!');
        }

        if (tipoPerfil.toLowerCase() === 'trabalhador' && !maiorIdade) {
            return res.status(403).send('Acesso Negado: Para trabalhar é preciso confirmar ter 18 anos ou mais!');
        }

        const usuarioExistente = await pool.query(
            'SELECT id FROM usuarios WHERE email = ? OR cpf = ?',
            [email, cpf]
        );

        if (usuarioExistente?.length > 0) {
            return res.status(409).send('E-mail ou CPF já cadastrado no sistema.');
        }

        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(senha, salt);
        const idadeFixa = 18;

        const queryInsert = `
            INSERT INTO usuarios (nome, email, cpf, idade, senha, tipo_perfil)
            VALUES (?, ?, ?, ?, ?, ?);
        `;

        await pool.query(queryInsert, [
            nome,
            email,
            cpf,
            idadeFixa,
            senhaCriptografada,
            tipoPerfil
        ]);

        console.log('✅ Usuário cadastrado no banco com sucesso!');
        return res.redirect('/login');
    } catch (erro) {
        console.error('❌ Erro no servidor durante cadastro:', erro);
        return res.status(500).send('Erro interno do servidor ao tentar cadastrar.');
    }
};

export const logarUsuario = async (req, res) => {
    const emailLimpo = req.body.email ? req.body.email.trim() : '';
    const { senha, tipoPerfil } = req.body;
    try {
        const usuarios = await pool.query(
            'SELECT id, nome, senha, tipo_perfil, saldo_simulado FROM usuarios WHERE email = ?',
            [emailLimpo]
        );

        if (usuarios.length === 0) {
            return res.status(401).send('E-mail não cadastrado!');
        }

        const usuario = usuarios[0];

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).send('Senha incorreta!');
        }

        if (tipoPerfil && usuario.tipo_perfil.toLowerCase() !== tipoPerfil.toLowerCase()) {
            return res.status(403).send(`Sua conta está cadastrada como ${usuario.tipo_perfil}. Alterne a opção para continuar.`);
        }

        req.session.usuario = {
            id: usuario.id,
            nome: usuario.nome,
            tipo_perfil: usuario.tipo_perfil,
            saldo_simulado: usuario.saldo_simulado
        };

        console.log(`✅ Login realizado! Usuário: ${usuario.nome} | Perfil: ${usuario.tipo_perfil}`);

        if (usuario.tipo_perfil.toLowerCase() === 'trabalhador') {
            return res.redirect('/hometrabalhador');
        }

        return res.redirect('/homeContratante');
    } catch (error) {
        console.error('❌ Erro detalhado no login:', error);
        return res.status(500).send('Erro interno do servidor ao tentar logar.');
    }
};

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
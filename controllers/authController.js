import pool from '../config/database.js';
import bcrypt from 'bcrypt';

export const cadastrarUsuario = async (req, res) => {
    // Captura os campos vindo do body do POST
    const { nome, email, cpf, maiorIdade, senha, confirmarSenha, tipoPerfil } = req.body;

    try {
        // 1. Validação simples de preenchimento
        if (!nome || !email || !cpf || !senha || !confirmarSenha || !tipoPerfil) {
            return res.status(400).send('Todos os campos obrigatórios devem ser preenchidos.');
        }

        if (senha !== confirmarSenha) {
            return res.status(400).send('As senhas não coincidem!');
        }

        // Validação da maioridade obrigatória
        if (tipoPerfil.toLowerCase() === 'trabalhador' && !maiorIdade) {
            return res.status(403).send('Acesso Negado: Para trabalhar é preciso confirmar ter 18 anos ou mais!');
        }

        // 2. Verifica se E-mail ou CPF já existem na tabela
        const usuarioExistente = await pool.query(
            'SELECT id FROM usuarios WHERE email = ? OR cpf = ?',
            [email, cpf]
        );

        if (usuarioExistente && usuarioExistente.length > 0) {
            return res.status(409).send('E-mail ou CPF já cadastrado no sistema.');
        }

        // 3. Hash da senha
        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(senha, salt);

        // Como o MySQL exige NOT NULL em idade, registramos 18 (pois o usuário marcou o checkbox)
        const idadeFixa = 18;

        // 4. Grava no banco de dados
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

// Função de Login
export const logarUsuario = async (req, res) => {
    // 1. Recebe e-mail, senha E o tipoPerfil selecionado na tela de login
    const { email, senha, tipoPerfil } = req.body;

    try {
        // 2. Busca o usuário no banco pelo e-mail
        const usuarios = await pool.query(
            'SELECT id, nome, senha, tipo_perfil FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).send('E-mail não cadastrado!');
        }

        const usuario = usuarios[0];

        // 3. Valida a senha criptografada com o bcrypt
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).send('Senha incorreta!');
        }

        // 4. (Opcional) Valida se o perfil que ele tentou logar coincide com o cadastrado
        // Se o seu sistema permitir trocar de perfil no login, você pode omitir esse 'if'
        if (tipoPerfil && usuario.tipo_perfil.toLowerCase() !== tipoPerfil.toLowerCase()) {
            return res.status(403).send(`Sua conta está cadastrada como ${usuario.tipo_perfil}. Alterne a opção para continuar.`);
        }

        // 5. Salva os dados na sessão
        if (req.session) {
            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                tipo_perfil: usuario.tipo_perfil
            };
        }

        console.log(`✅ Login realizado! Usuário: ${usuario.nome} | Perfil: ${usuario.tipo_perfil}`);

        // 6. Redireciona com base no tipo_perfil selecionado/cadastrado
        if (usuario.tipo_perfil.toLowerCase() === 'trabalhador') {
            return res.redirect('/hometrabalhador');
        } else {
            return res.redirect('/homeContratante');
        }

    } catch (error) {
        console.error('❌ Erro detalhado no login:', error);
        return res.status(500).send('Erro interno do servidor ao tentar logar.');
    }
};

export const homeContratante = async (req, res) => {
    try {
        // Verifica se o usuário está logado na sessão
        if (!req.session || !req.session.usuario) {
            return res.redirect('/login');
        }

        const contratanteId = req.session.usuario.id;

        // Busca dados atualizados do contratante
        const usuarios = await pool.query(
            'SELECT nome, saldo_simulado FROM usuarios WHERE id = ?',
            [contratanteId]
        );
        const usuario = usuarios[0];

        // Busca os bicos criados por este contratante
        const bicos = await pool.query(
            'SELECT id, titulo, descricao, valor, bairro, status FROM bicos WHERE contratante_id = ? ORDER BY id DESC',
            [contratanteId]
        );

        // Renderiza a página dashboard-contratante.ejs enviando os dados do banco
        return res.render('homeContratante', {
            usuario: usuario,
            bicos: bicos
        });

    } catch (erro) {
        console.error('Erro ao carregar dashboard do contratante:', erro);
        return res.status(500).send('Erro interno ao carregar a página.');
    }
};

export const exibirFormularioPublicar = (req, res) => {
    // Verifica se o usuário está logado
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    
    res.render('publicarBico', { 
        usuario: req.session.usuario 
    });
};
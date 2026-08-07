import pool from '../config/database.js';
import bcrypt from 'bcrypt';

export const cadastrarUsuario = async (req, res) => {
    // Recebe os Dados do formulário
    const { nome, email, cpf, idade, senha, confirmarSenha, tipoPerfil } = req.body;

    try {
        // 1. Validações básicas
        if (!nome || !email || !cpf || !idade || !senha || !confirmarSenha || !tipoPerfil) {
            return res.status(400).send('Todos os campos são obrigatórios');
        }

        if (senha !== confirmarSenha) {
            return res.status(400).send('As senhas não coincidem!');
        }

        // Validação de idade (transformando em número para garantir)
        if (tipoPerfil.toLowerCase() === 'trabalhador' && Number(idade) < 18) {
            return res.status(403).send('Acesso Negado: Para trabalhar é preciso ter 18 anos ou mais!');
        }

        // 2. Verifica se E-mail ou CPF já existem (com desestruturação [usuarioExistente])
        const usuarioExistente = await pool.query(
            'SELECT id FROM usuarios WHERE email = ? OR cpf = ?',
            [email, cpf]
        );

        if (usuarioExistente.length > 0) {
            return res.status(409).send('E-mail ou CPF já cadastrado no sistema.');
        }

        // 3. Criptografando a senha
        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(senha, salt);

        // 4. Salva no banco (Certifique-se se a coluna no MySQL se chama tipoPerfil ou tipo)
        const queryInsert = `
            INSERT INTO usuarios (nome, email, cpf, idade, senha, tipo_perfil)
            VALUES (?, ?, ?, ?, ?, ?);
        `;

        await pool.query(queryInsert, [
            nome,
            email,
            cpf,
            idade,
            senhaCriptografada,
            tipoPerfil,
        ]);

        // Redireciona para o login
        return res.redirect('/login');

    } catch (erro) {
        // DICA: Veja a mensagem detalhada do erro no seu terminal do VS Code!
        console.error('Erro interno no cadastro:', erro);
        return res.status(500).send('Erro Interno no Servidor');
    }
};

// Função de Login
export const logarUsuario = async (req, res) => {
    const { email, senha } = req.body;

    try {
        // 1. Busca no banco apenas pelo email e usando a coluna tipo_perfil
        const usuarios = await pool.query(
            'SELECT id, nome, senha, tipo_perfil FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).send('E-mail não cadastrado!');
        }

        const usuario = usuarios[0];

        // 2. Compara a senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).send('Senha incorreta!');
        }

        // 3. Salva os dados na sessão
        if (req.session) {
            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                tipo_perfil: usuario.tipo_perfil
            };
        }

        console.log(`Login feito! Tipo do perfil no banco: ${usuario.tipo_perfil}`);

        // 4. Redireciona verificando tipo_perfil (ignora maiúsculas/minúsculas)
        if (usuario.tipo_perfil && usuario.tipo_perfil.toLowerCase() === 'trabalhador') {
            return res.redirect('/hometrabalhador');
        } else {
            return res.send(`Logou com sucesso! O perfil no banco é: ${usuario.tipo_perfil}`);
        }

    } catch (error) {
        console.error('Erro detalhado no login:', error);
        return res.status(500).send('Erro interno do servidor.');
    }
};
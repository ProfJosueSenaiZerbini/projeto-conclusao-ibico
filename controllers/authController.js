import pool from '../config/database.js';
import pool from 'bcrypt';

export const cadastrarUsuario = async (req, res) => {
    // Recebe os Dados do fomulario da View
    // Adiciono o 'tipoPerfil' (Contatante ou Trabalhador);
    const { nome, email, cpf, idade, senha, confirmarSenha, tipoPerfil } = req.body;

    try {
        // validações das regras de negocios
        if (!nome || !email || !cpf || !idade || !senha || !confirmarSenha || !tipoPerfil) {
            return res.status(400).send('Todos os Campos são Obrigatorios');
        }
        // validação da senha 
        if (senha !== confirmarSenha) {
            return res.status(400).send('As senhas não coincidem!');
        }
        // RE002 / US03 - Restrição de idade apenas para Trabalhadores
        if (tipoPerfil === 'trabalhador' && idade < 18) {
            return res.status(403).send('Acesso Negado: Para Trabalhar e preciso ter 18 anos ou mais!');
        }

        // Integridade de Dados

        //Verifica se o E-mail e cpf ja existe no banco 
        const usuarioExistente = await pool.query(
            'SELECT id FROM usuarios WHERE email = ? OR cpf = ?',
            [email, cpf]
        );

        if (usuarioExistente.length > 0) {
            return res.status(409).send('E-mail ou CPF já cadastrado no sistema.');
        }
        // SEGURANÇA (RNF002 e R04)

        // Cryptografando a senha (bcrypt) 
        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(senha, salt);

        //  Salvando no banco

        const queryInsert = `
        INSERT INTO usuarios (nome, email, cpf, idade, senha, tipo)
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

        res.status(201).send('Usuario cadastarado com sucesso! Redirecionando Para Login')

    }catch (erro){
        console.error('Erro interno no cadastro!', erro);
        res.status(500).send('Erro Interno no Servidor');
    }
};
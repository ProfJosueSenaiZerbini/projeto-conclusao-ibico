import pool from '../config/database.js';

// 1. Função para renderizar/abrir a tela (GET)
export const exibirFormularioPublicar = (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    
    return res.render('publicarBico', { 
        usuario: req.session.usuario 
    });
};

export const cadastrarBico = async (req, res) => {
    // 1. Pega os dados enviados pelo formulário (req.body)
    const { titulo, descricao, valor, bairro, data_servico, horario } = req.body;
    
    // 2. Pega o ID do contratante logado na sessão
    const contratante_id = req.session.usuario ? req.session.usuario.id : null;

    if (!contratante_id) {
        return res.redirect('/login');
    }

    try {
        // 3. Insere a nova vaga/bico na tabela 'bicos' do MySQL
        const query = `
            INSERT INTO bicos (contratante_id, titulo, descricao, valor, bairro, data_servico, horario, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Aberto')
        `;

        await pool.query(query, [
            contratante_id,
            titulo,
            descricao,
            valor,
            bairro,
            data_servico,
            horario
        ]);

        console.log(`✅ Novo bico publicado com sucesso por contratante ID ${contratante_id}!`);

        // 4. Redireciona de volta para a Home do Contratante para ver o bico criado
        return res.redirect('/homeContratante');

    } catch (erro) {
        console.error('❌ Erro ao cadastrar bico no banco:', erro);
        return res.status(500).send('Erro ao publicar o bico. Tente novamente.');
    }
};

// Exibir detalhes de um bico por ID
export const exibirDetalhesBico = async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            SELECT b.*, u.nome AS contratante_nome 
            FROM bicos b
            JOIN usuarios u ON b.contratante_id = u.id
            WHERE b.id = ?
        `;
        
        // Executa a busca no banco
        const resultado = await pool.query(query, [id]);

        // Trata o resultado independente da biblioteca (mysql2 ou mariadb)
        const bicos = Array.isArray(resultado[0]) ? resultado[0] : resultado;
        const bicoEncontrado = bicos[0];

        // Se não encontrou nenhum bico com esse ID no banco
        if (!bicoEncontrado) {
            console.log(`⚠️ Nenhum bico encontrado com o ID: ${id}`);
            return res.status(404).send('Bico não encontrado');
        }

        // ✅ Garante que está passando o objeto 'bico' com nome idêntico ao do EJS
        return res.render('detalhesBico', { 
            bico: bicoEncontrado,
            usuario: req.session.usuario || {} 
        });

    } catch (erro) {
        console.error('❌ Erro ao buscar detalhes do bico:', erro);
        return res.status(500).send('Erro interno do servidor ao carregar o bico.');
    }
};
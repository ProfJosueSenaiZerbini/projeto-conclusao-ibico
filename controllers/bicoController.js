import pool from '../config/database.js';

export const exibirFormularioPublicar = (req, res) => {
    if (!req.session?.usuario) {
        return res.redirect('/login');
    }

    return res.render('publicarBico', {
        usuario: req.session.usuario
    });
};

export const cadastrarBico = async (req, res) => {
    const { titulo, descricao, valor, bairro, data_servico, horario } = req.body;
    const contratante_id = req.session?.usuario?.id;

    if (!contratante_id) {
        return res.redirect('/login');
    }

    try {
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
        return res.redirect('/homeContratante');
    } catch (erro) {
        console.error('❌ Erro ao cadastrar bico no banco:', erro);
        return res.status(500).send('Erro ao publicar o bico. Tente novamente.');
    }
};

export const exibirDetalhesBico = async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            SELECT b.*, u.nome AS contratante_nome
            FROM bicos b
            JOIN usuarios u ON b.contratante_id = u.id
            WHERE b.id = ?
        `;

        const resultado = await pool.query(query, [id]);
        const bicos = Array.isArray(resultado?.[0]) ? resultado[0] : resultado;
        const bicoEncontrado = bicos[0];

        if (!bicoEncontrado) {
            console.log(`⚠️ Nenhum bico encontrado com o ID: ${id}`);
            return res.status(404).send('Bico não encontrado');
        }

        return res.render('detalhesBico', {
            bico: bicoEncontrado,
            usuario: req.session?.usuario || {}
        });
    } catch (erro) {
        console.error('❌ Erro ao buscar detalhes do bico:', erro);
        return res.status(500).send('Erro interno do servidor ao carregar o bico.');
    }
};


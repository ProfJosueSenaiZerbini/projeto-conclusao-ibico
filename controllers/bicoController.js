import db from '../config/database.js';

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

        await db.query(query, [
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
    const usuarioLogado = req.session?.usuario;

    if (!usuarioLogado) {
        return res.redirect('/login');
    }

    try {
        // 1. Busca os detalhes do bico
        const queryBico = `
            SELECT b.*, u.nome AS contratante_nome,
                   DATE_FORMAT(b.data_servico, '%d/%m/%Y') AS data_servico_formatada
            FROM bicos b
            JOIN usuarios u ON b.contratante_id = u.id
            WHERE b.id = ?
        `;

        const resBico = await db.query(queryBico, [id]);
        const bicos = Array.isArray(resBico?.[0]) ? resBico[0] : resBico;
        const bicoEncontrado = Array.isArray(bicos) ? bicos[0] : bicos;

        if (!bicoEncontrado) {
            return res.status(404).send('Bico não encontrado');
        }

        // 2. Checa se o usuário é trabalhador e se já se candidatou a este bico
        let minhaCandidatura = null;
        const trabalhador_id = usuarioLogado.id || usuarioLogado.id_usuario;

        if (trabalhador_id) {
            const queryCandidatura = `
                SELECT status, DATE_FORMAT(criado_em, '%d/%m/%Y') AS data_candidatura 
                FROM candidaturas 
                WHERE bico_id = ? AND trabalhador_id = ?
            `;
            const resCand = await db.query(queryCandidatura, [id, trabalhador_id]);
            const candidaturas = Array.isArray(resCand?.[0]) ? resCand[0] : resCand;
            minhaCandidatura = Array.isArray(candidaturas) ? candidaturas[0] : candidaturas;
        }

        return res.render('detalhesBico', {
            bico: bicoEncontrado,
            minhaCandidatura: minhaCandidatura || null,
            usuario: usuarioLogado
        });
    } catch (erro) {
        console.error('❌ Erro ao buscar detalhes do bico:', erro);
        return res.status(500).send('Erro interno do servidor ao carregar o bico.');
    }
};

export const exibirBicosAtivosContratante = async (req, res) => {
    if (!req.session?.usuario) {
        return res.redirect('/login');
    }

    try {
        const usuarioId = req.session.usuario.id;

        const bicosAtivos = await db.query(
            `SELECT 
                b.id,
                b.titulo,
                b.descricao,
                b.valor,
                DATE_FORMAT(b.data_servico, '%d/%m/%Y') AS data_servico_formatada,
                b.horario,
                b.bairro,
                b.status,
                u.nome AS nome_trabalhador
             FROM bicos b
             LEFT JOIN usuarios u ON b.trabalhador_id = u.id
             WHERE b.contratante_id = ? 
               AND b.status IN ('Aberto', 'Em andamento')
             ORDER BY b.data_servico ASC`,
            [usuarioId]
        );

        res.render('bicosAtivos', { bicos: bicosAtivos });
    } catch (error) {
        console.error('🚫 Erro ao buscar bicos ativos:', error);
        res.status(500).send('Erro ao carregar os bicos ativos.');
    }
};

// =========================================================================
// NOVAS FUNÇÕES PARA CANDIDATURAS E STATUS
// =========================================================================

// 1. Trabalhador se candidata a um bico (RF008)
export const candidatarAoBico = async (req, res) => {
    const { bico_id, mensagem } = req.body;

    // Trata a leitura do ID do trabalhador a partir da sessão
    const trabalhador_id = req.session?.usuario?.id || req.session?.usuario?.id_usuario;

    if (!trabalhador_id) {
        return res.redirect('/login');
    }

    const bicoIdNum = Number(bico_id);
    const trabalhadorIdNum = Number(trabalhador_id);

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Sem colchetes na desestruturação
        const resBicos = await connection.query(
            'SELECT * FROM bicos WHERE id = ? AND status = "Aberto"',
            [bicoIdNum]
        );

        // Trata a resposta vinda do banco
        const bicos = Array.isArray(resBicos[0]) ? resBicos[0] : resBicos;

        if (!bicos || bicos.length === 0) {
            await connection.rollback();
            return res.status(400).send('Este bico não está disponível para candidaturas.');
        }

        // 2. Insere a candidatura (sem colchetes em result)
        const resInsert = await connection.query(
            'INSERT INTO candidaturas (bico_id, trabalhador_id, mensagem, status) VALUES (?, ?, ?, "Pendente")',
            [bicoIdNum, trabalhadorIdNum, mensagem || null]
        );

        const result = Array.isArray(resInsert[0]) ? resInsert[0] : resInsert;
        const candidaturaId = result.insertId;

        // 3. Insere o histórico de candidatura
        await connection.query(
            `INSERT INTO historico_candidaturas (candidatura_id, status_anterior, status_novo, alterado_por, observacao)
             VALUES (?, NULL, 'Pendente', ?, 'Trabalhador candidatou-se à vaga')`,
            [candidaturaId, trabalhadorIdNum]
        );

        await connection.commit();
        return res.redirect('/hometrabalhador');

    } catch (erro) {
        await connection.rollback();
        console.error('❌ DETALHE DO ERRO AO CANDIDATAR:', erro);

        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(400).send('Você já se candidatou a este bico!');
        }

        return res.status(500).send('Erro interno ao processar candidatura.');
    } finally {
        connection.release();
    }
};

// 2. Contratante lista candidatos de um bico específico (RF005)
export const listarCandidatosBico = async (req, res) => {
    const { bico_id } = req.params;
    const contratante_id = req.session?.usuario?.id;

    if (!contratante_id) {
        return res.redirect('/login');
    }

    try {
        const query = `
            SELECT 
                c.id AS candidatura_id,
                c.status AS status_candidatura,
                c.mensagem,
                c.criado_em AS data_candidatura,
                u.id AS trabalhador_id,
                u.nome AS nome_trabalhador,
                u.email AS email_trabalhador,
                u.idade AS idade_trabalhador
            FROM candidaturas c
            JOIN usuarios u ON c.trabalhador_id = u.id
            JOIN bicos b ON c.bico_id = b.id
            WHERE c.bico_id = ? AND b.contratante_id = ?
            ORDER BY c.criado_em DESC
        `;

        const [candidatos] = await db.query(query, [bico_id, contratante_id]);
        return res.render('candidatosBico', { candidatos, bico_id });
    } catch (erro) {
        console.error('❌ Erro ao listar candidatos:', erro);
        return res.status(500).send('Erro ao buscar candidatos.');
    }
};

// 3. Contratante escolhe ou recusa um candidato (RF005 / US13)
export const atualizarStatusCandidatura = async (req, res) => {
    const { candidatura_id, novo_status, observacao } = req.body; // novo_status: 'Aceito' ou 'Recusado'
    const usuario_id = req.session?.usuario?.id || req.session?.usuario?.id_usuario;

    if (!usuario_id) {
        return res.redirect('/login');
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const candidaturaIdNum = Number(candidatura_id);
        const usuarioIdNum = Number(usuario_id);

        // 1. Busca dados da candidatura e do bico
        const resCand = await connection.query(
            `SELECT c.*, b.contratante_id 
             FROM candidaturas c 
             JOIN bicos b ON c.bico_id = b.id 
             WHERE c.id = ?`,
            [candidaturaIdNum]
        );

        const candidaturas = Array.isArray(resCand[0]) ? resCand[0] : resCand;
        const cand = Array.isArray(candidaturas) ? candidaturas[0] : candidaturas;

        if (!cand) {
            await connection.rollback();
            return res.status(404).send('Candidatura não encontrada.');
        }

        const statusAnterior = cand.status;
        const bicoId = cand.bico_id;
        const trabalhadorId = cand.trabalhador_id;

        // 2. Atualiza status da candidatura selecionada
        await connection.query(
            'UPDATE candidaturas SET status = ? WHERE id = ?',
            [novo_status, candidaturaIdNum]
        );

        // 3. Grava no histórico
        await connection.query(
            `INSERT INTO historico_candidaturas (candidatura_id, status_anterior, status_novo, alterado_por, observacao)
             VALUES (?, ?, ?, ?, ?)`,
            [candidaturaIdNum, statusAnterior, novo_status, usuarioIdNum, observacao || null]
        );

        // 4. Se a candidatura for ACEITA: atribui o trabalhador ao bico, muda o bico para 'Em andamento' e recusa as outras
        if (novo_status === 'Aceito') {
            await connection.query(
                'UPDATE bicos SET trabalhador_id = ?, status = "Em andamento" WHERE id = ?',
                [trabalhadorId, bicoId]
            );

            await connection.query(
                'UPDATE candidaturas SET status = "Recusado" WHERE bico_id = ? AND id != ? AND status = "Pendente"',
                [bicoId, candidaturaIdNum]
            );
        }

        await connection.commit();
        // Redireciona de volta para a tela de gerenciamento do bico
        return res.redirect(`/bicos/${bicoId}/gerenciar`);

    } catch (erro) {
        await connection.rollback();
        console.error('❌ ERRO AO ATUALIZAR STATUS DA CANDIDATURA:', erro);
        return res.status(500).send('Erro interno ao atualizar candidatura.');
    } finally {
        connection.release();
    }
};

// 4. Exibir o histórico de auditoria/mudanças de uma candidatura
export const exibirHistoricoCandidatura = async (req, res) => {
    const { candidatura_id } = req.params;

    try {
        const query = `
            SELECT 
                h.status_anterior,
                h.status_novo,
                u.nome AS alterado_por_nome,
                h.observacao,
                DATE_FORMAT(h.data_alteracao, '%d/%m/%Y %H:%i') AS data_alteracao_formatada
            FROM historico_candidaturas h
            JOIN usuarios u ON h.alterado_por = u.id
            WHERE h.candidatura_id = ?
            ORDER BY h.data_alteracao ASC
        `;

        const [historico] = await db.query(query, [candidatura_id]);
        return res.json(historico);
    } catch (erro) {
        console.error('❌ Erro ao buscar histórico da candidatura:', erro);
        return res.status(500).send('Erro ao carregar o histórico.');
    }
};

// Exibe a tela de gerenciamento do bico para o Contratante
export const exibirGerenciamentoBico = async (req, res) => {
    const { id } = req.params;

    // Garante a leitura correta do ID da sessão (ajuste se seu objeto usar id_usuario)
    const contratante_id = req.session?.usuario?.id || req.session?.usuario?.id_usuario;

    if (!contratante_id) {
        return res.redirect('/login');
    }

    try {
        // 1. Converte ambos para inteiros para evitar falhas de comparação no SQL
        const bicoIdNum = Number(id);
        const contratanteIdNum = Number(contratante_id);

        const queryBico = `
            SELECT b.*, DATE_FORMAT(b.data_servico, '%d/%m/%Y') AS data_servico_formatada
            FROM bicos b
            WHERE b.id = ? AND b.contratante_id = ?
        `;

        const resultado = await db.query(queryBico, [bicoIdNum, contratanteIdNum]);

        // Trata o retorno caso venha aninhado pelo driver do MySQL
        const bicos = Array.isArray(resultado?.[0]) ? resultado[0] : resultado;
        const bicoEncontrado = Array.isArray(bicos) ? bicos[0] : bicos;

        if (!bicoEncontrado) {
            console.log(`⚠️ Bico ID ${bicoIdNum} não encontrado para o Contratante ID ${contratanteIdNum}`);
            return res.status(404).send('Bico não encontrado ou você não tem permissão para acessá-lo.');
        }

        // 2. Busca a lista de candidatos
        const queryCandidatos = `
            SELECT 
                c.id AS candidatura_id,
                c.status AS status_candidatura,
                c.mensagem,
                DATE_FORMAT(c.criado_em, '%d/%m/%Y %H:%i') AS data_candidatura_formatada,
                u.id AS trabalhador_id,
                u.nome AS nome_trabalhador,
                u.email AS email_trabalhador,
                u.idade AS idade_trabalhador
            FROM candidaturas c
            JOIN usuarios u ON c.trabalhador_id = u.id
            WHERE c.bico_id = ?
            ORDER BY c.criado_em DESC
        `;

        const resCandidatos = await db.query(queryCandidatos, [bicoIdNum]);
        const candidatos = Array.isArray(resCandidatos?.[0]) ? resCandidatos[0] : resCandidatos;

        return res.render('gerenciarBico', {
            bico: bicoEncontrado,
            candidatos: Array.isArray(candidatos) ? candidatos : [],
            usuario: req.session.usuario
        });
    } catch (erro) {
        console.error('❌ Erro ao carregar gerenciamento do bico:', erro);
        return res.status(500).send('Erro interno do servidor.');
    }
};


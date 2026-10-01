import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mariadb from 'mariadb';
import db from '../config/database.js';
import { criarAtualizadorStatusCandidatura } from '../controllers/bicoController.js';

after(async () => db.end());

const executarIntegracao = process.env.IBICO_RUN_DB_TESTS === '1';

const criarResposta = () => ({
    statusCode: null,
    mensagem: null,
    redirecionadoPara: null,
    status(codigo) { this.statusCode = codigo; return this; },
    send(mensagem) { this.mensagem = mensagem; return this; },
    redirect(url) { this.redirecionadoPara = url; return this; }
});

test('MariaDB: duas aceitações simultâneas no mesmo bico são serializadas', {
    skip: !executarIntegracao && 'Defina IBICO_RUN_DB_TESTS=1 e credenciais exclusivas IBICO_TEST_DB_* para habilitar.'
}, async () => {
    const database = process.env.IBICO_TEST_DB_NAME;
    assert.ok(database && database.endsWith('_test'), 'A base deve ter nome terminado em _test. Nenhuma consulta de escrita foi feita.');

    const pool = mariadb.createPool({
        host: process.env.IBICO_TEST_DB_HOST,
        user: process.env.IBICO_TEST_DB_USER,
        password: process.env.IBICO_TEST_DB_PASSWORD,
        port: process.env.IBICO_TEST_DB_PORT || 3306,
        database,
        connectionLimit: 5
    });

    let contratanteId;
    let trabalhadorAId;
    let trabalhadorBId;
    let bicoId;

    try {
        const [bancoAtual] = await pool.query('SELECT DATABASE() AS nome');
        assert.equal(bancoAtual?.nome, database, 'A conexão não selecionou exatamente a base de testes configurada.');

        const engines = await pool.query(
            `SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME IN ('usuarios', 'bicos', 'candidaturas', 'historico_candidaturas')`
        );
        assert.equal(engines.length, 4, 'A base de testes precisa ter o schema do iBico carregado.');
        assert.ok(engines.every((table) => table.ENGINE === 'InnoDB'), 'Todas as tabelas do fluxo precisam usar InnoDB.');

        const sufixo = randomUUID().replaceAll('-', '');
        const criarUsuario = async (perfil, numero) => {
            const resultado = await pool.query(
                `INSERT INTO usuarios (nome, email, cpf, idade, senha, tipo_perfil)
                 VALUES (?, ?, ?, 18, 'hash-de-teste', ?)`,
                [`Teste ${numero}`, `ibico-${sufixo}-${numero}@example.test`, `${sufixo.slice(0, 10)}${numero === 'contratante' ? '1' : numero === 'trabalhador-a' ? '2' : '3'}`, perfil]
            );
            return resultado.insertId;
        };

        contratanteId = await criarUsuario('contratante', 'contratante');
        trabalhadorAId = await criarUsuario('trabalhador', 'trabalhador-a');
        trabalhadorBId = await criarUsuario('trabalhador', 'trabalhador-b');

        const resultadoBico = await pool.query(
            `INSERT INTO bicos (contratante_id, titulo, descricao, valor, data_servico, horario, bairro, status)
             VALUES (?, 'Bico de teste', 'Fixture de teste', 100, CURRENT_DATE, '09:00', 'Teste', 'Aberto')`,
            [contratanteId]
        );
        bicoId = resultadoBico.insertId;

        const resultadoA = await pool.query(
            "INSERT INTO candidaturas (bico_id, trabalhador_id, status) VALUES (?, ?, 'Pendente')",
            [bicoId, trabalhadorAId]
        );
        const resultadoB = await pool.query(
            "INSERT INTO candidaturas (bico_id, trabalhador_id, status) VALUES (?, ?, 'Pendente')",
            [bicoId, trabalhadorBId]
        );

        const atualizar = criarAtualizadorStatusCandidatura(pool);
        const executarDecisao = (candidaturaId) => {
            const resposta = criarResposta();
            return atualizar({
                body: { candidatura_id: candidaturaId, novo_status: 'Aceito' },
                session: { usuario: { id: contratanteId, tipo_perfil: 'contratante' } }
            }, resposta).then(() => resposta);
        };

        const respostas = await Promise.all([
            executarDecisao(resultadoA.insertId),
            executarDecisao(resultadoB.insertId)
        ]);
        const codigos = respostas.map((resposta) => resposta.statusCode ?? 302).sort((a, b) => a - b);
        assert.deepEqual(codigos, [302, 400]);

        const [bico] = await pool.query('SELECT status, trabalhador_id FROM bicos WHERE id = ?', [bicoId]);
        assert.equal(bico.status, 'Em andamento');

        const candidaturas = await pool.query('SELECT id, status FROM candidaturas WHERE bico_id = ? ORDER BY id', [bicoId]);
        assert.equal(candidaturas.filter((item) => item.status === 'Aceito').length, 1);
        assert.equal(candidaturas.filter((item) => item.status === 'Recusado').length, 1);

        const historico = await pool.query(
            'SELECT candidatura_id, status_anterior, status_novo FROM historico_candidaturas WHERE candidatura_id IN (?, ?)',
            [resultadoA.insertId, resultadoB.insertId]
        );
        assert.equal(historico.length, 2);
        assert.ok(historico.every((item) => item.status_anterior === 'Pendente'));
    } finally {
        if (bicoId) await pool.query('DELETE FROM bicos WHERE id = ?', [bicoId]);
        if (contratanteId) await pool.query('DELETE FROM usuarios WHERE id = ?', [contratanteId]);
        if (trabalhadorAId) await pool.query('DELETE FROM usuarios WHERE id = ?', [trabalhadorAId]);
        if (trabalhadorBId) await pool.query('DELETE FROM usuarios WHERE id = ?', [trabalhadorBId]);
        await pool.end();
    }
});

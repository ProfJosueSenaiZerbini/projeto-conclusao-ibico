import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import db from '../config/database.js';
import { criarAtualizadorStatusCandidatura } from '../controllers/bicoController.js';

after(async () => db.end());

const criarResposta = () => ({
    statusCode: null,
    mensagem: null,
    redirecionadoPara: null,
    status(codigo) { this.statusCode = codigo; return this; },
    send(mensagem) { this.mensagem = mensagem; return this; },
    redirect(url) { this.redirecionadoPara = url; return this; }
});

const clonar = (valor) => JSON.parse(JSON.stringify(valor));

const criarBancoFalso = (opcoes = {}) => {
    const estado = {
        bico: { id: 10, contratante_id: 1, status: opcoes.statusBico || 'Aberto', trabalhador_id: null },
        candidaturas: opcoes.candidaturas || [
            { id: 20, bico_id: 10, trabalhador_id: 2, status: 'Pendente' },
            { id: 21, bico_id: 10, trabalhador_id: 3, status: 'Pendente' }
        ],
        historico: []
    };
    const chamadas = [];
    let snapshot;
    let liberada = false;
    let conexoesAdquiridas = 0;

    const connection = {
        async beginTransaction() { chamadas.push('BEGIN'); snapshot = clonar(estado); },
        async query(sql, parametros = []) {
            const query = sql.replace(/\s+/g, ' ').trim();
            chamadas.push({ sql: query, parametros });
            if (opcoes.falharEm && query.includes(opcoes.falharEm)) throw new Error('Falha injetada no teste unitário.');

            if (query.startsWith('SELECT bico_id FROM candidaturas')) {
                const row = estado.candidaturas.find((item) => item.id === parametros[0]);
                return row ? [{ bico_id: row.bico_id }] : [];
            }
            if (query.startsWith('SELECT id, contratante_id, status FROM bicos')) {
                return estado.bico.id === parametros[0] ? [{ ...estado.bico }] : [];
            }
            if (query.startsWith('SELECT * FROM candidaturas')) {
                const row = estado.candidaturas.find((item) => item.id === parametros[0] && item.bico_id === parametros[1]);
                return row ? [{ ...row }] : [];
            }
            if (query.startsWith('SELECT id FROM candidaturas')) {
                return estado.candidaturas
                    .filter((item) => item.bico_id === parametros[0] && item.id !== parametros[1] && item.status === 'Pendente')
                    .sort((a, b) => a.id - b.id)
                    .map(({ id }) => ({ id }));
            }
            if (query.startsWith('UPDATE candidaturas SET status = ?')) {
                const row = estado.candidaturas.find((item) => item.id === parametros[1]);
                if (row?.status === 'Pendente') row.status = parametros[0];
                return { affectedRows: row ? 1 : 0 };
            }
            if (query.startsWith('UPDATE candidaturas SET status = \'Recusado\'')) {
                const row = estado.candidaturas.find((item) => item.id === parametros[0]);
                if (row?.status === 'Pendente') row.status = 'Recusado';
                return { affectedRows: row ? 1 : 0 };
            }
            if (query.startsWith('UPDATE bicos SET trabalhador_id')) {
                estado.bico.trabalhador_id = parametros[0];
                estado.bico.status = 'Em andamento';
                return { affectedRows: 1 };
            }
            if (query.startsWith('INSERT INTO historico_candidaturas')) {
                const automatico = query.includes("VALUES (?, 'Pendente', 'Recusado', ?, ?)");
                estado.historico.push(automatico ? {
                    candidatura_id: parametros[0], status_anterior: 'Pendente', status_novo: 'Recusado',
                    alterado_por: parametros[1], observacao: parametros[2]
                } : {
                    candidatura_id: parametros[0], status_anterior: parametros[1], status_novo: parametros[2],
                    alterado_por: parametros[3], observacao: parametros[4]
                });
                return { affectedRows: 1 };
            }
            throw new Error(`Consulta não prevista no fake: ${query}`);
        },
        async commit() { chamadas.push('COMMIT'); snapshot = null; },
        async rollback() {
            chamadas.push('ROLLBACK');
            if (snapshot) {
                estado.bico = snapshot.bico;
                estado.candidaturas = snapshot.candidaturas;
                estado.historico = snapshot.historico;
                snapshot = null;
            }
        },
        release() { liberada = true; }
    };

    return {
        estado, chamadas, connection,
        get liberada() { return liberada; },
        get conexoesAdquiridas() { return conexoesAdquiridas; },
        db: {
            async getConnection() {
                conexoesAdquiridas += 1;
                if (opcoes.falharAoConectar) throw new Error('Falha de conexão injetada.');
                return connection;
            }
        }
    };
};

const criarReq = (body = {}, usuario = { id: 1, tipo_perfil: 'contratante' }) => ({
    body,
    session: usuario ? { usuario } : {}
});

test('rejeita IDs inválidos antes de adquirir conexão', async (t) => {
    for (const id of ['', 'abc', '1.5', '-1', 0, null]) {
        await t.test(`ID ${JSON.stringify(id)}`, async () => {
            const banco = criarBancoFalso();
            const resposta = criarResposta();
            await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: id, novo_status: 'Aceito' }), resposta);
            assert.equal(resposta.statusCode, 400);
            assert.equal(banco.conexoesAdquiridas, 0);
        });
    }
});

test('redireciona anônimo sem adquirir conexão', async () => {
    const banco = criarBancoFalso();
    const resposta = criarResposta();
    await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: 20, novo_status: 'Aceito' }, null), resposta);
    assert.equal(resposta.redirecionadoPara, '/login');
    assert.equal(banco.conexoesAdquiridas, 0);
});

test('bloqueia contratante que não é dono do bico', async () => {
    const banco = criarBancoFalso();
    const resposta = criarResposta();
    await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: 20, novo_status: 'Aceito' }, { id: 99 }), resposta);
    assert.equal(resposta.statusCode, 403);
    assert.deepEqual(banco.estado.candidaturas.map(({ status }) => status), ['Pendente', 'Pendente']);
    assert.ok(banco.chamadas.includes('ROLLBACK'));
});

test('retorna 404 para candidatura inexistente', async () => {
    const banco = criarBancoFalso();
    const resposta = criarResposta();
    await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: 999, novo_status: 'Aceito' }), resposta);
    assert.equal(resposta.statusCode, 404);
    assert.ok(banco.chamadas.includes('ROLLBACK'));
    assert.equal(banco.liberada, true);
});

test('rejeita status inválido, candidatura processada e bico fechado', async (t) => {
    const casos = [
        { nome: 'status inválido', opcoes: {}, body: { candidatura_id: 20, novo_status: 'Cancelado' } },
        { nome: 'candidatura processada', opcoes: { candidaturas: [{ id: 20, bico_id: 10, trabalhador_id: 2, status: 'Aceito' }] }, body: { candidatura_id: 20, novo_status: 'Recusado' } },
        { nome: 'bico fechado', opcoes: { statusBico: 'Em andamento' }, body: { candidatura_id: 20, novo_status: 'Recusado' } }
    ];
    for (const caso of casos) {
        await t.test(caso.nome, async () => {
            const banco = criarBancoFalso(caso.opcoes);
            const resposta = criarResposta();
            await criarAtualizadorStatusCandidatura(banco.db)(criarReq(caso.body), resposta);
            assert.equal(resposta.statusCode, 400);
            if (caso.nome === 'status inválido') {
                assert.equal(banco.conexoesAdquiridas, 0);
            } else {
                assert.ok(banco.chamadas.includes('ROLLBACK'));
            }
        });
    }
});

test('rejeita observação acima de 255 caracteres antes da conexão', async () => {
    const banco = criarBancoFalso();
    const resposta = criarResposta();
    await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: 20, novo_status: 'Aceito', observacao: 'x'.repeat(256) }), resposta);
    assert.equal(resposta.statusCode, 400);
    assert.equal(banco.conexoesAdquiridas, 0);
});

test('aceita observação com exatamente 255 caracteres', async () => {
    const banco = criarBancoFalso();
    const resposta = criarResposta();
    const observacao = 'x'.repeat(255);
    await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: 20, novo_status: 'Recusado', observacao }), resposta);
    assert.equal(resposta.redirecionadoPara, '/bicos/10/gerenciar');
    assert.equal(banco.estado.historico[0].observacao.length, 255);
});

test('aceita candidatura e registra histórico de cada recusa automática', async () => {
    const banco = criarBancoFalso();
    const resposta = criarResposta();
    await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: '20', novo_status: 'Aceito', observacao: 'Boa experiência' }), resposta);
    assert.equal(resposta.redirecionadoPara, '/bicos/10/gerenciar');
    assert.equal(banco.estado.bico.status, 'Em andamento');
    assert.equal(banco.estado.bico.trabalhador_id, 2);
    assert.deepEqual(banco.estado.candidaturas.map(({ status }) => status), ['Aceito', 'Recusado']);
    assert.deepEqual(banco.estado.historico, [
        { candidatura_id: 20, status_anterior: 'Pendente', status_novo: 'Aceito', alterado_por: 1, observacao: 'Boa experiência' },
        { candidatura_id: 21, status_anterior: 'Pendente', status_novo: 'Recusado', alterado_por: 1, observacao: 'Recusada automaticamente após a aceitação de outra candidatura.' }
    ]);
    assert.ok(banco.chamadas.includes('COMMIT'));
    assert.equal(banco.liberada, true);
});

test('recusa candidatura pendente com histórico e sem alterar o bico', async () => {
    const banco = criarBancoFalso();
    const resposta = criarResposta();
    await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: 20, novo_status: 'Recusado' }), resposta);
    assert.equal(banco.estado.candidaturas[0].status, 'Recusado');
    assert.equal(banco.estado.bico.status, 'Aberto');
    assert.equal(banco.estado.historico[0].status_anterior, 'Pendente');
    assert.equal(banco.estado.historico[0].status_novo, 'Recusado');
    assert.ok(banco.chamadas.includes('COMMIT'));
});

test('bloqueia bico antes de bloquear candidatura', async () => {
    const banco = criarBancoFalso();
    const resposta = criarResposta();
    await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: 20, novo_status: 'Recusado' }), resposta);
    const consultas = banco.chamadas.filter((item) => typeof item === 'object').map(({ sql }) => sql);
    const indiceBico = consultas.findIndex((sql) => sql.includes('FROM bicos WHERE id = ? FOR UPDATE'));
    const indiceCandidatura = consultas.findIndex((sql) => sql.includes('FROM candidaturas WHERE id = ? AND bico_id = ? FOR UPDATE'));
    assert.ok(indiceBico >= 0 && indiceCandidatura > indiceBico);
});

test('faz rollback em falha intermediária e libera conexão', async () => {
    const banco = criarBancoFalso({ falharEm: 'INSERT INTO historico_candidaturas' });
    const resposta = criarResposta();
    await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: 20, novo_status: 'Aceito' }), resposta);
    assert.equal(resposta.statusCode, 500);
    assert.deepEqual(banco.estado.candidaturas.map(({ status }) => status), ['Pendente', 'Pendente']);
    assert.equal(banco.estado.bico.status, 'Aberto');
    assert.deepEqual(banco.estado.historico, []);
    assert.ok(banco.chamadas.includes('ROLLBACK'));
    assert.equal(banco.liberada, true);
});

test('trata falha de conexão sem rollback e sem vazar exceção', async () => {
    const banco = criarBancoFalso({ falharAoConectar: true });
    const resposta = criarResposta();
    await criarAtualizadorStatusCandidatura(banco.db)(criarReq({ candidatura_id: 20, novo_status: 'Aceito' }), resposta);
    assert.equal(resposta.statusCode, 500);
    assert.equal(banco.chamadas.includes('ROLLBACK'), false);
});

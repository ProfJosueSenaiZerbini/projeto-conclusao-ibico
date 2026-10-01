import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import db from '../config/database.js';
import { criarExibidorHistoricoCandidatura } from '../controllers/bicoController.js';

after(async () => db.end());

const criarResposta = () => ({
    statusCode: null,
    mensagem: null,
    jsonBody: null,
    redirecionadoPara: null,
    status(codigo) { this.statusCode = codigo; return this; },
    send(mensagem) { this.mensagem = mensagem; return this; },
    json(dados) { this.jsonBody = dados; return this; },
    redirect(url) { this.redirecionadoPara = url; return this; }
});

const criarBancoFalso = ({ candidaturaExiste = true, acessoPermitido = true, historico = [] } = {}) => {
    const chamadas = [];
    return {
        chamadas,
        banco: {
            async query(sql, parametros) {
                chamadas.push({ sql: sql.replace(/\s+/g, ' ').trim(), parametros });
                if (sql.includes('SELECT c.id')) {
                    return candidaturaExiste && acessoPermitido ? [{ id: parametros[0] }] : [];
                }
                if (sql.includes('FROM historico_candidaturas h')) return historico;
                throw new Error(`Consulta inesperada: ${sql}`);
            }
        }
    };
};

const criarReq = (perfil, usuarioId, candidaturaId = '42') => ({
    params: { candidatura_id: candidaturaId },
    session: { usuario: { id: usuarioId, tipo_perfil: perfil } }
});

test('redireciona usuário não autenticado e não consulta o banco', async () => {
    const fake = criarBancoFalso();
    const resposta = criarResposta();
    await criarExibidorHistoricoCandidatura(fake.banco)({ params: { candidatura_id: '42' }, session: {} }, resposta);
    assert.equal(resposta.redirecionadoPara, '/login');
    assert.equal(fake.chamadas.length, 0);
});

test('contratante acessa histórico de candidatura de bico próprio', async () => {
    const historico = [{ status_anterior: 'Pendente', status_novo: 'Aceito', alterado_por_nome: 'Ana', observacao: 'Aprovado' }];
    const fake = criarBancoFalso({ historico });
    const resposta = criarResposta();
    await criarExibidorHistoricoCandidatura(fake.banco)(criarReq('Contratante', 7), resposta);
    assert.deepEqual(resposta.jsonBody, historico);
    assert.equal(fake.chamadas.length, 2);
    assert.match(fake.chamadas[0].sql, /b\.contratante_id = \?/);
    assert.deepEqual(fake.chamadas[0].parametros, [42, 'contratante', 7, 'contratante', 7]);
});

test('contratante de outro bico recebe 404 sem consultar o histórico', async () => {
    const fake = criarBancoFalso({ acessoPermitido: false });
    const resposta = criarResposta();
    await criarExibidorHistoricoCandidatura(fake.banco)(criarReq('contratante', 99), resposta);
    assert.equal(resposta.statusCode, 404);
    assert.equal(fake.chamadas.length, 1);
});

test('trabalhador acessa o histórico da própria candidatura', async () => {
    const historico = [{ status_anterior: null, status_novo: 'Pendente', alterado_por_nome: 'Bia', observacao: null }];
    const fake = criarBancoFalso({ historico });
    const resposta = criarResposta();
    await criarExibidorHistoricoCandidatura(fake.banco)(criarReq('Trabalhador', 12), resposta);
    assert.deepEqual(resposta.jsonBody, historico);
    assert.match(fake.chamadas[0].sql, /c\.trabalhador_id = \?/);
    assert.equal(fake.chamadas[1].parametros[0], 42);
});

test('trabalhador não acessa candidatura de outra pessoa', async () => {
    const fake = criarBancoFalso({ acessoPermitido: false });
    const resposta = criarResposta();
    await criarExibidorHistoricoCandidatura(fake.banco)(criarReq('trabalhador', 88), resposta);
    assert.equal(resposta.statusCode, 404);
    assert.equal(fake.chamadas.length, 1);
});

test('retorna 400 para identificadores inválidos sem consultar o banco', async (t) => {
    for (const id of ['', 'abc', '1.2', '0', '-5']) {
        await t.test(JSON.stringify(id), async () => {
            const fake = criarBancoFalso();
            const resposta = criarResposta();
            await criarExibidorHistoricoCandidatura(fake.banco)(criarReq('trabalhador', 12, id), resposta);
            assert.equal(resposta.statusCode, 400);
            assert.equal(fake.chamadas.length, 0);
        });
    }
});

test('retorna 404 para candidatura inexistente', async () => {
    const fake = criarBancoFalso({ candidaturaExiste: false });
    const resposta = criarResposta();
    await criarExibidorHistoricoCandidatura(fake.banco)(criarReq('contratante', 7), resposta);
    assert.equal(resposta.statusCode, 404);
    assert.equal(fake.chamadas.length, 1);
});

test('retorna lista vazia para candidatura autorizada sem eventos de histórico', async () => {
    const fake = criarBancoFalso({ historico: [] });
    const resposta = criarResposta();
    await criarExibidorHistoricoCandidatura(fake.banco)(criarReq('trabalhador', 12), resposta);
    assert.deepEqual(resposta.jsonBody, []);
});

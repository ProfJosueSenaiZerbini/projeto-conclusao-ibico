import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import db from '../config/database.js';
import { criarListadorCandidatosBico } from '../controllers/bicoController.js';

after(async () => db.end());

const criarResposta = () => ({
    statusCode: null,
    mensagem: null,
    view: null,
    dados: null,
    status(codigo) { this.statusCode = codigo; return this; },
    send(mensagem) { this.mensagem = mensagem; return this; },
    render(view, dados) { this.view = view; this.dados = dados; return this; },
    redirect(url) { this.redirecionadoPara = url; return this; }
});

const criarBancoFalso = (linhas = [], erro = null) => {
    const chamadas = [];
    const resultado = [...linhas];
    Object.defineProperty(resultado, 'meta', {
        value: [{ name: 'candidatura_id' }, { name: 'status_candidatura' }],
        enumerable: false
    });

    return {
        chamadas,
        banco: {
            async query(sql, parametros) {
                chamadas.push({ sql, parametros });
                if (erro) throw erro;
                return resultado;
            }
        },
        resultado
    };
};

const candidato = (id, nome) => ({
    candidatura_id: id,
    status_candidatura: 'Pendente',
    mensagem: `Mensagem de ${nome}`,
    data_candidatura_formatada: '01/10/2026 09:30',
    trabalhador_id: id + 100,
    nome_trabalhador: nome,
    email_trabalhador: `${nome.toLowerCase()}@example.test`,
    idade_trabalhador: 25
});

const criarReq = () => ({
    params: { bico_id: '17' },
    session: { usuario: { id: 8, tipo_perfil: 'contratante' } }
});

test('renderiza todos os candidatos retornados pelo MariaDB', async () => {
    const linhas = [candidato(1, 'Ana'), candidato(2, 'Bruno'), candidato(3, 'Caio')];
    const fake = criarBancoFalso(linhas);
    const resposta = criarResposta();

    await criarListadorCandidatosBico(fake.banco)(criarReq(), resposta);

    assert.equal(resposta.view, 'candidatosBico');
    assert.equal(resposta.dados.bico_id, '17');
    assert.equal(resposta.dados.candidatos, fake.resultado);
    assert.equal(resposta.dados.candidatos.length, 3);
    assert.deepEqual(resposta.dados.candidatos.map((item) => item.nome_trabalhador), ['Ana', 'Bruno', 'Caio']);
    assert.deepEqual(fake.chamadas[0].parametros, ['17', 8]);
});

test('renderiza corretamente uma única linha como array de candidatos', async () => {
    const fake = criarBancoFalso([candidato(4, 'Dora')]);
    const resposta = criarResposta();

    await criarListadorCandidatosBico(fake.banco)(criarReq(), resposta);

    assert.equal(resposta.dados.candidatos.length, 1);
    assert.equal(resposta.dados.candidatos[0].nome_trabalhador, 'Dora');
});

test('renderiza lista vazia sem erro quando não há candidatos', async () => {
    const fake = criarBancoFalso([]);
    const resposta = criarResposta();

    await criarListadorCandidatosBico(fake.banco)(criarReq(), resposta);

    assert.equal(resposta.view, 'candidatosBico');
    assert.deepEqual(resposta.dados.candidatos, []);
    assert.equal(resposta.dados.candidatos.length, 0);
});

test('mantém os campos consumidos pela view e alinha o alias da data', async () => {
    const fake = criarBancoFalso([candidato(5, 'Eva')]);
    const resposta = criarResposta();

    await criarListadorCandidatosBico(fake.banco)(criarReq(), resposta);

    const candidatoRenderizado = resposta.dados.candidatos[0];
    for (const campo of [
        'candidatura_id', 'status_candidatura', 'mensagem', 'data_candidatura_formatada',
        'trabalhador_id', 'nome_trabalhador', 'email_trabalhador', 'idade_trabalhador'
    ]) {
        assert.ok(Object.hasOwn(candidatoRenderizado, campo), `Campo esperado na view: ${campo}`);
    }
    assert.match(fake.chamadas[0].sql, /AS data_candidatura_formatada/);
});

test('retorna HTTP 500 quando a consulta falha', async () => {
    const fake = criarBancoFalso([], new Error('Falha controlada no teste.'));
    const resposta = criarResposta();

    await criarListadorCandidatosBico(fake.banco)(criarReq(), resposta);

    assert.equal(resposta.statusCode, 500);
    assert.equal(resposta.mensagem, 'Erro ao buscar candidatos.');
    assert.equal(resposta.view, null);
});

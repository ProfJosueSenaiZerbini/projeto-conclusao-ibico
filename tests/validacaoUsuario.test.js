import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import db from '../config/database.js';
import { criarCadastradorUsuario } from '../controllers/authController.js';
import { criarAtualizadorPerfil, criarAtualizadorSenha } from '../controllers/perfilController.js';
after(async () => db.end());
const res = () => ({ statusCode:null, status(c){this.statusCode=c;return this;}, send(m){this.msg=m;return this;}, redirect(u){this.url=u;return this;} });
const signup = (x={}) => ({nome:' Maria Silva ',email:' MARIA@EXAMPLE.COM ',cpf:'123.456.789-00',senha:'senha123',confirmarSenha:'senha123',tipoPerfil:'Trabalhador',termos:'on',maiorIdade:'true',...x});
const req = body => ({session:{usuario:{id:7,nome:'Old'}},body});

test('cadastro normaliza dados e salva hash', async()=>{const calls=[];const fake={async query(s,p){calls.push([s,p]);return[];}};const hash={async genSalt(){return'salt';},async hash(s){return'hash:'+s;}};const r=res();await criarCadastradorUsuario(fake,hash)({body:signup()},r);assert.equal(r.url,'/login');assert.deepEqual(calls[0][1],['maria@example.com','123.456.789-00']);assert.deepEqual(calls[1][1],['Maria Silva','maria@example.com','123.456.789-00',18,'hash:senha123','trabalhador']);});
for(const [label,fields] of [['nome longo',{nome:'x'.repeat(101)}],['email invalido',{email:'bad'}],['CPF invalido',{cpf:'123'}],['senha curta',{senha:'12345',confirmarSenha:'12345'}],['senha longa',{senha:'x'.repeat(73),confirmarSenha:'x'.repeat(73)}],['perfil invalido',{tipoPerfil:'admin'}],['sem termos',{termos:null}],['sem idade',{maiorIdade:null}]]) test('cadastro rejeita '+label+' antes do banco',async()=>{let n=0;const r=res();await criarCadastradorUsuario({async query(){n++;return[];}},{})({body:signup(fields)},r);assert.equal(r.statusCode,400);assert.equal(n,0);});
test('cadastro informa duplicidade',async()=>{const r=res();await criarCadastradorUsuario({async query(){return[{id:1}];}})({body:signup()},r);assert.equal(r.statusCode,409);});

test('perfil atualiza dados usando id da sessao e ignora campos protegidos',async()=>{const calls=[];const r=res(), request=req({id:99,tipo_perfil:'admin',cpf:'x',nome:' Ana ',email:' ANA@EXAMPLE.COM ',idade:'29'});await criarAtualizadorPerfil({async query(s,p){calls.push([s,p]);return[];}})(request,r);assert.equal(r.url,'/perfil');assert.deepEqual(calls[1][1],['Ana','ana@example.com',29,7]);assert.match(calls[1][0],/SET nome = \?, email = \?, idade = \?/);assert.equal(request.session.usuario.nome,'Ana');});
for(const [label,b] of [['nome longo',{nome:'x'.repeat(101),email:'a@b.com',idade:'20'}],['email invalido',{nome:'Ana',email:'x',idade:'20'}],['idade baixa',{nome:'Ana',email:'a@b.com',idade:'17'}],['idade fracionaria',{nome:'Ana',email:'a@b.com',idade:'18.5'}]]) test('perfil rejeita '+label+' sem query',async()=>{let n=0;const r=res();await criarAtualizadorPerfil({async query(){n++;return[];}})(req(b),r);assert.equal(r.statusCode,400);assert.equal(n,0);});
test('perfil rejeita email duplicado',async()=>{const r=res();await criarAtualizadorPerfil({async query(){return[{id:8}];}})(req({nome:'Ana',email:'other@example.com',idade:'30'}),r);assert.equal(r.statusCode,409);});
test('perfil exige sessao',async()=>{let n=0;const r=res();await criarAtualizadorPerfil({async query(){n++;}})({body:{}},r);assert.equal(r.url,'/login');assert.equal(n,0);});

test('alteracao de senha compara hash e armazena hash novo',async()=>{const calls=[];const fake={async query(s,p){calls.push([s,p]);return s.startsWith('SELECT')?[{senha:'old-hash'}]:[];}};const hash={async compare(s,h){return s==='antiga1'&&h==='old-hash';},async hash(s){return'new:'+s;}};const r=res();await criarAtualizadorSenha(fake,hash)(req({senhaAtual:'antiga1',novaSenha:'nova123',confirmarNovaSenha:'nova123'}),r);assert.equal(r.url,'/perfil');assert.deepEqual(calls[1][1],['new:nova123',7]);});
test('alteracao de senha recusa valores fora da politica sem consultar banco',async()=>{for(const senha of ['12345','x'.repeat(73)]){let n=0;const r=res();await criarAtualizadorSenha({async query(){n++;return[];}},{}) (req({senhaAtual:'old',novaSenha:senha,confirmarNovaSenha:senha}),r);assert.equal(r.statusCode,400);assert.equal(n,0);}});

import { criarAutenticadorUsuario } from '../controllers/authController.js';

test('login autentica usuario e direciona para sua area', async () => {
    const banco = { async query() { return [{ id: 4, nome: 'Ana', email: 'ana@example.com', cpf: '123', senha: 'hash', tipo_perfil: 'trabalhador', saldo_simulado: 0 }]; } };
    const hasher = { async compare(senha, hash) { return senha === 'senha123' && hash === 'hash'; } };
    const request = { body: { email: 'ana@example.com', senha: 'senha123' }, session: {} };
    const response = res();
    await criarAutenticadorUsuario(banco, hasher)(request, response);
    assert.equal(response.url, '/hometrabalhador');
    assert.equal(request.session.usuario.id, 4);
});

test('login rejeita senha incorreta sem criar sessao', async () => {
    const banco = { async query() { return [{ id: 4, senha: 'hash', tipo_perfil: 'contratante' }]; } };
    const response = res();
    const request = { body: { email: 'ana@example.com', senha: 'errada' }, session: {} };
    await criarAutenticadorUsuario(banco, { async compare() { return false; } })(request, response);
    assert.equal(response.statusCode, 401);
    assert.equal(request.session.usuario, undefined);
});

test('falha do banco no perfil retorna mensagem sem detalhes internos', async () => {
    const response = res();
    await criarAtualizadorPerfil({ async query() { throw Object.assign(new Error('senha secreta do banco'), { code: 'DB_TEST_ERROR' }); } })(
        req({ nome: 'Ana', email: 'ana@example.com', idade: '25' }), response
    );
    assert.equal(response.statusCode, 500);
    assert.doesNotMatch(response.msg, /senha secreta|DB_TEST_ERROR/);
});

test('falha de banco no cadastro nao expoe erro interno', async () => {
    const response = res();
    const fake = { async query() { throw Object.assign(new Error('credencial privada'), { code: 'DB_TEST_ERROR' }); } };
    await criarCadastradorUsuario(fake)({ body: signup() }, response);
    assert.equal(response.statusCode, 500);
    assert.doesNotMatch(response.msg, /credencial privada|DB_TEST_ERROR/);
});

test('campos obrigatorios ausentes no cadastro sao rejeitados sem query', async () => {
    for (const field of ['nome', 'email', 'cpf', 'senha', 'confirmarSenha', 'tipoPerfil']) {
        let queries = 0;
        const data = signup({ [field]: '' });
        const response = res();
        await criarCadastradorUsuario({ async query() { queries++; return []; } }, {})({ body: data }, response);
        assert.equal(response.statusCode, 400, field);
        assert.equal(queries, 0, field);
    }
});
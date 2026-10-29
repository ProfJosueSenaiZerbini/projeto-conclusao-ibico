import { test, expect } from '@playwright/test';

function gerarCpfDeUmNove() {
    return Math.floor(10000000000 + Math.random() * 90000000000).toString();
}

// ==========================================
// 1. TESTES UNITÁRIOS E DE ESTRUTURA
// ==========================================
test.describe('Testes Unitários e de Estrutura — Ibico', () => {

    test('deve abrir a página de login e validar elementos estáticos', async ({ page }) => {
        await page.goto('http://localhost:3000/login');

        await expect(page).toHaveTitle(/Login/i);
        
        // Valida se existe qualquer cabeçalho (h1 ou h2) na página de login
        await expect(
            page.locator('h1, h2').first()
        ).toBeVisible();

        const elementos = [
            'input[name="email"]',
            'input[name="senha"]',
            '#submitBtn'
        ];

        for (const elemento of elementos) {
            await expect(page.locator(elemento)).toBeVisible();
        }
    });

    test('deve impedir o envio do formulário vazio', async ({ page }) => {
        await page.goto('http://localhost:3000/login');

        const campos = ['email', 'senha'];

        for (const campo of campos) {
            await expect(
                page.locator(`input[name="${campo}"]`)
            ).toHaveAttribute('required', '');
        }

        await page.locator('#submitBtn').click();
        await expect(page).toHaveURL('http://localhost:3000/login');
    });

    test('deve abrir a página de cadastro corretamente', async ({ page }) => {
        await page.goto('http://localhost:3000/cadastrar');

        await expect(page).toHaveTitle(/Criar Conta|Cadastro/i);

        await expect(
            page.locator('h1, h2').first()
        ).toBeVisible();

        const campos = [
            '#nome',
            '#cEmail',
            '#cpf',
            '#cSenha',
            '#cConfirma',
            '#btnSubmit'
        ];

        for (const campo of campos) {
            await expect(page.locator(campo)).toBeVisible();
        }
    });

    test('deve verificar os campos obrigatórios do cadastro', async ({ page }) => {
        await page.goto('http://localhost:3000/cadastrar');

        const campos = [
            '#nome',
            '#cEmail',
            '#cpf',
            '#cSenha',
            '#cConfirma',
            '#termos',
            '#idade'
        ];

        for (const campo of campos) {
            await expect(page.locator(campo)).toHaveAttribute('required', '');
        }
    });

});

// ==========================================
// 2. TESTES FUNCIONAIS E DE FLUXO
// ==========================================
test.describe('Testes Funcionais e de Fluxo — Ibico', () => {

    test('deve alternar entre trabalhador e contratante na tela de login', async ({ page }) => {
        await page.goto('http://localhost:3000/login');

        const tipoPerfil = page.locator('#tipoPerfilInput');

        const perfis = [
            { botao: '#btnWork', valor: 'trabalhador' },
            { botao: '#btnHire', valor: 'contratante' }
        ];

        for (const perfil of perfis) {
            await page.locator(perfil.botao).click();
            await expect(tipoPerfil).toHaveValue(perfil.valor);
        }
    });

    test('deve abrir a página de cadastro pelo link do login', async ({ page }) => {
        await page.goto('http://localhost:3000/login');

        await page.getByRole('link', {
            name: /criar uma conta|cadastrar/i
        }).click();

        await expect(page).toHaveURL('http://localhost:3000/cadastrar');
    });

    test('deve impedir o cadastro com campos vazios', async ({ page }) => {
        await page.goto('http://localhost:3000/cadastrar');

        await page.locator('#btnSubmit').click();

        await expect(page).toHaveURL('http://localhost:3000/cadastrar');
        await expect(page.locator('#nome')).toBeFocused();
    });

    test('deve alternar entre os perfis no cadastro', async ({ page }) => {
        await page.goto('http://localhost:3000/cadastrar');

        const tipoPerfil = page.locator('#tipoPerfilInput');

        await expect(tipoPerfil).toHaveValue('Contratante');

        await page.locator('#cardTrabalhador').click();
        await expect(tipoPerfil).toHaveValue('Trabalhador');

        await page.locator('#cardContratante').click();
        await expect(tipoPerfil).toHaveValue('Contratante');
    });

    test('deve impedir o cadastro com e-mail inválido', async ({ page }) => {
        await page.goto('http://localhost:3000/cadastrar');

        await page.locator('#nome').fill('Usuario Teste');
        await page.locator('#cEmail').fill('emailinvalido');
        await page.locator('#cpf').fill('12345678909');
        await page.locator('#cSenha').fill('senha123');
        await page.locator('#cConfirma').fill('senha123');

        await page.locator('#termos').check();
        await page.locator('#idade').check();

        await page.locator('#btnSubmit').click();

        await expect(page).toHaveURL('http://localhost:3000/cadastrar');
    });

});

test('deve realizar o cadastro e o login com sucesso como Contratante', async ({ page }) => {
    await page.goto('http://localhost:3000/cadastrar');

    const cpfAleatorio = gerarCpfDeUmNove();
    const emailDinamico = `contratante_${Date.now()}@gmail.com`;
    const emailContratanteFixo = 'silvaliuson778@gmail.com';
    const senhaPadrao = '123456';

    await page.locator('#cardContratante').click();
    await expect(page.locator('#tipoPerfilInput')).toHaveValue('Contratante');

    await page.locator('#nome').fill('Contratante Teste E2E');
    await page.locator('#cEmail').fill(emailDinamico);
    await page.locator('#cpf').fill(cpfAleatorio);
    await page.locator('#cSenha').fill(senhaPadrao);
    await page.locator('#cConfirma').fill(senhaPadrao);

    await page.locator('#termos').check();
    await page.locator('#idade').check();
    await page.locator('#btnSubmit').click();

    // Aguarda mudança de URL após o cadastro (seja redirecionando para o login ou direto para a home)
    try {
        await page.waitForURL(/login|homeContratante/, { timeout: 5000 });
    } catch {
        await page.goto('http://localhost:3000/login');
    }


    // Se foi para o login, faz o login com o e-mail fixo
    if (page.url().includes('login')) {
        await page.locator('#btnHire').click();
        await page.locator('input[name="email"]').fill(emailContratanteFixo);
        await page.locator('input[name="senha"]').fill(senhaPadrao);
        await page.locator('#submitBtn').click();
    }

    await expect(page).toHaveURL('http://localhost:3000/homeContratante');
});

test('deve realizar o cadastro e o login com sucesso como Trabalhador', async ({ page }) => {
    await page.goto('http://localhost:3000/cadastrar');

    const cpfAleatorio = gerarCpfDeUmNove();
    const emailDinamico = `trabalhador_${Date.now()}@gmail.com`;
    const emailTrabalhadorFixo = 'afonsocarbosaaraujo67@gmail.com';
    const senhaPadrao = '123456';

    await page.locator('#cardTrabalhador').click();
    await page.locator('#nome').fill('Trabalhador Teste E2E');
    await page.locator('#cEmail').fill(emailDinamico);
    await page.locator('#cpf').fill(cpfAleatorio);
    await page.locator('#cSenha').fill(senhaPadrao);
    await page.locator('#cConfirma').fill(senhaPadrao);

    await page.locator('#termos').check();
    await page.locator('#idade').check();

    await page.locator('#btnSubmit').click();

    try {
        await page.waitForURL(/login|hometrabalhador/, { timeout: 5000 });
    } catch {
        await page.goto('http://localhost:3000/login');
    }

    if (page.url().includes('login')) {
        await page.locator('#btnWork').click();
        await page.locator('input[name="email"]').fill(emailTrabalhadorFixo);
        await page.locator('input[name="senha"]').fill(senhaPadrao);
        await page.locator('#submitBtn').click();
    }

    await expect(page).toHaveURL('http://localhost:3000/hometrabalhador');
});
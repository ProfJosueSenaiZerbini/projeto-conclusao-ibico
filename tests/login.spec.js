
import { test, expect } from '@playwright/test';

test('deve abrir a página de login', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await expect(page).toHaveTitle('Ibico - Login');

    await expect(
        page.getByRole('heading', { name: 'Bem-vindo de volta' })
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

    campos.forEach(async (campo) => {
        await expect(
            page.locator(`input[name="${campo}"]`)
        ).toHaveAttribute('required', '');
    });

    await page.locator('#submitBtn').click();

    await expect(page).toHaveURL('http://localhost:3000/login');
});

test('deve alternar entre trabalhador e contratante', async ({ page }) => {
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
        name: 'Criar uma conta gratuitamente'
    }).click();

    await expect(page).toHaveURL('http://localhost:3000/cadastrar');
});


test('deve abrir a página de cadastro corretamente', async ({ page }) => {
    await page.goto('http://localhost:3000/cadastrar');

    await expect(page).toHaveTitle('Criar Conta — Ibico');

    await expect(
        page.getByRole('heading', { name: 'Criar Nova Conta' })
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

    await expect(
        page.getByRole('button', { name: 'Finalizar Cadastro' })
    ).toBeVisible();
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

import express from 'express';
import pool from '../config/database.js';
import { cadastrarUsuario, logarUsuario, homeContratante, exibirFormularioPublicar } from '../controllers/authController.js';

const router = express.Router();

// Rota para ABRIR a tela de cadastro
router.get('/cadastrar', (req, res) => {
    res.render('cadastrar');
});

// Rota para exibir a tela de login
router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/hometrabalhador', async (req, res) => {
    // 1. Garante que só entra se estiver logado
    if (!req.session.usuario) return res.redirect('/login');
    
    try {
        // 2. Busca todas as vagas que estão com status 'Aberto'
        const vagasNoBanco = await pool.query("SELECT * FROM bicos WHERE status = 'Aberto'");
        
        // 3. Renderiza a tela passando o usuário logado E a lista de vagas
        res.render('hometrabalhador', { 
            usuario: req.session.usuario, 
            vagas: vagasNoBanco 
        });

    } catch (erro) {
        console.error('Erro ao buscar bicos no banco:', erro);
        res.status(500).send('Erro interno ao carregar as vagas.');
    }
});

router.get('/bicos/novo', exibirFormularioPublicar);
router.get('/homeContratante', homeContratante);
// Rotas POST que processam os formulários
router.post('/cadastrar', cadastrarUsuario);
router.post('/login', logarUsuario);

export default router;
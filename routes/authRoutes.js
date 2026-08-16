import express from 'express';
import pool from '../config/database.js';
import { cadastrarUsuario, logarUsuario, homeContratante } from '../controllers/authController.js';

const router = express.Router();

router.get('/cadastrar', (_req, res) => {
    res.render('cadastrar');
});

router.get('/login', (_req, res) => {
    res.render('login');
});

const renderHomeTrabalhador = async (req, res) => {
    if (!req.session?.usuario) {
        return res.redirect('/login');
    }

    try {
        const vagas = await pool.query("SELECT * FROM bicos WHERE status = 'Aberto'");

        return res.render('homeTrabalhador', {
            usuario: req.session.usuario,
            vagas
        });
    } catch (erro) {
        console.error('Erro ao buscar bicos no banco:', erro);
        return res.status(500).send('Erro interno ao carregar as vagas.');
    }
};

const renderHistoricoTrabalhador = (req, res) => {
    if (!req.session?.usuario) {
        return res.redirect('/login');
    }

    return res.render('historicoTrabalhador', {
        usuario: req.session.usuario
    });
};

router.get('/hometrabalhador', renderHomeTrabalhador);
router.get('/homeTrabalhador', renderHomeTrabalhador);
router.get('/historico', renderHistoricoTrabalhador);
router.get('/historicoTrabalhador', renderHistoricoTrabalhador);

router.get('/homeContratante', homeContratante);
router.post('/cadastrar', cadastrarUsuario);
router.post('/login', logarUsuario);

export default router;
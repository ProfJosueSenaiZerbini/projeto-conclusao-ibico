import express from 'express';
import {
    exibirFormularioPublicar,
    cadastrarBico,
    exibirDetalhesBico
} from '../controllers/bicoController.js';

const router = express.Router();

// Rota para ABRIR a tela de criar bico (GET)
router.get('/novo', exibirFormularioPublicar);
// Rota para ENVIAR os dados e salvar no banco (POST)
router.post('/novo', cadastrarBico);
// Rota dinâmica para ver os detalhes de um bico específico
router.get('/:id', exibirDetalhesBico);

export default router;
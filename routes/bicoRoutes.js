import express from 'express';
import {
    exibirFormularioPublicar,
    cadastrarBico,
    exibirDetalhesBico
} from '../controllers/bicoController.js';

const router = express.Router();

router.get('/novo', exibirFormularioPublicar);
router.post('/novo', cadastrarBico);
router.get('/:id', exibirDetalhesBico);

export default router;
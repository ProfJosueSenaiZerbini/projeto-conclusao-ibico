import express from 'express';
import { cadastrarUsuario } from '../controllers/authController.js';

const router = express.Router();

// Rota POST para processar o cadastro
router.post('/cadastrar', cadastrarUsuario);

export default router;
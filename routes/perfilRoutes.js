import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { 
    exibirPerfil, 
    exibirFormularioEditarPerfil, 
    atualizarPerfil, 
    exibirFormularioAlterarSenha, 
    atualizarSenha
} from '../controllers/perfilController.js';

const router = express.Router();

// Como esta rota já é montada com /perfil no app.js:
// GET /perfil -> Exibe a página do perfil
router.get('/', requireAuth, exibirPerfil);

// Suporta também acessar /perfil/perfil se necessário
router.get('/perfil', requireAuth, exibirPerfil);

// Formulário e Ação de edição de perfil
// GET /perfil/editar -> Exibe o formulário
router.get('/editar', requireAuth, exibirFormularioEditarPerfil);

// ⬇️ POST /perfil/editar -> Processa a atualização do Modal!
router.post('/editar', requireAuth, atualizarPerfil);

// Também aceita se a requisição bater em /perfil/perfil/editar por garantia
router.post('/perfil/editar', requireAuth, atualizarPerfil);

// Formulário e ação de alteração de senha
router.get('/alterar-senha', requireAuth, exibirFormularioAlterarSenha);
router.post('/alterar-senha', requireAuth, atualizarSenha);

export default router;
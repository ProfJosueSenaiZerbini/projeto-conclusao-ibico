import express from 'express';
import {
    exibirFormularioPublicar,
    cadastrarBico,
    exibirDetalhesBico,
    exibirBicosAtivosContratante,
    candidatarAoBico,
    listarCandidatosBico,
    atualizarStatusCandidatura,
    exibirHistoricoCandidatura,
    exibirGerenciamentoBico,
} from '../controllers/bicoController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Publicação e gerenciamento de bicos pelo Contratante
router.get('/ativos', requireAuth, requireRole('contratante'), exibirBicosAtivosContratante);
router.get('/novo', requireAuth, requireRole('contratante'), exibirFormularioPublicar);
router.post('/novo', requireAuth, requireRole('contratante'), cadastrarBico);

// Candidaturas - Ações do Contratante
router.get('/:bico_id/candidatos', requireAuth, requireRole('contratante'), listarCandidatosBico);
router.post('/candidaturas/status', requireAuth, requireRole('contratante'), atualizarStatusCandidatura);

// Candidaturas - Ação do Trabalhador
router.post('/candidatar', requireAuth, requireRole('trabalhador'), candidatarAoBico);

// Consulta de histórico (pode ser visualizada por qualquer usuário autenticado)
router.get('/candidaturas/:candidatura_id/historico', requireAuth, exibirHistoricoCandidatura);

// Os detalhes do bico podem ser vistos por qualquer usuário autenticado
router.get('/:id', requireAuth, exibirDetalhesBico);

// Rota de gerenciamento exclusiva para o Contratante
router.get('/:id/gerenciar', requireAuth, requireRole('contratante'), exibirGerenciamentoBico);



export default router;
import { Router, Response } from 'express';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

router.post('/instituicoes', async (req:AuthRequest, res) => {
    const { nome } = req.body;
    const usuarioId = req.userId;

    if (!usuarioId) { 
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    if(!nome) {
        return res.status(400).json({error: 'O nome da instituição é obrigatorio'});
    }

    try {
        const novaInstituicao = await pool.query(
            'INSERT INTO instituicoes (nome,usuario_id) VALUES ($1, $2) RETURNING *', 
            [nome, usuarioId]
        );

        res.status(201).json(novaInstituicao.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Erro interno do servidor.'});
    }
});

router.get('/instituicoes', async (req: AuthRequest, res) => {
    const usuarioId = req.userId;

    if (!usuarioId) { 
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    try{
        const instituicoes = await pool.query(
            'SELECT * FROM instituicoes WHERE usuario_id = $1 ORDER BY nome',
            [usuarioId]
        );

        res.status(200).json(instituicoes.rows)
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Erro interno do servidor.'});
    }
});

router.put('/instituicoes/:id', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.' });
    }

    if (!nome) {
        return res.status(400).json({ error: 'O nome é obrigatório.' });
    }

    try {
        const result = await pool.query(
            'UPDATE instituicoes SET nome = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *',
            [nome, id, usuarioId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Instituição não encontrada ou não autorizada.' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.delete('/instituicoes/:id', async (req: AuthRequest, res) => {
    const { id } = req.params;
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }
    
    try {
        const result = await pool.query(
            'DELETE FROM instituicoes WHERE id = $1 AND usuario_id = $2 RETURNING *',
            [id, usuarioId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({error: 'instituição não encontrada'})     
        }

        res.status(200).json({ message: 'instituição removida com sucesso'});
    } catch (err){
        console.error(err);
        
        if (err && typeof err === 'object' && 'code' in err && err.code === '23503') {
             return res.status(400).json({ error: 'Não é possível remover. Exclua as disciplinas associadas primeiro.' });
        }
        res.status(500).json({error: 'Erro interno do servidor. Verifique se existem itens associados.'});
    }
});

export default router;
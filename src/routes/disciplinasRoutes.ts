import { Router } from 'express';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();


router.get('/instituicoes/:instituicao_id/disciplinas', authenticateToken, async(req: AuthRequest, res) =>{
    const { instituicao_id } = req.params;
    const usuarioId = req.userId; 

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    try {
        const instituicaoCheck = await pool.query(
            'SELECT id FROM instituicoes WHERE id = $1 AND usuario_id = $2',
            [instituicao_id, usuarioId]
        );
        if (instituicaoCheck.rows.length === 0) {
            return res.status(401).json({ error: 'Instituição não encontrada ou não autorizada.'});
        }

        const disciplinasResult = await pool.query(
            'SELECT * FROM disciplinas WHERE instituicao_id = $1 ORDER BY nome',
            [instituicao_id]
        );
        const disciplinas = disciplinasResult.rows;

        for (const disciplina of disciplinas) {
            const turmasResults = await pool.query(
                'SELECT * FROM turmas WHERE disciplina_id = $1 ORDER BY nome',
                [disciplina.id]
            );
            disciplina.turmas = turmasResults.rows;
        }

        res.status(200).json(disciplinas);
    } catch (err){
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor. '});
    }
});

router.post( '/disciplinas', authenticateToken, async (req: AuthRequest, res) => {
    const { nome, sigla, codigo, periodo, instituicao_id } = req.body;
    const usuarioId = req.userId; 

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    if (!nome || !sigla || !codigo || !periodo || !instituicao_id) {
        return res.status(400).json({ error: 'Todos os campos são obrigatorios.' });
    }

    try{
        const instituicaoCheck = await pool.query (
            'SELECT id FROM instituicoes WHERE id = $1  AND usuario_id = $2',
            [instituicao_id, usuarioId]
        );
        if (instituicaoCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Ação não autorizada.'});
        }

        const novaDiciplina = await pool.query(
            'INSERT INTO disciplinas (nome, sigla, codigo, periodo, instituicao_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nome, sigla, codigo, periodo, instituicao_id]
        );

        res.status(201).json(novaDiciplina.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.'});
    }
});

router.delete('/disciplinas/:id', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const usuarioId = req.userId; 

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    try {
        const disciplinaCheck = await pool.query(
            `SELECT d.id FROM disciplinas d 
            JOIN instituicoes i ON d.instituicao_id = i.id 
            WHERE d.id = $1 AND i.usuario_id = $2`,
            [id, usuarioId]
        );

        if (disciplinaCheck.rows.length === 0) {
            return res.status(404).json({error: 'Disciplina não encontrada ou não autorizada.' });
        }

        await pool.query('DELETE FROM disciplinas WHERE id = $1', [id]);

        res.status(200).json({ message: 'Disciplina removida com sucesso.'});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor. Verifique se existem turmas associadas.'});
    }
});

router.post('/turmas', authenticateToken, async (req: AuthRequest, res) =>{
    const { nome, dia, horario, local, disciplinaId } = req.body;
    const usuarioId = req.userId; 

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }
    

    if (!nome || !dia || !horario || !local || !disciplinaId) {
        return res.status(400).json({ error: 'Campo obrigatório em falta.'});
    }

    try {
        const disciplinaCheck = await pool.query(
            `SELECT d.id FROM disciplinas d
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE d.id = $1 AND i.usuario_id = $2`,
            [disciplinaId, usuarioId]
        );
        if(disciplinaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Acão não autorizada.' });
        }

        const novaTurma = await pool.query(
            'INSERT INTO turmas (nome, dia_semana, horario, local, disciplina_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [nome, dia, horario, local || null, disciplinaId]
        ); 

        res.status(201).json(novaTurma.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.delete('/turmas/:id', authenticateToken, async(req: AuthRequest, res) => {
    const { id } = req.params;
    const usuarioId = req.userId; 

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    try{
        const turmaCheck = await pool.query(
            `SELECT t.id FROM turmas t
            JOIN disciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE t.id = $1 AND i.usuario_id = $2`,
            [id, usuarioId]
        );

        if(turmaCheck.rows.length === 0) {
            return res.status(404).json({ error: 'turma não encontrada ou não autorizada.' });
        }

        await pool.query('DELETE FROM turmas WHERE id = $1', [id]);

        res.status(200).json({ message: 'Turma removida com sucesso.' });
    } catch (err){
        console.error(err);
        res.status(500).json({ error: 'Erro interno no servidor. Verifique se existe alunos ou notas associadas.'});
    }
});

export default router;

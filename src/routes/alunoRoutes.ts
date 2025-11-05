import { Router } from 'express';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();



router.get('/turmas/:turma_id/alunos', authenticateToken, async (req: AuthRequest, res) => {
    const { turma_id } = req.params;
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    try { 
        const turmaCheck = await pool.query(
            `SELECT t.id FROM turmas t
            JOIN disciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE t.id = $1 i.usuario_id = $2`,
            [turma_id, usuarioId]
        );
        if(turmaCheck.rows.length === 0) { 
            return res.status(404).json({ error: 'Turmea não encontrada ou não autorizada.'});
        }

        const alunosResult = await pool.query(
            'SELECT * FROM alunos WHERE turma_id = $1 ORDER BY nome',
            [turma_id]
        );

        res.status(200).json(alunosResult.rows);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.post('/alunos', authenticateToken, async(req: AuthRequest, res) => {
    const { matricula, nome, turma_id } = req.body;
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    if (!matricula || !nome || !turma_id) {
        return res.status(400).json({ error: 'Matrícula, nome e ID da turma são obrigatórios.' });
    }

    try {
        const turmaCheck = await pool.query(
            `SELECT t.id FROM turmas t
            JOIN disciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE t.id = $1 AND i.usuario_id = $2`,
            [turma_id, usuarioId]
        );
        if(turmaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Ação não autorizada.'});
        }

        const novoAluno = await pool.query(
            'INSERT INTO alunos (matricula, nome, turma_id) VALUES ($1, $2, $3) RETURNING *',
            [matricula, nome, turma_id]
        );

        res.status(201).json(novoAluno.rows[0]);
    } catch(err){
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.put('/alunos/:id', authenticateToken, async(req: AuthRequest, res) => {
    const { id } = req.params;
    const { matricula, nome } = req.body;
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }
    
    if(!matricula || !nome) {
        return res.status(400).json({ error: 'Matrícula e nome são obrigatórios. '});
    }

    try {
        const alunoCheck = await pool.query(
            `SELECT a.id FROM alunos a
            JOIN turmas t ON a.turma_id = t.id
            JOIN disciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE a.id = $1 i.usuario_id = $2`,
            [id, usuarioId]
        );

        if (alunoCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Alunos não encontrados ou não autorizado.'});
        }

        const alunoAtualizado = await pool.query(
            'UPDATE alunos SET matricula = $1, nome = $2 WHERE id = $3 RETURNING *',
            [matricula, nome, id]
        );

        res.status(200).json(alunoAtualizado.rows[0]);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor'});
    }
});

router.delete('/alunos/:id', authenticateToken, async(req: AuthRequest, res) => {
    const { id } = req.params;
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }


    try {
        const alunoCheck = await pool.query(
            `SELECT a.id FROM alunos a
            JOIN turmas t ON a.turma_id = t.id
            JOIN disciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instiuicao_id = i.id
            WHERE a.id = $1 AND i.usuario_id = $2`,
            [id, usuarioId]
        );

        if(alunoCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado ou não autorizado.'});
        }

        await pool.query('DELETE FROM alunos WHERE id = $1', [id]);

        res.status(200).json({ message: 'Aluno removido com sucesso.' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor. Verifique se existem notas associadas.' });
    }
});

export default router;

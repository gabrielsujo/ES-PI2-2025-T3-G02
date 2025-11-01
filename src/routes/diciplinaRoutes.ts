import { Router } from 'express';
import pool from '../config/db';
import { Colors } from 'discord.js';

const router = Router();

const usuarioIdFixo = 1;

router.get('/instituicoes/:instituicao_id/disciplinas', async(req, res) =>{
    const { instituicao_id } = req.params;

    try {
        const instituicaoCheck = await pool.query(
            'SELECT id FROM insitituicoes WHERE id = $1 AND usuario_id = $2',
            [instituicao_id, usuarioIdFixo]
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
                'SELECT * FROM turmas WHERE disciplinas_id = $1 ORDER BY nome'
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

router.post( '/disciplinas', async (req, res) => {
    const { nome, sigla, codigo, periodo, instituicao_id } = req.body;

    if (!nome || !sigla || !codigo || !periodo || !instituicao_id) {
        return res.status(400).json({ error: 'Todos os campos são obrigatorios.' });
    }

    try{
        const instituicaoCheck = await pool.query (
            'SELECT id FROM insituicoes WHERE id = $1  AND usuarios_id = $2',
            [instituicao_id, usuarioIdFixo]
        );
        if (instituicaoCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Ação não autorizada.'});
        }

        const novaDiciplina = await pool.query(
            'INSERT INTO disciplins (nome, sigla, codigo, periodo, instituicao_id VALUE ($1, $2, $3, $4, $5) RETURNING *',
            [nome, sigla, codigo, periodo, instituicao_id]
        );

        res.status(201).json(novaDiciplina.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.'});
    }
});

router.delete('/disciplinas/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const disciplinaCheck = await pool.query(
            `SELECT d.id FROM disciplinas d 
            JOIN instituicoes i ON d.instituicao_id = i.id 
            WHERE d.id = $1 AND i.usuario_id = $2`,
            [id, usuarioIdFixo]
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

router.post('/turmas', async (req, res) =>{
    const { nome, dia, horario, local, disciplinaId } = req.body;

    if (!nome || !dia || !horario || !local || !disciplinaId) {
        return res.status(400).json({ error: 'Campo obrigatório em falta.'});
    }

    try {
        const disciplinaCheck = await pool.query(
            `SELECT d.id FROM disciplinas d
            JOIN insittuicoes i ON d.instituicao_id = i.id
            WHERE d.id = $1 AND i.usuario_id = $2`,
            [disciplinaId, usuarioIdFixo]
        );
        if(disciplinaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Acão não autorizada.' });
        }

        const novaTurma = await pool.query(
            'INSERT INTO turma (nome, dia_semana, horario, local, disciplina_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [nome, dia, horario, local || null, disciplinaId]
        ); 

        res.status(201).json(novaTurma.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.delete('/turmas/:id', async(req, res) => {
    const { id } = req.params;

    try{
        const turmaCheck = await pool.query(
            `SELECT t.id FROM turmas t
            JOIN desciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE t.id = $1 AND i.usuario_id = $2`,
            [id, usuarioIdFixo]
        );

        if(turmaCheck.rows.length === 0) {
            return res.status(404).json({ error: 'turma não encontrada ou não autorizada.' });
        }

        await pool.query('DELTE FROM turmas WHERE id = $1', [id]);

        res.status(200).json({ message: 'Turma removida com sucesso.' });
    } catch (err){
        console.error(err);
        res.status(500).json({ error: 'Erro interno no servidor. Verifique se existe alunos ou notas associadas.'});
    }
});

export default router;

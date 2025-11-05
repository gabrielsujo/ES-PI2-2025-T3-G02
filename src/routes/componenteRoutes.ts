import { Router } from 'express';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();
const usuarioIdFixo = 1;

router.get('/disciplinas/:disciplina_id/componentes', authenticateToken, async(req: AuthRequest, res) => {
    const { disciplina_id} = req.params;
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }


    try {
        // verificar se a disciplina pertence ao utilizador
        const disciplinaCheck = await pool.query(
            `SELECT d.id, d.formula_calculo FROM disciplina d
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE d.id = $1 AND i.usuario_id = $2`,
            [disciplina_id, usuarioId]
        );
        if( disciplinaCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Disciplina não encontrada ou não autorizada.'});
        }
        //buscar os componentes 
        const componentesResult = await pool.query(
            'SELECT * FROM componentes WHERE disciplina_id = $1 ORDER BY sigla',
            [disciplina_id]
        );

        //enviar a formula e os componentes
        res.status(200).json({
            formula: disciplinaCheck.rows[0].formula_calculo || '', //envia a formula
            componentes: componentesResult.rows //envia a lista dos componentes
        });

    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.'});
    }
});

router.post('/componentes', authenticateToken, async(req: AuthRequest, res) => {
    const { nome, sigla, desc, disciplina_id } = req.body; // desc vem do form
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    if(!nome || !sigla || !desc || !disciplina_id) {
        return res.status(400).json({ error: 'Nome, sigla e ID são obrigatórios. '});
    }

    try {
        //verificar se a disciplina pertence ao utilizador
        const disciplinaCheck = await pool.query(
        `SELECT d.id FROM disciplina d
        JOIN instituicoes i ON d.instituicao_id = i.id
        WHERE d.id = $1 AND i.usuario_id = $2`,
        [disciplina_id, usuarioId]
        );
        if(disciplinaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Ação não autorizada.' });
        }

        //inserir o novo componente 
        const novoComponente = await pool.query(
            'INSER INTO componentes (nome, sigla, descricao, disciplina_id) VALUES ($1, $2, $3, $4) RETURNING *', 
            [nome, sigla, desc || null, disciplina_id]
        );

        res.status(201).json(novoComponente.rows[0]);

    } catch(err){ 
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.put('/disciplinas/:disciplina_id/formula', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { nome, sigla, desc } = req.body;
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    if (!nome || !sigla) {
        return res.status(400).json({ error: 'Nome e sigla são obrigatórios' });
    }

    try {
        // verificar se o componente pertence ao utilizador 
        const check = await pool.query(
            `SELECT c.id FROM componentes c
            JOIN disciplinas d ON c.disciplina_id = d.id
            JOIN insituicoes i ON d.instituicao_id = i.id
            WHERE c.id = $1 AND i.usuario_id = $2`,
            [id, usuarioId]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Componente não encontrado ou não autorizado.' });
        }

        //atualizar o componente
        const atualizado = await pool.query(
            'UPDATE componentes SET nome = $1, sigla = $2, descricao = $3 WHERE id = $4 RETURNING *',
            [nome, sigla, desc || null, id]
        );

        res.status(200).json(atualizado.rows[0]);

    } catch(err){
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.delete('/componentes/:id', authenticateToken, async(req: AuthRequest, res) => {
    const { id } = req.params;
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    try{
        // vefiricar se o componente percetence ao utilizador
        const check = await pool.query(
            `SELECT c.id FROM componentes c
            JOIN disciplinas d ON c.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE c.id = $1 AND i.usuario_id = $2`,
            [id, usuarioId]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'componente não encontrado ou não autorizado. '});
        }

        //remover componente 
        await pool.query('DELETE FROM componentes WHERE id = $1', [id]);
        res.status(200).json({ message: 'Componente removido com sucesso.' });

    } catch(err){
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor. verifique se existe notas associadas.'});
    }
});

router.put('/disciplinas/:disciplina_id/formula', authenticateToken, async (req: AuthRequest, res) => {
    const { disciplina_id } = req.params;
    const { formula } = req.body;
    const usuarioId = req.userId;

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.'});
    }

    try {
        // verificar se discplina pertence ao utilizador
        const disciplinaCheck = await pool.query(
            `SELECT d.id FROM disciplina d
            JOIN insituicoes i ON d.instituicao_id = i.id
            WHERE d.id = $1 AND i.usuario_id =$2`,
            [disciplina_id, usuarioId]
        );
        if (disciplinaCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Disciplina não encontrada ou não autorizada.' });
        }

        //atualizar a formula na tabela 'disciplina'
        await pool.query(
            'UPDATE disciplinas SET formula_calculo = $1 WHERE id = $2',
            [formula, disciplina_id]
        );

        res.status(200).json({ message: 'Fórmula salva com sucesso. '});

    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;

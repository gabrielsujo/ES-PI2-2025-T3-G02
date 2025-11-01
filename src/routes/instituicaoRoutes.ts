import { Router } from 'express';
import pool from '../config/db';

const router = Router();

router.post('/instituicoes', async (req, res) => {
    const { nome } = req.body;
    const usuarioIdFixo = 1;

    if(!nome) {
        return res.status(400).json({error: 'O nome da instituição é obrigatorio'});
    }

    try {
        const novaInstituicao = await pool.query(
            'INSERT INTO instituicoes (nome,usuario_id) VALUE ($1, $2) RETURNING *', 
            [nome, usuarioIdFixo]
        );

        res.status(201).json(novaInstituicao.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Erro interno do servidor.'});
    }
});

router.get('/instituicoes', async (req, res) => {
    const usuarioIdFixo = 1;

    try{
        const instituicoes = await pool.query(
            'SELECT * FROM instituicoes WHERE usuario_id = $1 ORDER BY nome',
            [usuarioIdFixo]
        );

        res.status(200).json(instituicoes.rows)
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Erro interno do servidor.'});
    }
});

router.delete('/insituicoes/:id', async (req, res) => {
    const { id } = req.params;
    const usuarioIdFixo = 1;

    try {
        const result = await pool.query(
            'DELETE FROM instituicoes WHERE id = $1 AND usuario_id = $2 RETURNING *',
            [id, usuarioIdFixo]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({error: 'instituição não encontrada'})     
        }

        res.status(200).json({ message: 'instituição removida com sucesso'});
    } catch (err){
        console.error(err);
        res.status(500).json({error: 'Erro interno do servidor. Verifique se existem itens associados.'});
    }
});

export default router;
import { Router } from 'express';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();


router.get('/turmas/:turma_id/notas', authenticateToken, async (req: AuthRequest, res) => {
    const { turma_id } = req.params;
    const usuarioId = req.userId; 

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.' });
    }

    try{
        //verificar se a turma pertence ao utilizador
        const turmaCheck = await pool.query(
            `SELECT T.id FROM turmas t
            JOIN disciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE t.id = $1 AND i.usuario_id = $2`,
            [turma_id, usuarioId]
        );
        if(turmaCheck.rows.length === 0 ) {
            return res.status(404).json({ error: 'Turma não encontrada ou não autorizada.' });
        } 
        
        //buscar todas as notas associadas aos alunos desta turma
        const notasResult = await pool.query(
            `SELECT n.aluno_id, n.componente_id, n.valor
            FROM notas n 
            JOIN alunos a ON n.aluno_id = a.id
            WHERE a.turma_id = $1`,
            [turma_id]
        );

        res.status(200).json(notasResult.rows);

    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.post('/turmas/:turma_id/notas', authenticateToken, async (req: AuthRequest, res) => {
    //o front vai enviar um array de notas
    const notas: {aluno_id:number, componente_id:number, valor:number | null }[] = req.body.notas;
    const turma_id = req.body.turma_id; //isso para segurança
    const usuarioId = req.userId; 

    if (!usuarioId) {
        return res.status(403).json({ error: 'Autorização necessária.' });
    }

    if (!Array.isArray(notas) || !turma_id || notas.length === 0) {
        return res.status(400).json({ error: 'Formato de dados inválidos.' });
    }

    try {
        // --- verificação de segunrança ---
        const turmaCheck = await pool.query(
            `SELECT t.id FROM turmas t
            JOIN disciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE t.id = $1 AND i.usuario_id = $2`,
            [turma_id, usuarioId]
        );
        if(turmaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Ação nâo autorizada.' });
        }
        // --- fim da verificação ---

        //iniciar uma transação
        const client = await pool.connect();

        try{
            await client.query('BEGIN'); //começa a transação

            //loop 'UPSERT'
            for (const nota of notas) {
                //se a nota for nula ou invalida, vai ser tratada como null na base de dados
                const valorFinal = (typeof nota.valor === 'number' && isFinite(nota.valor)) ? nota.valor : null;

                const query = `
                    INSERT INTO notas (aluno_id, componente_id, valor)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (aluno_id, componente_id) DO UPDATE
                    SET valor = EXCLUDED.valor
                `;
                //ON CONFLICT é o UPSERT 
                //se o par aluno_id e componente_id ja existir ao inves de dar erro
                // vai executar um UPDATE definindo um 'valor' para o novo 'valor' que foi excluido da tentativa de INSERT
                await client.query(query, [nota.aluno_id, nota.componente_id, valorFinal]);
            } 

            await client.query('COMMIT');
            res.status(200).json({ message: 'Notas salvas com sucesso!' });
        } catch (err){
            await client.query('ROLLBACK'); // desfaz tudo em caso de erro
            throw err; // lança o erro para ser acompanhado pelo catch exterior
        } finally {
            client.release(); //libera o cliente para a pool de novo
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;

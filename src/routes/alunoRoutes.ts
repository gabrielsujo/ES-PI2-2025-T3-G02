import { Router } from 'express';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middlewares/authMiddleware';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
            WHERE t.id = $1 AND i.usuario_id = $2`,
            [turma_id, usuarioId]
        );
        if(turmaCheck.rows.length === 0) { 
            return res.status(404).json({ error: 'Turma não encontrada ou não autorizada.'});
        }

        const alunosResult = await pool.query(
            'SELECT id, matricula, nome, turma_id FROM alunos WHERE turma_id = $1 ORDER BY nome',
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

        const matriculaCheck = await pool.query(
            'SELECT id FROM alunos WHERE matricula = $1 AND turma_id = $2',
            [matricula, turma_id]
        );

        if (matriculaCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Esta matrícula já está cadastrada nesta turma.' });
        }

        const novoAluno = await pool.query(
            'INSERT INTO alunos (matricula, nome, turma_id) VALUES ($1, $2, $3) RETURNING id, matricula, nome, turma_id',
            [matricula, nome, turma_id]
        );

        res.status(201).json(novoAluno.rows[0]);
    } catch(err){
        console.error(err);
        
        if (err && typeof err === 'object' && 'code' in err) {
            if (err.code === '23505') { 
                return res.status(409).json({ error: 'Matrícula já cadastrada nesta turma.' });
            }
        }

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
            WHERE a.id = $1 AND i.usuario_id = $2`,
            [id, usuarioId]
        );

        if (alunoCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Alunos não encontrados ou não autorizado.'});
        }

        const alunoAtualizado = await pool.query(
            'UPDATE alunos SET matricula = $1, nome = $2 WHERE id = $3 RETURNING id, matricula, nome, turma_id',
            [matricula, nome, id]
        );

        res.status(200).json(alunoAtualizado.rows[0]);
    } catch(err) {
        console.error(err);
        if (err && typeof err === 'object' && 'code' in err) {
            if (err.code === '23505') { 
                return res.status(409).json({ error: 'Esta matrícula já pertence a outro aluno nesta turma.' });
            }
        }
        res.status(500).json({ error: 'Erro interno do servidor'});
    }
});

router.post(
    '/turmas/:turma_id/alunos/import-csv',
    authenticateToken,
    upload.single('csvFile'),
    async (req: AuthRequest, res) => {
    
    const { turma_id } = req.params;
    const usuarioId = req.userId;

    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo CSV enviado.'});
    }
    
    try {
        const turmaCheck = await pool.query(
            `SELECT t.id FROM turmas t
            JOIN disciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE t.id = $1 AND i.usuario_id = $2`,
            [turma_id, usuarioId]
        );
        if (turmaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Ação não autorizada.' });
        }

        const existentesResult = await pool.query(
            'SELECT matricula FROM alunos WHERE turma_id = $1',
            [turma_id]
        );
        const matriculaExistentes = new Set(existentesResult.rows.map(r => r.matricula));

        const alunosParaAdicionar: { matricula: string, nome: string } [] = [];
        let linhasInvalidas = 0;

        const bufferStream = new Readable();
        bufferStream.push(req.file.buffer);
        bufferStream.push(null);

        await new Promise<void>((resolve, reject) => {
            bufferStream
            .pipe(csvParser({
                mapHeaders: ({ header }) => header.toLowerCase(),
                separator: ';',
                skipLines: 1 
            }))
            .on('data', (row) => {
                const matricula = row.matricula?.trim();
                const nome = row.nome?.trim();
                
                const matriculaRegex = /^[0-9]+$/;
                const nomeRegex = /^[^0-9]*$/;

                if (matricula && nome && matriculaRegex.test(matricula) && nomeRegex.test(nome) && !matriculaExistentes.has(matricula)) {
                    matriculaExistentes.add(matricula);
                    alunosParaAdicionar.push({ matricula, nome });
                } else if (matricula || nome) {
                    linhasInvalidas++;
                }
            })
            .on('end', resolve)
            .on('error', reject);
        });

        if (alunosParaAdicionar.length > 0) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                for (const aluno of alunosParaAdicionar) {
                    await client.query(
                        'INSERT INTO alunos (matricula, nome, turma_id) VALUES ($1, $2, $3)',
                        [aluno.matricula, aluno.nome, turma_id]
                    );
                }
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        }
        
        let message = `${alunosParaAdicionar.length} alunos importados com sucesso.`;
        if (linhasInvalidas > 0) {
            message += ` ${linhasInvalidas} linhas foram ignoradas (matrícula/nome inválido, duplicado, ou dados em falta).`;
        }

        res.status(201).json({
            message: message,
            importados: alunosParaAdicionar.length
        });

    } catch(err) {
        console.error('Erro na importação de CSV', err);
        res.status(500).json({ error: 'Erro interno de servidor ao processar o CSV' });
    }
});

router.delete('/alunos/batch', authenticateToken, async (req: AuthRequest, res) => {
    const { ids } = req.body; 
    const usuarioId = req.userId;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Array de IDs inválido ou vazio.' });
    }

    const alunosIds = ids.map(id => parseInt(id,10)).filter(id => !isNaN(id));

    if (alunosIds.length === 0) {
        return res.status(400).json({ error: 'Nenhum ID de aluno válido fornecido.' });
    }

    const client = await pool.connect();
    try{
        await client.query('BEGIN');
        
        const checkQuery = await client.query(
            `SELECT a.id FROM alunos a
            JOIN turmas t ON a.turma_id = t.id
            JOIN disciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE i.usuario_id = $1 AND a.id = ANY($2::int[])`,
            [usuarioId, alunosIds]
        );

        if (checkQuery.rows.length !== alunosIds.length) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Acão não autorizada. Alguns alunos não pertencem a este usúario ou não foram encontrados.' });
        }

        await client.query(
            'DELETE FROM alunos WHERE id = ANY($1::int[])',
            [alunosIds]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: `${alunosIds.length} alunos removidos com sucesso.` });

    }catch (err){
        await client.query('ROLLBACK');
        console.error(err);

        if (err && typeof err === 'object' && 'code' in err && err.code === '23503') {
            return res.status(400).json({ error: 'Não é possível remover. Verificar se os alunos possuem notas associadas.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
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
            JOIN instituicoes i ON d.instituicao_id = i.id
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
        if (err && typeof err === 'object' && 'code' in err && err.code === '23503') {
            return res.status(400).json({ error: 'Não é possível remover. Verifique se existem notas associadas.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

export default router;
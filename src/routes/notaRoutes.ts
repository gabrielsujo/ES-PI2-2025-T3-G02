import { Router } from 'express';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middlewares/authMiddleware';
import Papa from 'papaparse';
import { calcularNotaFinal } from '../utils/CalculoNotas.js' // backend importa .js

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

router.get('/turmas/:turma_id/export-csv', authenticateToken, async (req: AuthRequest, res) => {
    const { turma_id } = req.params;
    const usuarioId = req.userId;

    try {
        //verificar permissão e buscar dados da turma/disciplina
        const turmaCheck = await pool.query(
            `SELECT 
                t.nome as turma_nome,
                d.id as disciplina_id,
                d.formula_calculo,
                d.sigla as disciplina_sigla
            FROM turmas t 
            JOIN disciplinas d ON t.disciplina_id = d.id
            JOIN instituicoes i ON d.instituicao_id = i.id
            WHERE t.id = $1 AND i.usuario_id = $2`,
            [turma_id, usuarioId]
        );

        if (turmaCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Turma não encontrada ou não autorizada.'})
        }
        
        const { disciplina_id, formula_calculo, disciplina_sigla, turma_nome } = turmaCheck.rows[0];

        //buscar componentes, alunos e notas
        const componentesResult = await pool.query(
            'SELECT id, sigla FROM componentes WHERE disciplina_id = $1 ORDER BY sigla',
            [disciplina_id]
        );
        const componentes = componentesResult.rows;

        const alunosResult = await pool.query(
            'SELECT id, matricula, nome FROM alunos WHERE turma_id = $1 ORDER BY nome',
            [turma_id]
        );
        const alunos = alunosResult.rows;

        if (alunos.length === 0) {
             return res.status(400).json({ error: 'Não há alunos cadastrados para exportar.' })
        }
        if (componentes.length === 0) {
             return res.status(400).json({ error: 'Não há componentes cadastrados para exportar.' })
        }

        // --- início da correção ---
        // busca notas. o erro estava em 'n.alunos_id'
        const notasResult = await pool.query(
            `SELECT n.aluno_id, n.componente_id, n.valor
            FROM notas n
            JOIN alunos a ON n.aluno_id = a.id
            WHERE a.turma_id = $1`,
            [turma_id]
        );
        // --- fim da correção ---
        
        //mapeia as notas para facilitar acesso
        const notasMap = new Map<number, Map<number, number | null>>();
        notasResult.rows.forEach(n => {
            if (!notasMap.has(n.aluno_id)) notasMap.set(n.aluno_id, new Map());
            notasMap.get(n.aluno_id)!.set(n.componente_id, n.valor);
        });

        //validação - checar se todas as rotas existem
        let todasNotasLancadas = true;
        for (const aluno of alunos) {
            for (const comp of componentes) {
                const nota = notasMap.get(aluno.id)?.get(comp.id);
                if (nota === null || nota === undefined) {
                    todasNotasLancadas = false;
                    break;
                }
            }
            if (!todasNotasLancadas) break;
        }
        if (!todasNotasLancadas) {
            return res.status(400).json({ error: 'A exportação só é permitida quando TODAS as notas de todos os alunos estiverem lançadas.'})
        }

        //montar os dados para CSV
        const dataParaCsv: any[] = [];
        const headers = ['Matricula', 'Nome'];
        headers.push(...componentes.map(c => c.sigla)); // p1, p2, etc.
        headers.push('Nota final');

        for (const aluno of alunos) {
            const linha: any = {
                Matricula: aluno.matricula,
                Nome: aluno.nome
            };

            const notasParaCalculo: { sigla: string, valor: number | null }[] = [];

            componentes.forEach(comp => {
                const valor = notasMap.get(aluno.id)?.get(comp.id) ?? null;
                // formata '10.00' para '10,00' (padrão excel br)
                linha[comp.sigla] = valor !== null ? valor.toFixed(2).replace('.', ',') : 'N/A';
                notasParaCalculo.push({ sigla: comp.sigla, valor: valor });
            });

            const notaFinal = calcularNotaFinal(formula_calculo, notasParaCalculo);
            linha['Nota final'] = notaFinal !== null ? notaFinal.toFixed(2).replace('.', ',') : 'N/A';

            dataParaCsv.push(linha);
        }
        
        //gerar o CSV e o nome do arquivo
        const csvString = Papa.unparse(dataParaCsv, { columns: headers, delimiter: ";"});
        const timestamp = new Date().toISOString().replace(/[:.]/g,'-').slice(0, 19);
        const fileName = `export_${turma_nome.replace(/ /g, '_')}_${timestamp}.csv`;

        // enviar o arquivo como resposta
        res.setHeader('Content-type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.status(200).send(Buffer.from(csvString, 'utf-8'));

    } catch (err){
        console.error('Erro na exportação de CSV:', err);
        res.status(500).json({ error: 'Erro interno do servidor ao gerar o CSV' });
    }
});

export default router;

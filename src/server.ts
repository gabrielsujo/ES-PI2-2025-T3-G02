import 'dotenv/config';
import express, {Request, Response, NextFunction } from 'express';
import path from 'path';

//importar rotas e bancos
import authRoutes from './routes/authRoutes';
import instituicaoRoutes from './routes/instituicaoRoutes';
import disciplinaRoutes from './routes/diciplinaRoutes';
import alunosRoutes from './routes/alunoRoutes';
import componenteRoutes from './routes/componenteRoutes';
import notaRoutes from './routes/notaRoutes';
import pool from './config/db'

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', authRoutes);
app.use('/api', instituicaoRoutes);
app.use('/api', disciplinaRoutes);
app.use('/api', alunosRoutes);
app.use('/api', componenteRoutes);
app.use('/api', notaRoutes);

//rota principal
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
})

// outras rotas html
app.get('/dashboard.html', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});
app.get('/disciplinas.html', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'disciplinas.html'));
});
app.get('/alunos.html', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'alunos.html'));
});
app.get('/componentes.html', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'componentes.html'));
});
app.get('/notas.html', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'notas.html'));
});

app.listen(port, () => {
    console.log(`servidor rodando em http:localhost:${port}`);
})
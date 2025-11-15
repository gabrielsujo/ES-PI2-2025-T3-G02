import dotenv from 'dotenv';
dotenv.config()
import 'dotenv/config';
import express, {Request, Response, NextFunction } from 'express';
import path from 'path';

//importar rotas e bancos
import authRoutes from './routes/authRoutes';
import instituicaoRoutes from './routes/instituicaoRoutes';
import disciplinaRoutes from './routes/disciplinasRoutes';
import alunosRoutes from './routes/alunoRoutes';
import componenteRoutes from './routes/componenteRoutes';
import notaRoutes from './routes/notaRoutes';
import { authenticateToken } from './middlewares/authMiddleware';

const app = express();
const port = process.env.PORT || 3000;
// conecta cm o banco de dados
import { connectToDB } from './config/db'; // Importa a *função* de conexão
const startServer = async ()=> {
    try {
        await connectToDB();
        app.listen(port,() => {
            console.log(`Servidor rodando em http:localhost:${port}`);
        });
    } catch (error) {
        console.error('Falha ao iniciar o servidor',error);
    }
};
startServer();

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.static(path.join(__dirname, '..', 'src'))); 


// ROTA PÚBLICA: Login e Registro
app.use('/api', authRoutes);

// ROTAS PROTEGIDAS (NÍVEL 1):
app.use('/api', authenticateToken, instituicaoRoutes);
app.use('/api', authenticateToken, disciplinaRoutes);
app.use('/api', authenticateToken, alunosRoutes);
app.use('/api', authenticateToken, componenteRoutes);
app.use('/api', authenticateToken, notaRoutes);



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

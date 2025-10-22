import 'dotenv/config';
import express, {Request, Response, NextFunction } from 'express';
import path from 'path';

//importar rotas e bancos
import authRoutes from './routes/authRoutes';
import pool from './config/db'

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', authRoutes);

app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.listen(port, () => {
    console.log(`servidor rodando em http:localhost:${port}`);
})
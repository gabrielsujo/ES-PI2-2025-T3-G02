import { Router, Request, Response, NextFunction } from "express";
import pool from '../config/db';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { error } from "console";
import { sendEmail } from './emailService';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

router.post('/register', async (req: Request, res: Response) => {
    const { nome, email, senha, telefone } = req.body;
    
    if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'todos os campos são obrigatorios.'});
    }
    if (senha.length < 4) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 4 caracteres.' });
    }

    try {

        const userExists = await pool.query('SELECT * FROM Professores WHERE email = $1', [email]);

        if (userExists.rows.length > 0) {
            return res.status(409).json({ error: 'Este email já está cadastrado.'});
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);


        const novoUsuarioResult = await pool.query (
            'INSERT INTO Professores (nome, email, senha_hash, telefone) VALUES ($1, $2, $3, $4) RETURNING id, email',
            [nome, email, senhaHash, telefone]
        );
        const novoUsuario = novoUsuarioResult.rows[0];


        const token = jwt.sign({ userId: novoUsuario.id }, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            message: 'Usuário registrado com sucesso!',
            userId: novoUsuario.id,
            email: novoUsuario.email,
            token: token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno do servidor.'});
    }
});


router.post('/login', async (req: Request, res: Response) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.'});
    }

    try {

        const result = await pool.query('SELECT * FROM Professores WHERE email = $1', [email]);
        const usuario = result.rows[0];

        if (!usuario) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaCorreta) {
            return res.status(401).json({ error: 'Credenciais invalidas' });
        }

        const token = jwt.sign({ userId: usuario.id }, JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            message: 'Login realizado com sucesso!',
            userId: usuario.id,
            email: usuario.email,
            token: token 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.'});
    }
});


router.post('/forgot-password', async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'O e-mail é obrigatório.' });
    }

    try {
        const userResult = await pool.query('SELECT * FROM Professores WHERE email = $1', [email]);
        const usuario = userResult.rows[0];

        if (!usuario) {
            return res.status(200).json({ message: 'Se um usuário com este e-mail existir, um link de recuperação será enviado.' });
        }

        const resetToken = jwt.sign(
            { userId: usuario.id, type: 'password-reset' },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;


        const emailHtml = `
            <h2>Recuperação de Senha - Projeto NotaDez</h2>
            <p>Você solicitou a redefinição da sua senha. Clique no link abaixo para criar uma nova senha:</p>
            <p><a href="${resetLink}" target="_blank">Redefinir Minha Senha</a></p>
            <p>Este link é válido por 15 minutos.</p>
            <p>Se você não solicitou isso, por favor, ignore este e-mail.</p>
        `;

        await sendEmail({
            to: usuario.email,
            subject: 'Recuperação de Senha - Projeto NotaDez',
            html: emailHtml
        });

        res.status(200).json({ message: 'Se um usuário com este e-mail existir, um link de recuperação será enviado.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


router.post('/reset-password', async (req: Request, res: Response) => {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
        return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
    }
    if (novaSenha.length < 4) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 4 caracteres.' });
    }

    try {
        let payload: JwtPayload | string;
        try {
            payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        } catch (err) {
            return res.status(401).json({ error: 'Token inválido ou expirado.' });
        }

        if (typeof payload !== 'object' || payload.type !== 'password-reset' || !payload.userId) {
             return res.status(401).json({ error: 'Token inválido.' });
        }

        const { userId } = payload;

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(novaSenha, salt);

        await pool.query(
            'UPDATE Professores SET senha_hash = $1 WHERE id = $2',
            [senhaHash, userId]
        );

        res.status(200).json({ message: 'Senha redefinida com sucesso!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});



export default router;

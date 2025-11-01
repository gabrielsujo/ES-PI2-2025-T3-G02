import { Router, Request, Response, NextFunction } from "express";
import pool from '../config/db';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { error } from "console";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// Interface para estender o objeto Request e adicionar 'userId'
export interface AuthRequest extends Request {
    userId?: number;
}

// ---------------- MIDDLEWARE DE AUTENTICAÇÃO ( BLOQUEIO)----------
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        // 401 Unauthorized - Bloqueia se não houver token
        return res.status(401).json({ error: 'Acesso negado. Token de autenticação não fornecido.' });
    }

    // 2. Verifica se o token é válido e não expirou
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // 403 Forbidden - Bloqueia se o token for inválido
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }

        // 3. Token válido: Adiciona o ID do usuário ao objeto Request
        req.userId = (user as JwtPayload).userId; 
        
        // 4. Permite que a rota continue
        next();
    });
};

// --------- ROTA DE REGISTRO --------- 
router.post('/register', async (req: Request, res: Response) => {
    const { nome, email, senha } = req.body;
    
    //validar input
    if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'todos os campos são obrigatorios.'});
    }

    try {
        //verificação de usuario existente no banco
        const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

        if (userExists.rows.length > 0) {
            return res.status(409).json({ error: 'Este email já está cadastrado.'});
        }
        //gerar o HASH da senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        //inserir o novo usuario no banco
        const novoUsuarioResult = await pool.query (
            'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, email',
            [nome, email, senhaHash]
        );
        const novoUsuario = novoUsuarioResult.rows[0];

        //  GERAÇÃO DO TOKEN
        const token = jwt.sign({ userId: novoUsuario.id }, JWT_SECRET, { expiresIn: '1d' });

        //responder com sucesso
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

// --------- ROTA LOGIN ---------
router.post('/login', async (req: Request, res: Response) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.'});
    }

    try {
        //buscar usuario por email no banco
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        //se o usuario não for encontrado
        if (!usuario) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });// usuario não existe
        }

        // comparar a senha enviada com a hash salvo no banco
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaCorreta) {
            return res.status(401).json({ error: 'Credenciais invalidas' });// senha errada
        }

        const token = jwt.sign({ userId: usuario.id }, JWT_SECRET, { expiresIn: '1d' });

        //login de bem vindo (implementar a logica de sessão)
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

// exporte o router para usar no server
export default router;

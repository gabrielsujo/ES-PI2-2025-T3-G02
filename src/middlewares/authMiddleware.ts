import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

//  Chave Secreta
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

//  Interface para adicionar 'userId' ao objeto Request
// Isso resolve o erro de tipagem no TypeScript
export interface AuthRequest extends Request {
    userId?: number; 
}

//  Middleware de Autenticação
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Tenta obter o token do cabeçalho 'Authorization' (ex: 'Bearer SEU_TOKEN')
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    //  Token não fornecido
    if (token == null) {
        return res.status(401).json({ error: 'Token de acesso não fornecido.' });
    }

    // Verifica e decodifica o token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        
        // Token inválido ( assinatura incorreta)
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }
        
        // Joga o userId (que estava no payload do token) no objeto Request
        if (typeof user === 'object' && user !== null && 'userId' in user) {
             req.userId = user.userId as number;
        } else {
             // Tratamento de segurança caso o payload seja inesperado
             return res.status(403).json({ error: 'Token com formato inesperado.' });
        }

        // Continua para a função da rota
        next();
    });
};

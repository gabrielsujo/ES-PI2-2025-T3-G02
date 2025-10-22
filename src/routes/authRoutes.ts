import { Router } from "express";
import pool from '../config/db';
import bcrypt from 'bcrypt';
import { error } from "console";

const router = Router();

// --------- ROTA DE REGISTRO --------- 
router.post('/register', async (req, res) => {
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
        const novoUsuario = await pool.query (
            'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, email',
            [nome, email, senhaHash]
        );

        //responder com sucesso
        res.status(201).json(novoUsuario.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno do servidor.'});
    }
});

// --------- ROTA LOGIN ---------
router.post('/login', async (requestAnimationFrame, res) => {
    const { email, senha } = requestAnimationFrame.body;

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
            return res.status(401).json({ erroe: 'Credenciais invalidas' });// senha errada
        }

        //login de bem vindo (implementar a logica de sessão)
        res.status(200).json({
            message: 'Login realizado com sucesso!',
            userId: usuario.id,
            email: usuario.email
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.'});
    }
});

// exporte o router para usar no server
export default router;
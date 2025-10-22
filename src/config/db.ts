import 'dotenv/config'; 
import { release } from 'os';
import {Pool} from 'pg';

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 5432), 
});

pool.connect((err, client, release) =>{
    if (err) {
        return console.error('Erro ao conectar com o banco de dados', err.stack);
    }
    console.log('Conexão com o postgreSQL estabelecida com sucesso!');
    release();
})

export default pool;
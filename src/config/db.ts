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

/**
 funcao pra testar a conexao com o banco,
 o server.ts vai usar essa função pra conectar com o banco
 */
export const connectToDB = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()'); // testa a conexão
    client.release(); // volta pra pool

    console.log('✅ conexao com o PostgreSQL estabelecida com sucesso!');
  } catch (err) {
    console.error('❌ erro ao conectar com o banco de dados', err);
    process.exit(1); 
  }
};
export default pool;

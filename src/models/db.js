import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

let pool;

function handleDisconnect() {
  pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  pool.connect((err, _client, release) => {
    if (err) {
      console.error('Error al intentar conectarse a la base de datos:', err);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('Conexión a la base de datos establecida');
      release();
    }
  });

  pool.on('error', (err) => {
    console.error('Error en la conexión a la base de datos:', err);
    if (err.code === '57P01') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

export default pool;

import { createConnection } from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

let connection;

function handleDisconnect() {
  connection = createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
  });
// Intentar conectarse
  connection.connect(err => {
    if (err) {
      console.error('Error al intentar conectarse a la base de datos:', err);
      setTimeout(handleDisconnect, 2000);  // Intentar reconectar después de 2 segundos
    } else {
      console.log('Conexión a la base de datos establecida');
    }
  });
// Manejar desconexiones inesperadas
  connection.on('error', err => {
    console.error('Error en la conexión a la base de datos:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();  // Reconectar automáticamente en caso de pérdida de conexión
    } else {
      throw err;
    }
  });
}
handleDisconnect();  // Iniciar la conexión

export default connection;
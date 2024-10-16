import { createConnection } from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de la conexión
const connection = createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
});
// Intento de conexión con manejo de errores
connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log(`Conexión exitosa a la base de datos: ${process.env.DB_DATABASE}`);

    // Verificación de la base de datos seleccionada
    connection.query('SELECT DATABASE()', (err, result) => {
        if (err) {
            console.error('Error al obtener la base de datos actual:', err);
        } else {
            console.log('Base de datos actual:', result[0]['DATABASE()']);
}
    });

    connection.query('SHOW TABLES', (err, results) => {
        if (err) {
            console.error('Error en la consulta SHOW TABLES:', err);
            return;
        }
        console.log('Tablas disponibles:', results);
    });
});



export default connection;
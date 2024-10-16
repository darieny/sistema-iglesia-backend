import connection from '../models/db.js';

// Obtener todos los roles
export const getAllRoles = (req, res) => {
    const sql = 'SELECT * FROM roles';

    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener los roles:', err);
            return res.status(500).json({ error: 'Error al obtener los roles' });
        }
        res.json(results);
    });
};

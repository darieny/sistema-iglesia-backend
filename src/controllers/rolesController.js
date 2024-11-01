import pool from '../models/db.js';

export const getAllRoles = async (_req, res) => {
    const sql = 'SELECT * FROM roles';

    try {
        const { rows } = await pool.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener los roles:', err);
        res.status(500).json({ error: 'Error al obtener los roles' });
    }
};

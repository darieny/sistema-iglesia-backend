import pool from '../models/db.js';

export const ping = async (req, res) => {
    const consult = 'SELECT * FROM login';
    try {
        const { rows } = await pool.query(consult);
        console.log(rows);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).send('Error en la consulta');
        console.error(error);
    }
};

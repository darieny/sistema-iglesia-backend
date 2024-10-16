import connection from '../models/db.js';

export const ping = (req, res) => {
    const consult = 'SELECT * FROM login';
    try {
        connection.query(consult, (error, results) => {
            if (error) {
                res.status(500).send('Error en la consulta');
                console.error(error);
            } else {
                console.log(results);
                res.status(200).json(results);
            }
        });
    } catch (e) {
        res.status(500).send('Error en la ejecución');
        console.error(e);
    }
};

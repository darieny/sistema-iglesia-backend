import connection from '../models/db.js';

// Obtener todos los subministerios
export const getAllSubministerios = (req, res) => {
    const sql = 'SELECT * FROM subministerios';  // Asegúrate de que la consulta SQL sea correcta
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener los subministerios:', err);
            return res.status(500).json({ error: 'Error al obtener los subministerios' });
        }
        res.json(results);  // Asegúrate de devolver los resultados en formato JSON
    });
};

// Crear un nuevo subministerio
export const createSubministerio = (req, res) => {
    const { Nombre_Subministerio, id_ministerio, Id_Persona_Director } = req.body;

    console.log('Datos recibidos en el backend:', { Nombre_Subministerio, id_ministerio, Id_Persona_Director });

    // Verificar que los datos necesarios están presentes
    if (!Nombre_Subministerio || !id_ministerio || !Id_Persona_Director) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const sql = 'INSERT INTO subministerios (Nombre_Subministerio, id_ministerio, Id_Persona_Director) VALUES (?, ?, ?)';

    connection.query(sql, [Nombre_Subministerio, id_ministerio, Id_Persona_Director ], (err, result) => {
        if (err) {
            console.error('Error al crear subministerio:', err);
            return res.status(500).json({ error: 'Error al crear subministerio' });
        }
        res.status(201).json({ message: 'Subministerio agregado exitosamente', id: result.insertId });
    });
};

// Obtener un subministerio por ID
export const getSubministerioById = (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM subministerios WHERE Id_Subministerio = ?';

    connection.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error al obtener el subministerio:', err);
            return res.status(500).json({ error: 'Error al obtener el subministerio' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Subministerio no encontrado' });
        }

        res.json(result[0]);  // Devuelve el primer resultado
    });
};

// Buscar subministerios
export const searchSubministerios = (req, res) => {
    const search = req.query.search || '';
    const sql = `
        SELECT * FROM subministerios 
        WHERE Nombre_Subministerio LIKE ? 
    `;
    const values = [`%${search}%`];

    connection.query(sql, values, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
};

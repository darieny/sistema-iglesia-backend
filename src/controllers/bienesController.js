import connection from '../models/db.js';

// Validar si la iglesia existe
const verifyIglesiaExists = (iglesiaId, callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM iglesias WHERE Id_Iglesia = ?';
    connection.query(sql, [iglesiaId], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result[0].count > 0);
    });
};



export const getAllBienes = (req, res) => {
    const distritoId = req.query.distritoId || null;  // Si es supervisor de distrito, el frontend enviará el distritoId
    const iglesiaId = req.query.iglesiaId || null;  // Si es pastor, el frontend enviará el iglesiaId
    const userRole = req.query.userRole || '';  // El rol del usuario lo enviamos desde el frontend

    let sql = `
        SELECT bienes.*, iglesias.Nombre_Iglesia 
        FROM bienes
        LEFT JOIN iglesias ON bienes.iglesia_id_bienes = iglesias.Id_Iglesia
    `;

    // Filtro según el rol del usuario
    if (userRole.includes('Administrador')) {
        // Si es administrador, no hacemos filtro
        sql += ';';
    } else if (userRole.includes('Supervisor de Distrito')) {
        // Si es supervisor de distrito, filtramos por el distrito
        sql += ` WHERE iglesias.Id_Distrito = ${distritoId};`;
    } else if (userRole.includes('Pastor')) {
        // Si es pastor, filtramos por iglesia
        if (iglesiaId) {
            sql += ` WHERE bienes.iglesia_id_bienes = ${iglesiaId};`;
        } else {
            return res.status(200).json([]);  // Si no tiene iglesia asignada, no mostramos bienes
        }
    } else {
        return res.status(403).json({ message: 'No tienes permiso para ver los bienes' });
    }

    // Ejecutar la consulta
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener los bienes:', err);
            return res.status(500).json({ error: 'Error al obtener los bienes' });
        }
        res.json(results);
    });
};




// Obtener un bien por ID
export const getBienById = (req, res) => {
    const sql = `
        SELECT bienes.*, iglesias.Nombre_Iglesia 
        FROM bienes 
        LEFT JOIN iglesias ON bienes.iglesia_id_bienes = iglesias.Id_Iglesia 
        WHERE bienes.Id_Bienes = ?
    `;
    const id = req.params.id;
    connection.query(sql, [id], (err, result) => {
        if (err) throw err;
        res.json(result[0]);
    });
};

// Crear un nuevo bien con validaciones
export const createBien = (req, res) => {
    const { Nombre_Bienes, Tipo_Bienes, Ubicacion_Bienes, Fecha_Adquisicion, Valor_Quetzales, Descripcion, Estado_Bienes, iglesia_id_bienes } = req.body;

    // Validación del valor en quetzales
    if (Valor_Quetzales <= 0) {
        return res.status(400).json({ error: 'El valor en Quetzales debe ser un número positivo.' });
    }

    // Validación de la fecha de adquisición
    const fechaActual = new Date();
    if (new Date(Fecha_Adquisicion) > fechaActual) {
        return res.status(400).json({ error: 'La fecha de adquisición no puede ser en el futuro.' });
    }

    // Verificación de que la iglesia asignada existe
    verifyIglesiaExists(iglesia_id_bienes, (err, exists) => {
        if (err) {
            return res.status(500).json({ error: 'Error verificando la iglesia.' });
        }
        if (!exists) {
            return res.status(400).json({ error: 'La iglesia asignada no existe.' });
        }

        const sql = 'INSERT INTO bienes SET ?';
        const newBien = { Nombre_Bienes, Tipo_Bienes, Ubicacion_Bienes, Fecha_Adquisicion, Valor_Quetzales, Descripcion, Estado_Bienes, iglesia_id_bienes };

        connection.query(sql, newBien, (err, result) => {
            if (err) throw err;
            res.json({ id: result.insertId, ...newBien });
        });
    });
};

// Actualizar un bien con validaciones
export const updateBien = (req, res) => {
    const id = req.params.id;
    const { Nombre_Bienes, Tipo_Bienes, Ubicacion_Bienes, Fecha_Adquisicion, Valor_Quetzales, Descripcion, Estado_Bienes, iglesia_id_bienes } = req.body;

    // Validación del valor en quetzales
    if (Valor_Quetzales <= 0) {
        return res.status(400).json({ error: 'El valor en Quetzales debe ser un número positivo.' });
    }

    // Validación de la fecha de adquisición
    const fechaActual = new Date();
    if (new Date(Fecha_Adquisicion) > fechaActual) {
        return res.status(400).json({ error: 'La fecha de adquisición no puede ser en el futuro.' });
    }

    // Verificación de que la iglesia asignada existe
    verifyIglesiaExists(iglesia_id_bienes, (err, exists) => {
        if (err) {
            return res.status(500).json({ error: 'Error verificando la iglesia.' });
        }
        if (!exists) {
            return res.status(400).json({ error: 'La iglesia asignada no existe.' });
        }

        const sql = 'UPDATE bienes SET ? WHERE Id_Bienes = ?';
        const updatedBien = { Nombre_Bienes, Tipo_Bienes, Ubicacion_Bienes, Fecha_Adquisicion, Valor_Quetzales, Descripcion, Estado_Bienes, iglesia_id_bienes };

        connection.query(sql, [updatedBien, id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error actualizando el bien' });
            }
            res.json({ id, ...updatedBien });
        });
    });
};

// Eliminar un bien
export const deleteBien = (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM bienes WHERE Id_Bienes = ?';
    connection.query(sql, [id], (err, result) => {
        if (err) throw err;
        res.json({ message: 'Bien eliminado con éxito' });
    });
};

// Buscar bienes
export const searchBienes = (req, res) => {
    const search = req.query.search || '';
    const sql = `
        SELECT bienes.*, iglesias.Nombre_Iglesia 
        FROM bienes 
        LEFT JOIN iglesias ON bienes.iglesia_id_bienes = iglesias.Id_Iglesia 
        WHERE bienes.Nombre_Bienes LIKE ? OR bienes.Tipo_Bienes LIKE ? OR iglesias.Nombre_Iglesia LIKE ?
    `;
    const values = [`%${search}%`, `%${search}%`, `%${search}%`];

    connection.query(sql, values, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
};

import connection from '../models/db.js';

// Validar si la persona existe
const verifyPersonaExists = (personaId, callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM persona WHERE Id_Persona = ?';
    connection.query(sql, [personaId], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result[0].count > 0);
    });
};

// Listar todos los distritos
export const getAllDistritos = (req, res) => {
    const sql = 'SELECT * FROM distritos';
    connection.query(sql, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
};

// Obtener un distrito por ID
export const getDistritoById = (req, res) => {
    const sql = 'SELECT * FROM distritos WHERE Id_Distrito = ?';
    const id = req.params.id;
    connection.query(sql, [id], (err, result) => {
        if (err) throw err;
        res.json(result[0]);
    });
};

// Crear un nuevo distrito con validaciones
export const createDistrito = (req, res) => {
    const { Nombre_Distrito, persona_id_distrito } = req.body;

    // Verificación de que la persona asignada existe
    verifyPersonaExists(persona_id_distrito, (err, exists) => {
        if (err) {
            return res.status(500).json({ error: 'Error verificando la persona.' });
        }
        if (!exists) {
            return res.status(400).json({ error: 'La persona asignada no existe.' });
        }

        const sql = 'INSERT INTO distritos SET ?';
        const newDistrito = { Nombre_Distrito, persona_id_distrito };

        connection.query(sql, newDistrito, (err, result) => {
            if (err) throw err;
            res.json({ id: result.insertId, ...newDistrito });
        });
    });
};

// Actualizar un distrito con validaciones
export const updateDistrito = (req, res) => {
    const id = req.params.id;
    const { Nombre_Distrito, persona_id_distrito } = req.body;

    // Verificación de que la persona asignada existe
    verifyPersonaExists(persona_id_distrito, (err, exists) => {
        if (err) {
            return res.status(500).json({ error: 'Error verificando la persona.' });
        }
        if (!exists) {
            return res.status(400).json({ error: 'La persona asignada no existe.' });
        }

        const sql = 'UPDATE distritos SET ? WHERE Id_Distrito = ?';
        const updatedDistrito = { Nombre_Distrito, persona_id_distrito };

        connection.query(sql, [updatedDistrito, id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error actualizando el distrito' });
            }
            res.json({ id, ...updatedDistrito });
        });
    });
};

// Eliminar un distrito
export const deleteDistrito = (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM distritos WHERE Id_Distrito = ?';
    connection.query(sql, [id], (err, result) => {
        if (err) throw err;
        res.json({ message: 'Distrito eliminado con éxito' });
    });
};

// Buscar distritos por nombre o persona asignada
export const searchDistritos = (req, res) => {
    const search = req.query.search || '';
    const sql = `
        SELECT distritos.*, persona.Nombre_Persona
        FROM distritos 
        LEFT JOIN persona ON distritos.persona_id_distrito = persona.Id_Persona
        WHERE distritos.Nombre_Distrito LIKE ? OR persona.Nombre_Persona LIKE ?
    `;
    const values = [`%${search}%`, `%${search}%`];

    connection.query(sql, values, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
};

// Obtener los reportes de un distrito por ID
export const getReportesByDistrito = (req, res) => {
    const id = req.params.id;
    const sql = `
        SELECT reportes.*, persona.Nombre_Persona, ministerios.Nombre_Ministerio
        FROM reportes
        JOIN persona ON reportes.persona_id_reporte = persona.Id_Persona
        JOIN ministerios ON reportes.ministerio_id_reporte = ministerios.Id_Ministerio
        WHERE reportes.distrito_id_reporte = ?
    `;

    connection.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error obteniendo reportes del distrito.' });
        }
        res.json(result);
    });
};




// Obtener datos de un distrito (número de iglesias, pastores, ministerios y ministros ordenados)
export const getDistritoData = (req, res) => {
    const sql = `
        SELECT 
            d.Id_Distrito, 
            d.Nombre_Distrito,
            (SELECT COUNT(*) FROM iglesias WHERE iglesias.Id_Distrito = d.Id_Distrito) AS num_iglesias,
            (SELECT COUNT(DISTINCT p.Id_Persona) 
                FROM persona p 
                JOIN cargo_persona cp ON p.Id_Persona = cp.Id_Persona 
                JOIN cargo c ON cp.Id_Cargo = c.Id_Cargo 
                WHERE c.Nombre_Cargo = 'Pastor' AND p.Id_Distrito = d.Id_Distrito) AS num_pastores,
            (SELECT COUNT(*) FROM ministerios WHERE ministerios.Id_Distrito = d.Id_Distrito) AS num_ministerios,
            (SELECT COUNT(DISTINCT p.Id_Persona) 
                FROM persona p 
                JOIN ministrosordenados mo ON p.Id_Persona = mo.Persona_Id_Ministros 
                WHERE p.Id_Distrito = d.Id_Distrito) AS num_ministros_ordenados
        FROM distritos d
        WHERE d.Nombre_Distrito != 'Área General'

        UNION ALL

        SELECT 
            3 AS Id_Distrito, 
            'Área General' AS Nombre_Distrito,
            SUM(iglesias_count) AS num_iglesias,
            SUM(pastores_count) AS num_pastores,
            SUM(ministerios_count) AS num_ministerios,
            SUM(ministros_count) AS num_ministros_ordenados
        FROM (
            SELECT 
                (SELECT COUNT(*) FROM iglesias WHERE iglesias.Id_Distrito = d.Id_Distrito) AS iglesias_count,
                (SELECT COUNT(DISTINCT p.Id_Persona) 
                    FROM persona p 
                    JOIN cargo_persona cp ON p.Id_Persona = cp.Id_Persona 
                    JOIN cargo c ON cp.Id_Cargo = c.Id_Cargo 
                    WHERE c.Nombre_Cargo = 'Pastor' AND p.Id_Distrito = d.Id_Distrito) AS pastores_count,
                (SELECT COUNT(*) FROM ministerios WHERE ministerios.Id_Distrito = d.Id_Distrito) AS ministerios_count,
                (SELECT COUNT(DISTINCT p.Id_Persona) 
                    FROM persona p 
                    JOIN ministrosordenados mo ON p.Id_Persona = mo.Persona_Id_Ministros 
                    WHERE p.Id_Distrito = d.Id_Distrito) AS ministros_count
            FROM distritos d
            WHERE d.Id_Distrito IN (1, 2)
        ) AS suma;
    `;

    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error obteniendo datos de los distritos:', err);
            return res.status(500).json({ error: 'Error obteniendo datos de los distritos.' });
        }
        res.json(result); // Enviar el resultado como respuesta
    });
};

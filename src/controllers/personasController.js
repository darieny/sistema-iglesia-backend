import multer from 'multer';
import pool from '../models/db.js'; // Cambié connection por pool para PostgreSQL

// Multer para almacenar las fotos en una carpeta llamada "fotosPerfil"
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'fotosPerfil/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

export const upload = multer({ storage });

// Listar todas las personas con sus cargos
export const getAllPersonas = (req, res) => {
    const sql = `
        SELECT persona.*, iglesias."Nombre_Iglesia", STRING_AGG(cargo."Nombre_Cargo", ', ') AS "Cargos"
        FROM persona
        LEFT JOIN iglesias ON persona."id_iglesia" = iglesias."Id_Iglesia"
        LEFT JOIN cargo_persona cp ON persona."Id_Persona" = cp."Id_Persona"
        LEFT JOIN cargo ON cp."Id_Cargo" = cargo."Id_Cargo"
        GROUP BY persona."Id_Persona"
    `;
    pool.query(sql, (err, result) => {
        if (err) {
            console.error('Error al obtener personas:', err);
            return res.status(500).json({ error: 'Error al obtener personas' });
        }
        res.json(result.rows);
    });
};

// Obtener una persona por ID
export const getPersonaById = (req, res) => {
    const id = req.params.id;
    const sql = `
        SELECT persona.*, 
               iglesias."Nombre_Iglesia", 
               distritos."Nombre_Distrito", 
               STRING_AGG(cargo."Nombre_Cargo", ', ') AS "Cargos"
        FROM persona
        LEFT JOIN iglesias ON persona."id_iglesia" = iglesias."Id_Iglesia"
        LEFT JOIN distritos ON persona."Id_Distrito" = distritos."Id_Distrito"
        LEFT JOIN cargo_persona cp ON persona."Id_Persona" = cp."Id_Persona"
        LEFT JOIN cargo ON cp."Id_Cargo" = cargo."Id_Cargo"
        WHERE persona."Id_Persona" = $1
        GROUP BY persona."Id_Persona";
    `;

    pool.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error al obtener persona por ID:', err);
            return res.status(500).json({ error: 'Error al obtener persona por ID' });
        }
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Persona no encontrada' });
        }

        res.json(result.rows[0]);
    });
};

// Obtener personas por id_iglesia (para verificar si ya hay un pastor asignado)
export const getPersonasByIglesiaId = (req, res) => {
    const { id_iglesia } = req.query;
    if (!id_iglesia) {
        return res.status(400).json({ error: 'id_iglesia es obligatorio' });
    }

    const sql = `
        SELECT persona.*, STRING_AGG(cargo."Nombre_Cargo", ', ') AS "Cargos"
        FROM persona
        LEFT JOIN cargo_persona cp ON persona."Id_Persona" = cp."Id_Persona"
        LEFT JOIN cargo ON cp."Id_Cargo" = cargo."Id_Cargo"
        WHERE persona."id_iglesia" = $1 AND cargo."Nombre_Cargo" = 'Pastor'
        GROUP BY persona."Id_Persona";
    `;
    pool.query(sql, [id_iglesia], (err, result) => {
        if (err) {
            console.error('Error obteniendo personas por id_iglesia:', err);
            return res.status(500).json({ error: 'Error obteniendo personas' });
        }
        res.json(result.rows);
    });
};

// Obtener los IDs de los cargos según los nombres
const getCargosIds = (cargos, callback) => {
    const sql = `SELECT "Id_Cargo" FROM cargo WHERE "Nombre_Cargo" = ANY($1)`;
    pool.query(sql, [cargos], (err, result) => {
        if (err) {
            console.error('Error obteniendo IDs de cargos:', err);
            return callback(err);
        }
        const cargosIds = result.rows.map(cargo => cargo.Id_Cargo);
        callback(null, cargosIds);
    });
};

// Crear una nueva persona
export const createPersona = (req, res) => {
    const { Nombre_Persona, Telefono_Persona, Direccion_Persona, Fecha_Nacimiento, cargos, ministerios, id_iglesia, Id_Distrito } = req.body;
    const foto = req.file ? `/fotosPerfil/${req.file.filename}` : null;

    const newPersona = {
        Nombre_Persona,
        Telefono_Persona,
        Direccion_Persona,
        Fecha_Nacimiento,
        Foto_Persona: foto,
        id_iglesia: id_iglesia || null,
        Id_Distrito: Id_Distrito || null
    };

    const sqlInsertPersona = `
        INSERT INTO persona ("Nombre_Persona", "Telefono_Persona", "Direccion_Persona", "Fecha_Nacimiento", "Foto_Persona", "id_iglesia", "Id_Distrito")
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "Id_Persona";
    `;
    const values = [
        newPersona.Nombre_Persona, newPersona.Telefono_Persona, newPersona.Direccion_Persona,
        newPersona.Fecha_Nacimiento, newPersona.Foto_Persona, newPersona.id_iglesia, newPersona.Id_Distrito
    ];

    pool.query(sqlInsertPersona, values, (err, result) => {
        if (err) {
            console.error('Error creando la persona:', err);
            return res.status(500).json({ error: 'Error creando la persona.' });
        }

        const personaId = result.rows[0].Id_Persona;
        processCargosAndMinisterios(personaId, cargos, ministerios, res, newPersona);
    });
};

// Helper para procesar cargos y ministerios
const processCargosAndMinisterios = (personaId, cargos, ministerios, res, newPersona) => {
    if (cargos.length > 0) {
        getCargosIds(cargos, (err, cargoIds) => {
            if (err) {
                console.error('Error obteniendo IDs de cargos:', err);
                return res.status(500).json({ error: 'Error obteniendo IDs de cargos.' });
            }

            const sqlInsertCargos = 'INSERT INTO cargo_persona ("Id_Persona", "Id_Cargo") VALUES ($1, $2)';
            const cargoValues = cargoIds.map((cargoId) => [personaId, cargoId]);

            pool.query(sqlInsertCargos, [cargoValues], (err) => {
                if (err) {
                    console.error('Error asignando cargos:', err);
                    return res.status(500).json({ error: 'Error asignando los cargos.' });
                }
                assignMinisterios(personaId, ministerios, res, newPersona);
            });
        });
    } else {
        assignMinisterios(personaId, ministerios, res, newPersona);
    }
};

// Asignar ministerios a la persona
const assignMinisterios = (personaId, ministerios, res, newPersona) => {
    if (ministerios.length > 0) {
        const sqlInsertMinisterios = 'INSERT INTO persona_ministerio ("Id_Persona", "Id_Ministerio") VALUES ($1, $2)';
        const ministerioValues = ministerios.map(ministerioId => [personaId, ministerioId]);

        pool.query(sqlInsertMinisterios, [ministerioValues], (err) => {
            if (err) {
                console.error('Error asignando ministerios:', err);
                return res.status(500).json({ error: 'Error asignando ministerios.' });
            }
            res.json({ id: personaId, ...newPersona });
        });
    } else {
        res.json({ id: personaId, ...newPersona });
    }
};

// Actualizar una persona
export const updatePersona = (req, res) => {
    const id = req.params.id;
    const { Nombre_Persona, Telefono_Persona, Direccion_Persona, Fecha_Nacimiento, cargos, ministerios, id_iglesia, Id_Distrito } = req.body;

    const updatedPersona = {};
    if (Nombre_Persona) updatedPersona.Nombre_Persona = Nombre_Persona;
    if (Telefono_Persona) updatedPersona.Telefono_Persona = Telefono_Persona;
    if (Direccion_Persona) updatedPersona.Direccion_Persona = Direccion_Persona;
    if (Fecha_Nacimiento) updatedPersona.Fecha_Nacimiento = Fecha_Nacimiento;
    if (id_iglesia) updatedPersona.id_iglesia = id_iglesia;
    if (Id_Distrito) updatedPersona.Id_Distrito = Id_Distrito;

    const sqlUpdatePersona = 'UPDATE persona SET $1 WHERE "Id_Persona" = $2';
    pool.query(sqlUpdatePersona, [updatedPersona, id], (err) => {
        if (err) {
            console.error('Error actualizando la persona:', err);
            return res.status(500).json({ error: 'Error actualizando la persona.' });
        }
        updateCargosAndMinisterios(id, cargos, ministerios, res, updatedPersona);
    });
};

// Eliminar una persona
export const deletePersona = (req, res) => {
    const id = req.params.id;
    const sqlDeletePersona = 'DELETE FROM persona WHERE "Id_Persona" = $1';
    pool.query(sqlDeletePersona, [id], (err, result) => {
        if (err) {
            console.error('Error eliminando persona:', err);
            return res.status(500).json({ error: 'Error eliminando la persona.' });
        }
        res.json({ message: 'Persona eliminada con éxito' });
    });
};

// Buscar personas
export const searchPersonas = (req, res) => {
    const search = req.query.search || '';
    const sql = `
        SELECT persona.*, iglesias."Nombre_Iglesia", STRING_AGG(cargo."Nombre_Cargo", ', ') AS "Cargos"
        FROM persona
        LEFT JOIN iglesias ON persona."id_iglesia" = iglesias."Id_Iglesia"
        LEFT JOIN cargo_persona cp ON persona."Id_Persona" = cp."Id_Persona"
        LEFT JOIN cargo ON cp."Id_Cargo" = cargo."Id_Cargo"
        WHERE persona."Nombre_Persona" ILIKE $1 OR persona."Direccion_Persona" ILIKE $1 OR cargo."Nombre_Cargo" ILIKE $1 OR persona."Telefono_Persona" ILIKE $1
        GROUP BY persona."Id_Persona";
    `;
    const values = [`%${search}%`];
    pool.query(sql, values, (err, result) => {
        if (err) throw err;
        res.json(result.rows);
    });
};

// Obtener el Persona_Id desde el Usuario_ID
export const getPersonaByUsuarioId = (req, res) => {
    const { Usuario_ID } = req.params;
    const sql = 'SELECT "Id_Persona" FROM persona WHERE "Usuario_ID" = $1';
    pool.query(sql, [Usuario_ID], (err, result) => {
        if (err) {
            console.error('Error al obtener Persona_Id:', err);
            return res.status(500).json({ error: 'Error al obtener Persona_Id' });
        }
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró Persona_Id para el Usuario_ID' });
        }
        res.json({ Persona_Id: result.rows[0].Id_Persona });
    });
};

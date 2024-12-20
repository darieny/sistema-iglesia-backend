import multer from 'multer';
import pool from '../models/db.js';

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
        SELECT persona.*, iglesias.nombre_iglesia, STRING_AGG(cargo.nombre_cargo, ', ') AS cargos
        FROM persona
        LEFT JOIN iglesias ON persona.id_iglesia = iglesias.id_iglesia
        LEFT JOIN cargo_persona cp ON persona.id_persona = cp.id_persona
        LEFT JOIN cargo ON cp.id_cargo = cargo.id_cargo
        GROUP BY persona.id_persona, iglesias.nombre_iglesia;
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
               iglesias.nombre_iglesia, 
               distritos.nombre_distrito, 
               STRING_AGG(cargo.nombre_cargo, ', ') AS cargos
        FROM persona
        LEFT JOIN iglesias ON persona.id_iglesia = iglesias.id_iglesia
        LEFT JOIN distritos ON persona.id_distrito = distritos.id_distrito
        LEFT JOIN cargo_persona cp ON persona.id_persona = cp.id_persona
        LEFT JOIN cargo ON cp.id_cargo = cargo.id_cargo
        WHERE persona.id_persona = $1
        GROUP BY persona.id_persona, iglesias.nombre_iglesia, distritos.nombre_distrito;
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
        SELECT persona.*, STRING_AGG(cargo.nombre_cargo, ', ') AS cargos
        FROM persona
        LEFT JOIN cargo_persona cp ON persona.id_persona = cp.id_persona
        LEFT JOIN cargo ON cp.id_cargo = cargo.id_cargo
        WHERE persona.id_iglesia = $1 AND cargo.nombre_cargo = 'Pastor'
        GROUP BY persona.id_persona;
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
    const sql = `SELECT id_cargo FROM cargo WHERE nombre_cargo = ANY($1)`;
    pool.query(sql, [cargos], (err, result) => {
        if (err) {
            console.error('Error obteniendo IDs de cargos:', err);
            return callback(err);
        }
        const cargosIds = result.rows.map(cargo => cargo.id_cargo);
        callback(null, cargosIds);
    });
};

// Crear una nueva persona
export const createPersona = (req, res) => {
    const { nombre_persona, telefono_persona, direccion_persona, fecha_nacimiento, cargos, ministerios, id_iglesia, id_distrito } = req.body;
    const foto = req.file ? `/fotosPerfil/${req.file.filename}` : null;

    const newPersona = {
        nombre_persona,
        telefono_persona,
        direccion_persona,
        fecha_nacimiento,
        foto_persona: foto,
        id_iglesia: id_iglesia || null,
        id_distrito: id_distrito || null
    };

    const sqlInsertPersona = `
        INSERT INTO persona (nombre_persona, telefono_persona, direccion_persona, fecha_nacimiento, foto_persona, id_iglesia, id_distrito)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_persona;
    `;
    const values = [
        newPersona.nombre_persona, newPersona.telefono_persona, newPersona.direccion_persona,
        newPersona.fecha_nacimiento, newPersona.foto_persona, newPersona.id_iglesia, newPersona.id_distrito
    ];

    pool.query(sqlInsertPersona, values, (err, result) => {
        if (err) {
            console.error('Error creando la persona:', err);
            return res.status(500).json({ error: 'Error creando la persona.' });
        }

        const personaId = result.rows[0].id_persona;
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

            const sqlInsertCargos = 'INSERT INTO cargo_persona (id_persona, id_cargo) VALUES ($1, $2)';

            const queries = cargoIds.map((cargoId) => {
                return pool.query(sqlInsertCargos, [personaId, cargoId]);
            });

            Promise.all(queries)
                .then(() => {
                    assignMinisterios(personaId, ministerios, res, newPersona);
                })
                .catch((err) => {
                    console.error('Error asignando cargos:', err);
                    res.status(500).json({ error: 'Error asignando los cargos.' });
                });
        });
    } else {
        assignMinisterios(personaId, ministerios, res, newPersona);
    }
};


// Asignar ministerios a la persona
const assignMinisterios = (personaId, ministerios, res, newPersona) => {
    if (ministerios.length > 0) {
        const sqlInsertMinisterios = 'INSERT INTO persona_ministerio (id_persona, id_ministerio) VALUES ($1, $2)';

        const queries = ministerios.map((ministerioId) => {
            return pool.query(sqlInsertMinisterios, [personaId, ministerioId]);
        });

        Promise.all(queries)
            .then(() => {
                res.json({ id: personaId, ...newPersona });
            })
            .catch((err) => {
                console.error('Error asignando ministerios:', err);
                res.status(500).json({ error: 'Error asignando ministerios.' });
            });
    } else {
        res.json({ id: personaId, ...newPersona });
    }
};


// Actualizar una persona
export const updatePersona = (req, res) => {
    const id = req.params.id;
    const { nombre_persona, telefono_persona, direccion_persona, fecha_nacimiento, cargos, ministerios, id_iglesia, id_distrito } = req.body;

    const updatedPersona = {};
    if (nombre_persona) updatedPersona.nombre_persona = nombre_persona;
    if (telefono_persona) updatedPersona.telefono_persona = telefono_persona;
    if (direccion_persona) updatedPersona.direccion_persona = direccion_persona;
    if (fecha_nacimiento) updatedPersona.fecha_nacimiento = fecha_nacimiento;
    if (id_iglesia) updatedPersona.id_iglesia = id_iglesia;
    if (id_distrito) updatedPersona.id_distrito = id_distrito;

    // Construir dinámicamente la parte de "SET" de la consulta
    const setClause = Object.keys(updatedPersona)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(', ');

    const values = Object.values(updatedPersona);
    values.push(id); // Agregar el id como el último valor

    const sqlUpdatePersona = `UPDATE persona SET ${setClause} WHERE id_persona = $${values.length}`;

    pool.query(sqlUpdatePersona, values, (err) => {
        if (err) {
            console.error('Error actualizando la persona:', err);
            return res.status(500).json({ error: 'Error actualizando la persona.' });
        }
        updateCargosAndMinisterios(id, cargos, ministerios, res, updatedPersona);
    });
};

const updateCargosAndMinisterios = (personaId, cargos, ministerios, res, updatedPersona) => {
    // Eliminar cargos existentes
    const sqlDeleteCargos = 'DELETE FROM cargo_persona WHERE id_persona = $1';
    pool.query(sqlDeleteCargos, [personaId], (err) => {
        if (err) {
            console.error('Error eliminando cargos existentes:', err);
            return res.status(500).json({ error: 'Error eliminando los cargos existentes.' });
        }

        if (cargos.length > 0) {
            getCargosIds(cargos, (err, cargoIds) => {
                if (err) {
                    console.error('Error obteniendo IDs de cargos:', err);
                    return res.status(500).json({ error: 'Error obteniendo IDs de cargos.' });
                }

                const sqlInsertCargos = 'INSERT INTO cargo_persona (id_persona, id_cargo) VALUES ($1, $2)';
                const queries = cargoIds.map((cargoId) => {
                    return pool.query(sqlInsertCargos, [personaId, cargoId]);
                });

                Promise.all(queries)
                    .then(() => {
                        updateMinisterios(personaId, ministerios, res, updatedPersona);
                    })
                    .catch((err) => {
                        console.error('Error asignando cargos:', err);
                        res.status(500).json({ error: 'Error asignando los cargos.' });
                    });
            });
        } else {
            updateMinisterios(personaId, ministerios, res, updatedPersona);
        }
    });
};

// Actualizar ministerios de la persona
const updateMinisterios = (personaId, ministerios, res, updatedPersona) => {
    // Eliminar ministerios existentes
    const sqlDeleteMinisterios = 'DELETE FROM persona_ministerio WHERE id_persona = $1';
    pool.query(sqlDeleteMinisterios, [personaId], (err) => {
        if (err) {
            console.error('Error eliminando ministerios existentes:', err);
            return res.status(500).json({ error: 'Error eliminando los ministerios existentes.' });
        }

        if (ministerios.length > 0) {
            const sqlInsertMinisterios = 'INSERT INTO persona_ministerio (id_persona, id_ministerio) VALUES ($1, $2)';
            const queries = ministerios.map((ministerioId) => {
                return pool.query(sqlInsertMinisterios, [personaId, ministerioId]);
            });

            Promise.all(queries)
                .then(() => {
                    res.json({ id: personaId, ...updatedPersona });
                })
                .catch((err) => {
                    console.error('Error asignando ministerios:', err);
                    res.status(500).json({ error: 'Error asignando ministerios.' });
                });
        } else {
            res.json({ id: personaId, ...updatedPersona });
        }
    });
};


// Eliminar una persona
export const deletePersona = (req, res) => {
    const id = req.params.id;

    // Obtener el usuario_id de la persona
    const sqlGetUsuarioId = 'SELECT usuario_id FROM persona WHERE id_persona = $1';
    pool.query(sqlGetUsuarioId, [id], (err, result) => {
        if (err) {
            console.error('Error obteniendo usuario_id:', err);
            return res.status(500).json({ error: 'Error obteniendo usuario_id.' });
        }

        const usuario_id = result.rows[0]?.usuario_id;

        // Si no hay usuario_id, eliminar directamente cargo_persona y persona_ministerio, luego persona
        if (!usuario_id) {
            // Eliminar asociaciones en cargo_persona
            const deleteCargosSql = 'DELETE FROM cargo_persona WHERE id_persona = $1';
            pool.query(deleteCargosSql, [id], (err) => {
                if (err) {
                    console.error('Error eliminando cargos asociados:', err);
                    return res.status(500).json({ error: 'Error eliminando cargos asociados.' });
                }

                // Eliminar asociaciones en persona_ministerio
                const deleteMinisteriosSql = 'DELETE FROM persona_ministerio WHERE id_persona = $1';
                pool.query(deleteMinisteriosSql, [id], (err) => {
                    if (err) {
                        console.error('Error eliminando ministerios asociados:', err);
                        return res.status(500).json({ error: 'Error eliminando ministerios asociados.' });
                    }

                    // Finalmente, eliminar la persona
                    const deletePersonaSql = 'DELETE FROM persona WHERE id_persona = $1';
                    pool.query(deletePersonaSql, [id], (err) => {
                        if (err) {
                            console.error('Error eliminando persona:', err);
                            return res.status(500).json({ error: 'Error eliminando la persona.' });
                        }
                        res.json({ message: 'Persona eliminada con éxito' });
                    });
                });
            });
        } else {
            // Si hay usuario_id, seguir la eliminación en orden de referencias
            // 1. Eliminar roles en rolesusuarios
            const deleteRolesSql = 'DELETE FROM rolesusuarios WHERE id_usuarios = $1';
            pool.query(deleteRolesSql, [usuario_id], (err) => {
                if (err) {
                    console.error('Error eliminando roles asociados:', err);
                    return res.status(500).json({ error: 'Error eliminando roles asociados.' });
                }

                // 2. Eliminar el login
                const deleteLoginSql = 'DELETE FROM login WHERE id_usuarios = $1';
                pool.query(deleteLoginSql, [usuario_id], (err) => {
                    if (err) {
                        console.error('Error eliminando login:', err);
                        return res.status(500).json({ error: 'Error eliminando login.' });
                    }

                    // 3. Desvincular reportes (NULL en persona_id)
                    const updateReportesSql = 'UPDATE reportesmensuales SET persona_id = NULL WHERE persona_id = $1';
                    pool.query(updateReportesSql, [id], (err) => {
                        if (err) {
                            console.error('Error desvinculando reportes asociados:', err);
                            return res.status(500).json({ error: 'Error desvinculando reportes asociados.' });
                        }

                        // 4. Eliminar asociaciones en cargo_persona
                        const deleteCargosSql = 'DELETE FROM cargo_persona WHERE id_persona = $1';
                        pool.query(deleteCargosSql, [id], (err) => {
                            if (err) {
                                console.error('Error eliminando cargos asociados:', err);
                                return res.status(500).json({ error: 'Error eliminando cargos asociados.' });
                            }

                            // 5. Eliminar asociaciones en persona_ministerio
                            const deleteMinisteriosSql = 'DELETE FROM persona_ministerio WHERE id_persona = $1';
                            pool.query(deleteMinisteriosSql, [id], (err) => {
                                if (err) {
                                    console.error('Error eliminando ministerios asociados:', err);
                                    return res.status(500).json({ error: 'Error eliminando ministerios asociados.' });
                                }

                                // 6. Finalmente, eliminar la persona
                                const deletePersonaSql = 'DELETE FROM persona WHERE id_persona = $1';
                                pool.query(deletePersonaSql, [id], (err) => {
                                    if (err) {
                                        console.error('Error eliminando persona:', err);
                                        return res.status(500).json({ error: 'Error eliminando la persona.' });
                                    }
                                    res.json({ message: 'Persona eliminada con éxito' });
                                });
                            });
                        });
                    });
                });
            });
        }
    });
};








// Buscar personas
export const searchPersonas = (req, res) => {
    const search = req.query.search || '';
    const sql = `
        SELECT persona.*, iglesias.nombre_iglesia, STRING_AGG(cargo.nombre_cargo, ', ') AS cargos
        FROM persona
        LEFT JOIN iglesias ON persona.id_iglesia = iglesias.id_iglesia
        LEFT JOIN cargo_persona cp ON persona.id_persona = cp.id_persona
        LEFT JOIN cargo ON cp.id_cargo = cargo.id_cargo
        WHERE persona.nombre_persona ILIKE $1 OR persona.direccion_persona ILIKE $1 OR cargo.nombre_cargo ILIKE $1 OR persona.telefono_persona ILIKE $1
        GROUP BY persona.id_persona;
    `;
    const values = [`%${search}%`];
    pool.query(sql, values, (err, result) => {
        if (err) throw err;
        res.json(result.rows);
    });
};

// Obtener el Persona_Id desde el Usuario_ID
export const getPersonaByUsuarioId = (req, res) => {
    const { usuario_id } = req.params;
    const sql = 'SELECT id_persona FROM persona WHERE usuario_id = $1';
    pool.query(sql, [usuario_id], (err, result) => {
        if (err) {
            console.error('Error al obtener Persona_Id:', err);
            return res.status(500).json({ error: 'Error al obtener Persona_Id' });
        }
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró Persona_Id para el Usuario_ID' });
        }
        res.json({ id_persona: result.rows[0].id_persona });
    });
};

import multer from 'multer';
import connection from '../models/db.js';

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
        SELECT persona.*, iglesias.Nombre_Iglesia, GROUP_CONCAT(cargo.Nombre_Cargo) AS Cargos
        FROM persona
        LEFT JOIN iglesias ON persona.id_iglesia = iglesias.Id_Iglesia
        LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
        LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo
        GROUP BY persona.Id_Persona
    `;
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error al obtener personas:', err);
            throw err;
        }
        res.json(result);
    });
};






// Obtener una persona por ID
export const getPersonaById = (req, res) => {
    const id = req.params.id;
    const sql = `
    SELECT persona.*, 
           iglesias.Nombre_Iglesia, 
           distritos.Nombre_Distrito, 
           GROUP_CONCAT(cargo.Nombre_Cargo) AS Cargos
    FROM persona
    LEFT JOIN iglesias ON persona.id_iglesia = iglesias.Id_Iglesia
    LEFT JOIN distritos ON persona.id_distrito = distritos.Id_Distrito
    LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
    LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo
    WHERE persona.Id_Persona = ?
    GROUP BY persona.Id_Persona;
`;

    connection.query(sql, [id], (err, result) => {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({ message: 'Persona no encontrada' });
        }

        res.json(result[0]);
    });
};






// Obtener personas por id_iglesia (para verificar si ya hay un pastor asignado)
export const getPersonasByIglesiaId = (req, res) => {
    const { id_iglesia } = req.query;
    if (!id_iglesia) {
        return res.status(400).json({ error: 'id_iglesia es obligatorio' });
    }

    const sql = `
        SELECT persona.*, GROUP_CONCAT(cargo.Nombre_Cargo) AS Cargos
        FROM persona
        LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
        LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo
        WHERE persona.id_iglesia = ? AND cargo.Nombre_Cargo = 'Pastor'
    `;
    connection.query(sql, [id_iglesia], (err, result) => {
        if (err) {
            console.error('Error obteniendo personas por id_iglesia:', err);
            return res.status(500).json({ error: 'Error obteniendo personas' });
        }
        res.json(result);
    });
};

// Obtener los IDs de los cargos según los nombres
const getCargosIds = (cargos, callback) => {
    const sql = `SELECT Id_Cargo FROM cargo WHERE Nombre_Cargo IN (?)`;
    connection.query(sql, [cargos], (err, result) => {
        if (err) {
            console.error('Error obteniendo IDs de cargos:', err);
            return callback(err); // Llamar a la callback con error
        }
        const cargosIds = result.map(cargo => cargo.Id_Cargo);
        callback(null, cargosIds); // Llamar a la callback con éxito y devolver los IDs
    });
};





// Crear una nueva persona
export const createPersona = (req, res) => {
    const { Nombre_Persona, Telefono_Persona, Direccion_Persona, Fecha_Nacimiento, cargos, ministerios, id_iglesia, Id_Distrito } = req.body;
    
    console.log('Datos recibidos:', { Nombre_Persona, Telefono_Persona, Direccion_Persona, Fecha_Nacimiento, cargos });
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

    // Procesar los cargos: Verificar si es un JSON o una cadena separada por comas
    let cargosArray;
    try {
        // Intentamos parsear como JSON
        cargosArray = JSON.parse(cargos);
    } catch (error) {
        // Si no es un JSON válido, lo tratamos como una cadena separada por comas
        cargosArray = cargos.includes(',') ? cargos.split(',') : [cargos];
    }
    console.log("Cargos procesados:", cargosArray);

    // Crear la persona primero
    const sqlInsertPersona = 'INSERT INTO persona SET ?';
    connection.query(sqlInsertPersona, newPersona, (err, result) => {
        if (err) {
            console.error('Error creando la persona:', err);
            return res.status(500).json({ error: 'Error creando la persona.' });
        }

        const personaId = result.insertId;

        // Procesar los cargos seleccionados
        if (cargosArray.length > 0) {
            // Obtener los IDs de los cargos desde la base de datos
            getCargosIds(cargosArray, (err, cargoIds) => {
                if (err) {
                    console.error('Error obteniendo IDs de cargos:', err);
                    return res.status(500).json({ error: 'Error obteniendo IDs de cargos.' });
                }

                const sqlInsertCargos = 'INSERT INTO cargo_persona (Id_Persona, Id_Cargo) VALUES ?';
                const cargoValues = cargoIds.map((cargoId) => [personaId, cargoId]);

                connection.query(sqlInsertCargos, [cargoValues], (err) => {
                    if (err) {
                        console.error('Error asignando cargos:', err);
                        return res.status(500).json({ error: 'Error asignando los cargos.' });
                    }

                    // Asignar ministerios después de los cargos
                    if (ministerios && ministerios.length > 0) {
                        const sqlInsertMinisterios = 'INSERT INTO persona_ministerio (Id_Persona, Id_Ministerio) VALUES ?';
                        const ministerioValues = ministerios.map(ministerioId => [personaId, ministerioId]);

                        connection.query(sqlInsertMinisterios, [ministerioValues], (err) => {
                            if (err) {
                                console.error('Error asignando ministerios:', err);
                                return res.status(500).json({ error: 'Error asignando ministerios.' });
                            }
                            res.json({ id: personaId, ...newPersona });
                        });
                    } else {
                        res.json({ id: personaId, ...newPersona });
                    }
                });
            });
        } else {
            res.json({ id: personaId, ...newPersona });
        }
    });
};





// Actualizar una persona
export const updatePersona = (req, res) => {
    const id = req.params.id;
    const { Nombre_Persona, Telefono_Persona, Direccion_Persona, Fecha_Nacimiento, cargos, ministerios, id_iglesia, Id_Distrito } = req.body;
    const foto = req.file ? `/fotosPerfil/${req.file.filename}` : req.body.Foto_Persona;

    console.log('Datos recibidos para actualización:', {
        cargos,
        ministerios,
        Id_Distrito,
    })
    const updatedPersona = {
        Nombre_Persona,
        Telefono_Persona,
        Direccion_Persona,
        Fecha_Nacimiento,
        Foto_Persona: foto,
        id_iglesia: id_iglesia || null,
        Id_Distrito: Id_Distrito || null // Asegurarse de incluir Id_Distrito
    };

    let cargosArray = [];
    let ministeriosArray = [];

    try {
        cargosArray = typeof cargos === 'string' ? JSON.parse(cargos) : cargos;
    } catch (error) {
        cargosArray = Array.isArray(cargos) ? cargos : [cargos];
    }

    try {
        ministeriosArray = typeof ministerios === 'string' ? JSON.parse(ministerios) : ministerios;
    } catch (error) {
        ministeriosArray = Array.isArray(ministerios) ? ministerios : [ministerios];
    }

    console.log('Cargos recibidos para actualización:', cargosArray);
    console.log('Ministerios recibidos para actualización:', ministeriosArray);

    const sqlUpdatePersona = 'UPDATE persona SET ? WHERE Id_Persona = ?';
    connection.query(sqlUpdatePersona, [updatedPersona, id], (err) => {
        if (err) {
            console.error('Error actualizando la persona:', err);
            return res.status(500).json({ error: 'Error actualizando la persona.' });
        }

        const sqlDeleteCargos = 'DELETE FROM cargo_persona WHERE Id_Persona = ?';
        connection.query(sqlDeleteCargos, [id], (err) => {
            if (err) {
                console.error('Error eliminando los cargos:', err);
                return res.status(500).json({ error: 'Error eliminando los cargos anteriores.' });
            }

            // Obtener los IDs de los nuevos cargos
            getCargosIds(cargosArray, (err, cargoIds) => {
                if (err) {
                    console.error('Error obteniendo IDs de cargos:', err);
                    return res.status(500).json({ error: 'Error obteniendo IDs de cargos.' });
                }

                const sqlInsertCargos = 'INSERT INTO cargo_persona (Id_Persona, Id_Cargo) VALUES ?';
                const cargoValues = cargoIds.map((cargoId) => [id, cargoId]);
                console.log('Cargos que se van a insertar:', cargoValues);

                if (cargoValues.length > 0) {
                    connection.query(sqlInsertCargos, [cargoValues], (err) => {
                        if (err) {
                            console.error('Error asignando los nuevos cargos:', err);
                            return res.status(500).json({ error: 'Error asignando los nuevos cargos.' });
                        }

                        // Eliminar ministerios anteriores y asignar los nuevos
                        const sqlDeleteMinisterios = 'DELETE FROM persona_ministerio WHERE Id_Persona = ?';
                        connection.query(sqlDeleteMinisterios, [id], (err) => {
                            if (err) {
                                console.error('Error eliminando ministerios anteriores:', err);
                                return res.status(500).json({ error: 'Error eliminando ministerios anteriores.' });
                            }

                            if (ministeriosArray.length > 0) {
                                const sqlGetMinisterioIds = `
                                    SELECT Id_Ministerio 
                                    FROM ministerios 
                                    WHERE Nombre_Ministerio = ? AND (Id_Distrito = ? OR Id_Distrito IS NULL)
                                `;
                                
                                const ministerioQueries = ministeriosArray.map((ministerio) => {
                                    const [nombreMinisterio] = ministerio.split(' - Distrito '); // Usamos solo el nombre sin el distrito
                                    
                                    console.log(`Buscando Ministerio: ${nombreMinisterio} en Distrito: ${Id_Distrito}`);

                                    return new Promise((resolve, reject) => {
                                        const distritoValue = Id_Distrito ? Number(Id_Distrito) : null;
                                        connection.query(sqlGetMinisterioIds, [nombreMinisterio, distritoValue], (err, result) => {
                                            if (err) {
                                                reject(err);
                                            } else {
                                                resolve(result.map(row => row.Id_Ministerio));
                                            }
                                        });
                                    });
                                });

                                // Asegurar que todos los ministerios se inserten
                                Promise.all(ministerioQueries)
                                    .then((ministerioIdsArrays) => {
                                        const ministerioIds = ministerioIdsArrays.flat();

                                        console.log('Ministerio IDs antes de la inserción:', ministerioIds);
                                        if (ministerioIds.length > 0) {
                                            const sqlInsertMinisterios = 'INSERT INTO persona_ministerio (Id_Persona, Id_Ministerio) VALUES ?';
                                            const ministerioValues = ministerioIds.map((ministerioId) => [id, ministerioId]);
                                            console.log('Ministerios que se van a insertar:', ministerioValues);

                                            connection.query(sqlInsertMinisterios, [ministerioValues], (err) => {
                                                if (err) {
                                                    console.error('Error asignando los nuevos ministerios:', err);
                                                    return res.status(500).json({ error: 'Error asignando los nuevos ministerios.' });
                                                }

                                                res.json({ id, ...updatedPersona });
                                            });
                                        } else {
                                            res.json({ id, ...updatedPersona });
                                        }
                                    })
                                    .catch((err) => {
                                        console.error('Error obteniendo IDs de ministerios:', err);
                                        return res.status(500).json({ error: 'Error obteniendo IDs de ministerios.' });
                                    });
                            } else {
                                res.json({ id, ...updatedPersona });
                            }
                        });
                    });
                } else {
                    res.json({ id, ...updatedPersona });
                }
            });
        });
    });
};




// Eliminar una persona
export const deletePersona = (req, res) => {
    const id = req.params.id;

    // Primero, eliminamos las referencias en subministerios
    const deleteSubministeriosSql = 'DELETE FROM subministerios WHERE Id_Persona_Director = ?';
    
    connection.query(deleteSubministeriosSql, [id], (err, result) => {
        if (err) {
            console.error('Error eliminando referencias en subministerios:', err);
            return res.status(500).json({ error: 'Error eliminando referencias en subministerios.' });
        }

        // Elimina primero las referencias de la persona en la tabla ministrosordenados
        const sqlDeleteMinistros = 'DELETE FROM ministrosordenados WHERE Persona_Id_Ministros = ?';

        connection.query(sqlDeleteMinistros, [id], (err) => {
            if (err) {
                console.error('Error eliminando ministro ordenado:', err);
                return res.status(500).json({ error: 'Error eliminando el ministro ordenado.' });
            }

            // Elimina las referencias de la persona en la tabla Cargo_Persona
            const sqlDeleteCargos = 'DELETE FROM cargo_persona WHERE Id_Persona = ?';
            connection.query(sqlDeleteCargos, [id], (err) => {
                if (err) {
                    console.error('Error eliminando los cargos:', err);
                    return res.status(500).json({ error: 'Error eliminando los cargos asociados.' });
                }

                // Finalmente, elimina la persona de la tabla persona
                const sqlDeletePersona = 'DELETE FROM persona WHERE Id_Persona = ?';
                connection.query(sqlDeletePersona, [id], (err, result) => {
                    if (err) {
                        console.error('Error eliminando persona:', err);
                        return res.status(500).json({ error: 'Error eliminando la persona.' });
                    }
                    res.json({ message: 'Persona eliminada con éxito' });
                });
            });
        });
    });
};

// Buscar personas
export const searchPersonas = (req, res) => {
    const search = req.query.search || '';
    const sql = `
        SELECT persona.*, iglesias.Nombre_Iglesia, GROUP_CONCAT(cargo.Nombre_Cargo) AS Cargos
        FROM persona
        LEFT JOIN iglesias ON persona.id_iglesia = iglesias.Id_Iglesia
        LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
        LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo
        WHERE persona.Nombre_Persona LIKE ? OR persona.Direccion_Persona LIKE ? OR cargo.Nombre_Cargo LIKE ? OR persona.Telefono_Persona LIKE ?
        GROUP BY persona.Id_Persona
    `;
    const values = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];

    connection.query(sql, values, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
};


// Obtener el Persona_Id desde el Usuario_ID
export const getPersonaByUsuarioId = (req, res) => {
    const { Usuario_ID } = req.params;

    const sql = 'SELECT Id_Persona FROM persona WHERE Usuario_ID = ?';
    connection.query(sql, [Usuario_ID], (err, result) => {
        if (err) {
            console.error('Error al obtener Persona_Id:', err);
            return res.status(500).json({ error: 'Error al obtener Persona_Id' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'No se encontró Persona_Id para el Usuario_ID' });
        }

        res.json({ Persona_Id: result[0].Id_Persona });
    });
};




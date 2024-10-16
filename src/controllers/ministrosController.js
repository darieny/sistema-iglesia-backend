import connection from '../models/db.js';

// Verificar si el ministro ordenado existe
const verifyMinistroExists = (ministroId, callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM ministrosordenados WHERE Id_Ministro = ?';
    connection.query(sql, [ministroId], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result[0].count > 0);
    });
};

// Crear un ministro ordenado
export const createMinistroOrdenado = (req, res) => {
    const { Persona_Id_Ministros, Numero_Licencia } = req.body;

    const sql = 'INSERT INTO ministrosordenados (Persona_Id_Ministros, Numero_Licencia) VALUES (?, ?)';
    connection.query(sql, [Persona_Id_Ministros, Numero_Licencia], (err, result) => {
        if (err) {
            console.error('Error insertando Ministro Ordenado:', err);
            return res.status(500).json({ error: 'Error insertando Ministro Ordenado.' });
        }
        res.json({ message: 'Ministro Ordenado insertado con éxito' });
    });
};

// Obtener un ministro ordenado por ID, junto con su información de la tabla `persona`
export const getMinistroById = (req, res) => {
    const id = req.params.id;
    const sql = `
        SELECT mo.*, p.Nombre_Persona, p.Telefono_Persona, p.Foto_Persona, p.Direccion_Persona, 
               p.Fecha_Nacimiento, p.id_iglesia, p.Id_Distrito
        FROM ministrosordenados mo
        LEFT JOIN persona p ON mo.Persona_Id_Ministros = p.Id_Persona
        WHERE mo.Id_Ministro = ?
    `;
    connection.query(sql, [id], (err, result) => {
        if (err) throw err;
        res.json(result[0]);
    });
};

// Obtener ministros ordenados
export const getMinistrosOrdenados = (req, res) => {
    const sql = `
        SELECT p.Id_Persona as Id_Ministro, p.Nombre_Persona, 
               MAX(r.Fecha_Reporte) as ultimoReporte, 
               CASE 
                   WHEN MAX(r.Fecha_Reporte) IS NULL THEN 'Pendiente'
                   WHEN r.Estado_Reporte = 'Enviado' THEN 'Enviado'
                   WHEN r.Estado_Reporte = 'Incompleto' THEN 'Incompleto'
                   ELSE 'Pendiente'
               END as estadoReporte
        FROM persona p
        JOIN cargo_persona cp ON p.Id_Persona = cp.Id_Persona
        JOIN cargo c ON cp.Id_Cargo = c.Id_Cargo
        LEFT JOIN reportesmensuales r ON p.Id_Persona = r.Persona_Id
        WHERE c.Nombre_Cargo = 'Ministro Ordenado'
        GROUP BY p.Id_Persona
    `;

    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error obteniendo ministros ordenados:', err);
            return res.status(500).json({ error: 'Error obteniendo ministros ordenados.' });
        }
        res.json(result);
    });
};



// Listar todos los ministros ordenados con su información y su ministerio correspondiente
export const getAllMinistrosOrdenados = (req, res) => {
    const sql = `
        SELECT 
            mo.Id_Ministro, 
            mo.Numero_Licencia, 
            mo.Descripcion_Adicional, 
            p.Id_Persona AS Persona_Id_Ministros, 
            p.Nombre_Persona, 
            p.Telefono_Persona, 
            p.Foto_Persona, 
            p.Direccion_Persona, 
            p.Fecha_Nacimiento, 
            p.id_iglesia,
            m.Id_Ministerio, 
            m.Nombre_Ministerio
        FROM ministrosordenados mo
        JOIN persona p ON mo.Persona_Id_Ministros = p.Id_Persona
        JOIN persona_ministerio pm ON p.Id_Persona = pm.Id_Persona
        JOIN ministerios m ON pm.Id_Ministerio = m.Id_Ministerio
        WHERE m.Nombre_Ministerio LIKE '%Ordenado%'  -- Filtrar solo por ministros ordenados
    `;

    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error al obtener los ministros ordenados:', err);
            return res.status(500).json({ error: 'Error al obtener los ministros ordenados.' });
        }

        if (result.length === 0) {
            console.log('No se encontraron ministros ordenados.');
            return res.status(404).json({ message: 'No se encontraron ministros ordenados.' });
        }

        console.log('Ministros ordenados obtenidos:', result);
        res.json(result);
    });
};



// Crear un nuevo reporte de ministro ordenado
export const createReporteMinistro = (req, res) => {
    const { mes, ano, valoresCampos, usuario_id, ministerio_id } = req.body;

    console.log('Datos recibidos:', req.body);

    // Obtener el Id_Persona y Distrito_Id utilizando el usuario_id
    const sqlGetPersonaInfo = 'SELECT Id_Persona, Id_Distrito FROM persona WHERE Usuario_ID = ?';
    connection.query(sqlGetPersonaInfo, [usuario_id], (err, result) => {
        if (err) {
            console.error('Error al obtener el Id_Persona y Distrito:', err);
            return res.status(500).json({ error: 'Error al obtener el Id_Persona y Distrito' });
        }

        if (result.length === 0) {
            console.error('No se encontró un Id_Persona para el usuario:', usuario_id);
            return res.status(404).json({ error: 'No se encontró un Id_Persona para el usuario' });
        }

        const personaId = result[0].Id_Persona;
        const distritoId = result[0].Id_Distrito;

        console.log(`Persona_Id: ${personaId}, Distrito_Id: ${distritoId}, Ministerio_Id: ${ministerio_id}`);

        // Inserta el nuevo reporte utilizando el personaId, distritoId y ministerioId
        const sqlReporte = `
          INSERT INTO reportesmensuales (Mes, Ano, Ministerio_Id, Persona_Id, Distrito_Id) 
          VALUES (?, ?, ?, ?, ?)
        `;
        connection.query(sqlReporte, [mes, ano, ministerio_id, personaId, distritoId], (err, result) => {
            if (err) {
                console.error('Error al crear el reporte:', err);
                return res.status(500).json({ error: 'Error al crear el reporte' });
            }

            const reporteId = result.insertId;
            console.log('Reporte insertado con ID:', reporteId);

            // Inserta los valores de los campos del reporte
            const sqlValores = `
              INSERT INTO valorescamposreporte (Id_Reporte, Id_TipoCampo, Valor) 
              VALUES ?
            `;
            const valores = Object.keys(valoresCampos).map(Id_TipoCampo => [
                reporteId, Id_TipoCampo, valoresCampos[Id_TipoCampo]
            ]);

            console.log('Valores que se insertarán:', valores);

            connection.query(sqlValores, [valores], (err, result) => {
                if (err) {
                    console.error('Error al insertar los valores del reporte:', err);
                    return res.status(500).json({ error: 'Error al insertar los valores del reporte' });
                }

                res.json({ message: 'Reporte creado exitosamente', Id_Reporte: reporteId });
            });
        });
    });
};



// Actualizar un reporte de ministro ordenado con validaciones
export const updateReporteMinistro = (req, res) => {
    const id = req.params.id;
    const { mes, ano, ministroId, valoresCampos } = req.body;

    // Verificación de que el ministro asignado existe
    verifyMinistroExists(ministroId, (err, exists) => {
        if (err) {
            return res.status(500).json({ error: 'Error verificando el ministro ordenado.' });
        }
        if (!exists) {
            return res.status(400).json({ error: 'El ministro ordenado asignado no existe.' });
        }

        // Actualizar el reporte
        const sql = 'UPDATE reportesmensuales SET Mes = ?, Ano = ?, Ministro_Id = ? WHERE Id_Reporte = ?';
        connection.query(sql, [mes, ano, ministroId, id], (err, result) => {
            if (err) throw err;

            // Actualizar los valores de los campos del reporte
            const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE Id_Reporte = ?';
            connection.query(sqlDeleteValores, [id], (err, result) => {
                if (err) throw err;

                const sqlValores = 'INSERT INTO valorescamposreporte (Id_Reporte, Id_TipoCampo, Valor) VALUES ?';
                const valores = Object.keys(valoresCampos).map(idTipoCampo => [
                    id, idTipoCampo, valoresCampos[idTipoCampo]
                ]);

                connection.query(sqlValores, [valores], (err, result) => {
                    if (err) throw err;
                    res.json({ id, mes, ano, ministroId, valoresCampos });
                });
            });
        });
    });
};



// Eliminar un reporte de ministro ordenado
export const deleteReporteMinistro = (req, res) => {
    const id = req.params.id; // Obtener el ID del reporte desde los parámetros de la URL

    // Primero eliminar los valores relacionados en valoresCamposReporte
    const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE Id_Reporte = ?';
    connection.query(sqlDeleteValores, [id], (err, result) => {
        if (err) {
            console.error('Error al eliminar los valores del reporte:', err);
            return res.status(500).json({ error: 'Error al eliminar los valores del reporte' });
        }

        // Luego eliminar el reporte en reportesMensuales
        const sqlDeleteReporte = 'DELETE FROM reportesmensuales WHERE Id_Reporte = ?';
        connection.query(sqlDeleteReporte, [id], (err, result) => {
            if (err) {
                console.error('Error al eliminar el reporte:', err);
                return res.status(500).json({ error: 'Error al eliminar el reporte' });
            }

            res.json({ message: 'Reporte eliminado exitosamente' });
        });
    });
};



// Obtener el ministerio basado en el Id del usuario y su distrito
export const getMinisterioOrdenadoByUserId = (req, res) => {
    const usuarioId = req.params.id;

    console.log(`Obteniendo Ministerio Ordenado para usuarioId: ${usuarioId}`);

    const query = `
      SELECT 
        pm.Id_Ministerio, 
        m.Nombre_Ministerio, 
        p.Id_Persona,
        p.Id_Distrito, 
        mo.Numero_Licencia
      FROM persona_ministerio pm
      JOIN persona p ON pm.Id_Persona = p.Id_Persona
      JOIN ministerios m ON pm.Id_Ministerio = m.Id_Ministerio
      LEFT JOIN ministrosordenados mo ON p.Id_Persona = mo.Persona_Id_Ministros
      WHERE p.Usuario_ID = ? AND m.Nombre_Ministerio = 'Ministro Ordenado'
    `;

    connection.query(query, [usuarioId], (err, result) => {
        if (err) {
            console.error('Error en la consulta SQL:', err);
            return res.status(500).json({ error: 'Error al obtener el Ministerio Ordenado' });
        }

        if (result.length > 0) {
            console.log('Ministerio Ordenado encontrado:', result[0]);
            res.json(result[0]); // Devolvemos el ministerio ordenado encontrado
        } else {
            console.log('No se encontró el Ministerio Ordenado para el usuarioId:', usuarioId);
            res.status(404).json({ error: 'Ministerio Ordenado no encontrado' });
        }
    });
};





// Obtener los reportes de un ministro ordenado por su usuario_id o ministro_id
export const getReportesByMinistroOrdenado = (req, res) => {
    const { id } = req.params; // ID de persona recibido
    const { ministerioId } = req.query; // ID del ministerio recibido
    const isAdmin = req.query.isAdmin === 'true'; // Verificar si es admin

    console.log('ID recibido:', id);
    console.log('ID del Ministerio:', ministerioId);
    console.log('isAdmin:', isAdmin);

    // Verificar que ambos parámetros estén presentes
    if (!id || !ministerioId) {
        return res.status(400).json({ error: 'ID de persona o ministerio no proporcionado.' });
    }

    const sqlReportes = `
        SELECT 
            r.Id_Reporte, r.Mes, r.Ano, r.Ministerio_Id, r.Persona_Id, r.Distrito_Id,
            IFNULL(
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'Id_TipoCampo', vcr.Id_TipoCampo,
                        'Nombre_Campo', tc.Nombre_Campo,
                        'Valor', vcr.Valor
                    )
                ), '[]'
            ) AS valoresCampos
        FROM reportesmensuales r
        LEFT JOIN valorescamposreporte vcr ON r.Id_Reporte = vcr.Id_Reporte
        LEFT JOIN tiposcamposreporte tc ON vcr.Id_TipoCampo = tc.Id_TipoCampo
        WHERE r.Persona_Id = ? AND r.Ministerio_Id = ?  -- Filtrar por persona y ministerio
        GROUP BY r.Id_Reporte, r.Mes, r.Ano, r.Ministerio_Id, r.Persona_Id, r.Distrito_Id
    `;

    connection.query(sqlReportes, [id, ministerioId], (err, reportes) => {
        if (err) {
            console.error('Error al obtener los reportes:', err);
            return res.status(500).json({ error: 'Error al obtener los reportes.' });
        }

        if (reportes.length === 0) {
            console.log(`No se encontraron reportes para ID de persona: ${id} y ministerio: ${ministerioId}`);
            return res.status(404).json({ message: 'No se encontraron reportes.' });
        }

        res.json({ reportes });
    });
};





















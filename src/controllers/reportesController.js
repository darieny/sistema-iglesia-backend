import pool from '../models/db.js';

// Verificar si el subministerio existe
const verifySubministerioExists = (subministerioId, callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM subministerios WHERE "Id_Subministerio" = $1';
    pool.query(sql, [subministerioId], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result.rows[0].count > 0);
    });
};

// Obtener todos los reportes (filtrados según el rol)
export const getAllReportes = (req, res) => {
    const { userRole, distritoId, userId } = req.query;

    let sql = `
        SELECT reportesmensuales.*, ministerios."Nombre_Ministerio"
        FROM reportesmensuales
        LEFT JOIN ministerios ON reportesmensuales."Ministerio_Id" = ministerios."Id_Ministerio"
    `;

    if (userRole === "Administrador") {
        sql += ` WHERE 1 = 1`;
    } else if (userRole === "Supervisor de Distrito 1" || userRole === "Supervisor de Distrito 2") {
        sql += ` WHERE reportesmensuales."Distrito_Id" = $1`;
    } else if (userRole === "Pastor") {
        sql += ` WHERE reportesmensuales."Persona_Id" = $1`;
    }

    let queryValues = [];
    if (userRole === "Supervisor de Distrito 1" || userRole === "Supervisor de Distrito 2") {
        queryValues = [distritoId];
    } else if (userRole === "Pastor") {
        queryValues = [userId];
    }

    pool.query(sql, queryValues, (err, results) => {
        if (err) {
            console.error('Error al obtener los reportes:', err);
            return res.status(500).json({ error: 'Error al obtener los reportes' });
        }
        res.json(results.rows);
    });
};

// Obtener un reporte por ID
export const getReporteById = (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT 
            r.*, 
            d."Nombre_Distrito", 
            p."Nombre_Persona"
        FROM reportesmensuales r
        LEFT JOIN distritos d ON r."Distrito_Id" = d."Id_Distrito"
        LEFT JOIN persona p ON r."Persona_Id" = p."Id_Persona"
        WHERE r."Id_Reporte" = $1;
    `;

    pool.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error al obtener el reporte:', err);
            return res.status(500).json({ error: 'Error al obtener el reporte' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        res.json(result.rows[0]);
    });
};

// Crear un nuevo reporte con los valores de los campos
export const createReporte = (req, res) => {
    const { mes, ano, ministerio_id, valoresCampos, Usuario_ID, iglesia_id, distrito_id } = req.body;
    console.log('Datos recibidos:', req.body);

    const sqlGetPersona = 'SELECT "Id_Persona" FROM persona WHERE "Usuario_ID" = $1';
    pool.query(sqlGetPersona, [Usuario_ID], (err, results) => {
        if (err) {
            console.error('Error al obtener Id_Persona:', err);
            return res.status(500).json({ error: 'Error al obtener Id_Persona' });
        }

        if (results.rows.length === 0) {
            console.error('No se encontró un Id_Persona para el usuario:', Usuario_ID);
            return res.status(404).json({ error: 'No se encontró un Id_Persona para el usuario' });
        }

        const Persona_Id = results.rows[0].Id_Persona;

        const sqlReporte = `
          INSERT INTO reportesmensuales ("Mes", "Ano", "Ministerio_Id", "Persona_Id", "Distrito_Id") 
          VALUES ($1, $2, $3, $4, $5) RETURNING "Id_Reporte";
        `;
        pool.query(sqlReporte, [mes, ano, ministerio_id, Persona_Id, distrito_id], (err, result) => {
            if (err) {
                console.error('Error al crear el reporte:', err);
                return res.status(500).json({ error: 'Error al crear el reporte' });
            }

            const reporteId = result.rows[0].Id_Reporte;

            const sqlValores = `
              INSERT INTO valorescamposreporte ("Id_Reporte", "Id_TipoCampo", "Valor") VALUES ($1, $2, $3)
            `;
            const valores = Object.keys(valoresCampos).map(idTipoCampo => [
                reporteId, idTipoCampo, valoresCampos[idTipoCampo]
            ]);

            pool.query(sqlValores, [valores], (err) => {
                if (err) {
                    console.error('Error al insertar los valores del reporte:', err);
                    return res.status(500).json({ error: 'Error al insertar los valores del reporte' });
                }
                res.json({ message: 'Reporte creado exitosamente' });
            });
        });
    });
};

// Actualizar un reporte mensual con validaciones
export const updateReporte = (req, res) => {
    const id = req.params.id;
    const { mes, ano, ministerioId, distritoId, personaId, valoresCampos } = req.body;

    const sql = `
      UPDATE reportesmensuales 
      SET "Mes" = $1, "Ano" = $2, "Ministerio_Id" = $3, "Distrito_Id" = $4, "Persona_Id" = $5 
      WHERE "Id_Reporte" = $6
    `;

    pool.query(sql, [mes, ano, ministerioId, distritoId, personaId, id], (err) => {
        if (err) {
            console.error('Error al actualizar el reporte:', err);
            return res.status(500).json({ error: 'Error al actualizar el reporte' });
        }

        const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE "Id_Reporte" = $1';
        pool.query(sqlDeleteValores, [id], (err) => {
            if (err) {
                console.error('Error al eliminar valores antiguos:', err);
                return res.status(500).json({ error: 'Error al eliminar valores antiguos' });
            }

            const sqlValores = `
              INSERT INTO valorescamposreporte ("Id_Reporte", "Id_TipoCampo", "Valor") VALUES ($1, $2, $3)
            `;
            const valores = Object.keys(valoresCampos).map(idTipoCampo => [
                id, idTipoCampo, valoresCampos[idTipoCampo]
            ]);

            pool.query(sqlValores, [valores], (err) => {
                if (err) {
                    console.error('Error al insertar nuevos valores:', err);
                    return res.status(500).json({ error: 'Error al insertar nuevos valores' });
                }

                res.json({ message: 'Reporte actualizado exitosamente' });
            });
        });
    });
};

// Eliminar un reporte mensual
export const deleteReporte = (req, res) => {
    const id = req.params.id;

    const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE "Id_Reporte" = $1';
    pool.query(sqlDeleteValores, [id], (err) => {
        if (err) throw err;

        const sql = 'DELETE FROM reportesmensuales WHERE "Id_Reporte" = $1';
        pool.query(sql, [id], (err) => {
            if (err) throw err;
            res.json({ message: 'Reporte eliminado con éxito' });
        });
    });
};

// Obtener estadísticas de reportes
export const getEstadisticasReportes = (req, res) => {
    const sqlMensual = `
      SELECT COUNT(*) AS "reporteMensual"
      FROM reportesmensuales
      WHERE "Mes" = EXTRACT(MONTH FROM CURRENT_DATE) AND "Ano" = EXTRACT(YEAR FROM CURRENT_DATE)
    `;

    const sqlAnual = `
      SELECT "Mes", "Ano", COUNT(*) AS "Total"
      FROM reportesmensuales
      GROUP BY "Mes", "Ano"
      ORDER BY "Ano", "Mes";
    `;

    pool.query(sqlMensual, (err, resultMensual) => {
        if (err) {
            console.error('Error al obtener reportes mensuales:', err);
            return res.status(500).json({ error: 'Error al obtener reportes mensuales.' });
        }

        pool.query(sqlAnual, (err, resultAnual) => {
            if (err) {
                console.error('Error al obtener reportes anuales:', err);
                return res.status(500).json({ error: 'Error al obtener reportes anuales.' });
            }

            res.json({
                reporteMensual: resultMensual.rows[0].reporteMensual,
                reportesAnuales: resultAnual.rows,
            });
        });
    });
};

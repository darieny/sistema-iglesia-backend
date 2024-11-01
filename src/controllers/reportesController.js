import pool from '../models/db.js';

// Verificar si el subministerio existe
const verifySubministerioExists = (subministerioId, callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM subministerios WHERE id_subministerio = $1';
    pool.query(sql, [subministerioId], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result.rows[0].count > 0);
    });
};

// Obtener todos los reportes (filtrados según el rol)
export const getAllReportes = (req, res) => {
    const { userRole, distritoId, userId } = req.query;

    let sql = `
        SELECT reportesmensuales.*, ministerios.nombre_ministerio
        FROM reportesmensuales
        LEFT JOIN ministerios ON reportesmensuales.ministerio_id = ministerios.id_ministerio
    `;

    if (userRole === "Administrador") {
        sql += ` WHERE 1 = 1`;
    } else if (userRole === "Supervisor de Distrito 1" || userRole === "Supervisor de Distrito 2") {
        sql += ` WHERE reportesmensuales.distrito_id = $1`;
    } else if (userRole === "Pastor") {
        sql += ` WHERE reportesmensuales.persona_id = $1`;
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
            d.nombre_distrito, 
            p.nombre_persona
        FROM reportesmensuales r
        LEFT JOIN distritos d ON r.distrito_id = d.id_distrito
        LEFT JOIN persona p ON r.persona_id = p.id_persona
        WHERE r.id_reporte = $1;
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
    const { mes, ano, ministerio_id, valoresCampos, usuario_id, iglesia_id, distrito_id } = req.body;
    console.log('Datos recibidos:', req.body);

    const sqlGetPersona = 'SELECT id_persona FROM persona WHERE usuario_id = $1';
    pool.query(sqlGetPersona, [usuario_id], (err, results) => {
        if (err) {
            console.error('Error al obtener id_persona:', err);
            return res.status(500).json({ error: 'Error al obtener id_persona' });
        }

        if (results.rows.length === 0) {
            console.error('No se encontró un id_persona para el usuario:', usuario_id);
            return res.status(404).json({ error: 'No se encontró un id_persona para el usuario' });
        }

        const persona_id = results.rows[0].id_persona;

        const sqlReporte = `
          INSERT INTO reportesmensuales (mes, ano, ministerio_id, persona_id, distrito_id) 
          VALUES ($1, $2, $3, $4, $5) RETURNING id_reporte;
        `;
        pool.query(sqlReporte, [mes, ano, ministerio_id, persona_id, distrito_id], (err, result) => {
            if (err) {
                console.error('Error al crear el reporte:', err);
                return res.status(500).json({ error: 'Error al crear el reporte' });
            }

            const reporteId = result.rows[0].id_reporte;

            const sqlValores = `
              INSERT INTO valorescamposreporte (id_reporte, id_tipocampo, valor) VALUES ($1, $2, $3)
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
    const { mes, ano, ministerio_id, distrito_id, persona_id, valoresCampos } = req.body;

    const sql = `
      UPDATE reportesmensuales 
      SET mes = $1, ano = $2, ministerio_id = $3, distrito_id = $4, persona_id = $5 
      WHERE id_reporte = $6
    `;

    pool.query(sql, [mes, ano, ministerio_id, distrito_id, persona_id, id], (err) => {
        if (err) {
            console.error('Error al actualizar el reporte:', err);
            return res.status(500).json({ error: 'Error al actualizar el reporte' });
        }

        const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE id_reporte = $1';
        pool.query(sqlDeleteValores, [id], (err) => {
            if (err) {
                console.error('Error al eliminar valores antiguos:', err);
                return res.status(500).json({ error: 'Error al eliminar valores antiguos' });
            }

            const sqlValores = `
              INSERT INTO valorescamposreporte (id_reporte, id_tipocampo, valor) VALUES ($1, $2, $3)
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

    const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE id_reporte = $1';
    pool.query(sqlDeleteValores, [id], (err) => {
        if (err) throw err;

        const sql = 'DELETE FROM reportesmensuales WHERE id_reporte = $1';
        pool.query(sql, [id], (err) => {
            if (err) throw err;
            res.json({ message: 'Reporte eliminado con éxito' });
        });
    });
};

// Obtener estadísticas de reportes
export const getEstadisticasReportes = (req, res) => {
    const sqlMensual = `
      SELECT COUNT(*) AS reporte_mensual
      FROM reportesmensuales
      WHERE mes = EXTRACT(MONTH FROM CURRENT_DATE) AND ano = EXTRACT(YEAR FROM CURRENT_DATE)
    `;

    const sqlAnual = `
      SELECT mes, ano, COUNT(*) AS total
      FROM reportesmensuales
      GROUP BY mes, ano
      ORDER BY ano, mes;
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
                reporteMensual: resultMensual.rows[0].reporte_mensual,
                reportesAnuales: resultAnual.rows,
            });
        });
    });
};

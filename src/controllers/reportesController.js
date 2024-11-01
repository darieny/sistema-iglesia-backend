import pool from '../models/db.js';

// Verificar si el subministerio existe
const verifySubministerioExists = async (subministerioId) => {
  const sql = 'SELECT COUNT(*) AS count FROM subministerios WHERE Id_Subministerio = $1';
  const { rows } = await pool.query(sql, [subministerioId]);
  return rows[0].count > 0;
};

// Obtener todos los reportes (filtrados según el rol)
export const getAllReportes = async (req, res) => {
  const { userRole, distritoId, userId } = req.query;
  let sql = `
    SELECT reportesmensuales.*, ministerios.Nombre_Ministerio
    FROM reportesmensuales
    LEFT JOIN ministerios ON reportesmensuales.Ministerio_Id = ministerios.Id_Ministerio
  `;

  if (userRole === "Administrador") {
    sql += ` WHERE 1 = 1`;
  } else if (userRole === "Supervisor de Distrito 1" || userRole === "Supervisor de Distrito 2") {
    sql += ` WHERE reportesmensuales.Distrito_Id = $1`;
  } else if (userRole === "Pastor") {
    sql += ` WHERE reportesmensuales.Persona_Id = $1`;
  }

  const queryValues = (userRole === "Supervisor de Distrito 1" || userRole === "Supervisor de Distrito 2") ? [distritoId] : [userId];

  try {
    const { rows } = await pool.query(sql, queryValues);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los reportes:', err);
    res.status(500).json({ error: 'Error al obtener los reportes' });
  }
};

// Obtener un reporte por ID
export const getReporteById = async (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      r.*, 
      d.Nombre_Distrito, 
      p.Nombre_Persona 
    FROM reportesmensuales r
    LEFT JOIN distritos d ON r.Distrito_Id = d.Id_Distrito
    LEFT JOIN persona p ON r.Persona_Id = p.Id_Persona
    WHERE r.Id_Reporte = $1
  `;

  try {
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener el reporte:', err);
    res.status(500).json({ error: 'Error al obtener el reporte' });
  }
};

// Crear un nuevo reporte con los valores de los campos
export const createReporte = async (req, res) => {
  const { mes, ano, ministerio_id, valoresCampos, Usuario_ID, iglesia_id, distrito_id } = req.body;

  try {
    const sqlGetPersona = 'SELECT Id_Persona FROM persona WHERE Usuario_ID = $1';
    const personaResult = await pool.query(sqlGetPersona, [Usuario_ID]);

    if (personaResult.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró un Id_Persona para el usuario' });
    }

    const Persona_Id = personaResult.rows[0].id_persona;

    const sqlReporte = `
      INSERT INTO reportesmensuales (Mes, Ano, Ministerio_Id, Persona_Id, Distrito_Id) 
      VALUES ($1, $2, $3, $4, $5) RETURNING Id_Reporte
    `;
    const reporteResult = await pool.query(sqlReporte, [mes, ano, ministerio_id, Persona_Id, distrito_id]);
    const reporteId = reporteResult.rows[0].id_reporte;

    const sqlValores = `
      INSERT INTO valorescamposreporte (Id_Reporte, Id_TipoCampo, Valor) 
      VALUES ($1, $2, $3)
    `;
    const valores = Object.keys(valoresCampos).map(idTipoCampo => [
      reporteId, idTipoCampo, valoresCampos[idTipoCampo]
    ]);

    for (const [idReporte, idTipoCampo, valor] of valores) {
      await pool.query(sqlValores, [idReporte, idTipoCampo, valor]);
    }

    res.json({ message: 'Reporte creado exitosamente' });
  } catch (err) {
    console.error('Error al crear el reporte:', err);
    res.status(500).json({ error: 'Error al crear el reporte' });
  }
};

// Actualizar un reporte mensual con validaciones
export const updateReporte = async (req, res) => {
  const id = req.params.id;
  const { mes, ano, ministerioId, distritoId, personaId, valoresCampos } = req.body;

  try {
    const sql = `
      UPDATE reportesmensuales 
      SET Mes = $1, Ano = $2, Ministerio_Id = $3, Distrito_Id = $4, Persona_Id = $5 
      WHERE Id_Reporte = $6
    `;
    await pool.query(sql, [mes, ano, ministerioId, distritoId, personaId, id]);

    const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE Id_Reporte = $1';
    await pool.query(sqlDeleteValores, [id]);

    const sqlValores = `
      INSERT INTO valorescamposreporte (Id_Reporte, Id_TipoCampo, Valor) 
      VALUES ($1, $2, $3)
    `;
    const valores = Object.keys(valoresCampos).map(idTipoCampo => [
      id, idTipoCampo, valoresCampos[idTipoCampo]
    ]);

    for (const [idReporte, idTipoCampo, valor] of valores) {
      await pool.query(sqlValores, [idReporte, idTipoCampo, valor]);
    }

    res.json({ message: 'Reporte actualizado exitosamente' });
  } catch (err) {
    console.error('Error al actualizar el reporte:', err);
    res.status(500).json({ error: 'Error al actualizar el reporte' });
  }
};

// Eliminar un reporte mensual
export const deleteReporte = async (req, res) => {
  const id = req.params.id;

  try {
    const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE Id_Reporte = $1';
    await pool.query(sqlDeleteValores, [id]);

    const sql = 'DELETE FROM reportesmensuales WHERE Id_Reporte = $1';
    await pool.query(sql, [id]);

    res.json({ message: 'Reporte eliminado con éxito' });
  } catch (err) {
    console.error('Error al eliminar el reporte:', err);
    res.status(500).json({ error: 'Error al eliminar el reporte' });
  }
};

// Obtener estadísticas de reportes
export const getEstadisticasReportes = async (req, res) => {
  const sqlMensual = `
    SELECT COUNT(*) AS reporteMensual
    FROM reportesmensuales
    WHERE EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM CURRENT_DATE) 
      AND EXTRACT(YEAR FROM CURRENT_DATE) = EXTRACT(YEAR FROM CURRENT_DATE)
  `;
  
  const sqlAnual = `
    SELECT Mes, Ano, COUNT(*) AS Total
    FROM reportesmensuales
    GROUP BY Mes, Ano
    ORDER BY Ano, Mes
  `;

  try {
    const resultMensual = await pool.query(sqlMensual);
    const resultAnual = await pool.query(sqlAnual);

    res.json({
      reporteMensual: resultMensual.rows[0].reporteMensual,
      reportesAnuales: resultAnual.rows
    });
  } catch (err) {
    console.error('Error al obtener estadísticas de reportes:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas de reportes.' });
  }
};

import pool from '../models/db.js';

// Verificar si el ministro ordenado existe
const verifyMinistroExists = async (ministroId) => {
  const sql = 'SELECT COUNT(*) FROM ministrosordenados WHERE Id_Ministro = $1';
  try {
    const { rows } = await pool.query(sql, [ministroId]);
    return rows[0].count > 0;
  } catch (err) {
    console.error('Error verifying ministro:', err);
    throw err;
  }
};

// Crear un ministro ordenado
export const createMinistroOrdenado = async (req, res) => {
  const { Persona_Id_Ministros, Numero_Licencia } = req.body;

  const sql = `
    INSERT INTO ministrosordenados (Persona_Id_Ministros, Numero_Licencia) 
    VALUES ($1, $2) RETURNING *
  `;
  try {
    const { rows } = await pool.query(sql, [Persona_Id_Ministros, Numero_Licencia]);
    res.json({ message: 'Ministro Ordenado insertado con éxito', data: rows[0] });
  } catch (err) {
    console.error('Error insertando Ministro Ordenado:', err);
    res.status(500).json({ error: 'Error insertando Ministro Ordenado.' });
  }
};

// Obtener un ministro ordenado por ID, junto con su información de la tabla `persona`
export const getMinistroById = async (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT mo.*, p.Nombre_Persona, p.Telefono_Persona, p.Foto_Persona, 
           p.Direccion_Persona, p.Fecha_Nacimiento, p.id_iglesia, p.Id_Distrito
    FROM ministrosordenados mo
    LEFT JOIN persona p ON mo.Persona_Id_Ministros = p.Id_Persona
    WHERE mo.Id_Ministro = $1
  `;
  try {
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ministro no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener el ministro:', err);
    res.status(500).json({ error: 'Error al obtener el ministro' });
  }
};

// Obtener ministros ordenados
export const getMinistrosOrdenados = async (req, res) => {
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
  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo ministros ordenados:', err);
    res.status(500).json({ error: 'Error obteniendo ministros ordenados.' });
  }
};

// Listar todos los ministros ordenados con su información y su ministerio correspondiente
export const getAllMinistrosOrdenados = async (req, res) => {
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
    WHERE m.Nombre_Ministerio ILIKE '%Ordenado%'
  `;
  try {
    const { rows } = await pool.query(sql);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No se encontraron ministros ordenados.' });
    }
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los ministros ordenados:', err);
    res.status(500).json({ error: 'Error al obtener los ministros ordenados.' });
  }
};

// Crear un nuevo reporte de ministro ordenado
export const createReporteMinistro = async (req, res) => {
  const { mes, ano, valoresCampos, usuario_id, ministerio_id } = req.body;
  console.log('Datos recibidos:', req.body);

  try {
    const sqlGetPersonaInfo = 'SELECT Id_Persona, Id_Distrito FROM persona WHERE Usuario_ID = $1';
    const { rows: personaRows } = await pool.query(sqlGetPersonaInfo, [usuario_id]);
    if (personaRows.length === 0) {
      return res.status(404).json({ error: 'No se encontró un Id_Persona para el usuario' });
    }

    const { id_persona: personaId, id_distrito: distritoId } = personaRows[0];
    const sqlReporte = `
      INSERT INTO reportesmensuales (Mes, Ano, Ministerio_Id, Persona_Id, Distrito_Id) 
      VALUES ($1, $2, $3, $4, $5) RETURNING Id_Reporte
    `;
    const { rows: reporteRows } = await pool.query(sqlReporte, [mes, ano, ministerio_id, personaId, distritoId]);
    const reporteId = reporteRows[0].id_reporte;
    console.log('Reporte insertado con ID:', reporteId);

    const sqlValores = `
      INSERT INTO valorescamposreporte (Id_Reporte, Id_TipoCampo, Valor) 
      VALUES ($1, $2, $3)
    `;
    const valores = Object.entries(valoresCampos).map(([Id_TipoCampo, Valor]) => [reporteId, Id_TipoCampo, Valor]);
    
    // Inserción en bloque usando un solo query
    for (const [Id_Reporte, Id_TipoCampo, Valor] of valores) {
      await pool.query(sqlValores, [Id_Reporte, Id_TipoCampo, Valor]);
    }

    res.json({ message: 'Reporte creado exitosamente', Id_Reporte: reporteId });
  } catch (err) {
    console.error('Error al crear el reporte:', err);
    res.status(500).json({ error: 'Error al crear el reporte' });
  }
};

// Actualizar un reporte de ministro ordenado con validaciones
export const updateReporteMinistro = async (req, res) => {
  const id = req.params.id;
  const { mes, ano, ministroId, valoresCampos } = req.body;

  try {
    const exists = await verifyMinistroExists(ministroId);
    if (!exists) {
      return res.status(400).json({ error: 'El ministro ordenado asignado no existe.' });
    }

    const sqlUpdate = `
      UPDATE reportesmensuales 
      SET Mes = $1, Ano = $2, Ministro_Id = $3 
      WHERE Id_Reporte = $4 RETURNING *
    `;
    await pool.query(sqlUpdate, [mes, ano, ministroId, id]);

    const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE Id_Reporte = $1';
    await pool.query(sqlDeleteValores, [id]);

    const sqlInsertValores = `
      INSERT INTO valorescamposreporte (Id_Reporte, Id_TipoCampo, Valor) 
      VALUES ($1, $2, $3)
    `;
    for (const [Id_TipoCampo, Valor] of Object.entries(valoresCampos)) {
      await pool.query(sqlInsertValores, [id, Id_TipoCampo, Valor]);
    }

    res.json({ id, mes, ano, ministroId, valoresCampos });
  } catch (err) {
    console.error('Error al actualizar el reporte:', err);
    res.status(500).json({ error: 'Error al actualizar el reporte' });
  }
};

// Eliminar un reporte de ministro ordenado
export const deleteReporteMinistro = async (req, res) => {
  const id = req.params.id;
  const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE Id_Reporte = $1';
  const sqlDeleteReporte = 'DELETE FROM reportesmensuales WHERE Id_Reporte = $1 RETURNING *';

  try {
    await pool.query(sqlDeleteValores, [id]);
    const { rows } = await pool.query(sqlDeleteReporte, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }
    res.json({ message: 'Reporte eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar el reporte:', err);
    res.status(500).json({ error: 'Error al eliminar el reporte' });
  }
};

// Obtener el ministerio basado en el Id del usuario y su distrito
export const getMinisterioOrdenadoByUserId = async (req, res) => {
  const usuarioId = req.params.id;
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
    WHERE p.Usuario_ID = $1 AND m.Nombre_Ministerio = 'Ministro Ordenado'
  `;
  try {
    const { rows } = await pool.query(query, [usuarioId]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Ministerio Ordenado no encontrado' });
    }
  } catch (err) {
    console.error('Error al obtener el Ministerio Ordenado:', err);
    res.status(500).json({ error: 'Error al obtener el Ministerio Ordenado' });
  }
};

// Obtener los reportes de un ministro ordenado por su usuario_id o ministro_id
export const getReportesByMinistroOrdenado = async (req, res) => {
  const { id } = req.params;
  const { ministerioId } = req.query;
  const sqlReportes = `
    SELECT 
      r.Id_Reporte, r.Mes, r.Ano, r.Ministerio_Id, r.Persona_Id, r.Distrito_Id,
      COALESCE(
        json_agg(
          json_build_object(
            'Id_TipoCampo', vcr.Id_TipoCampo,
            'Nombre_Campo', tc.Nombre_Campo,
            'Valor', vcr.Valor
          )
        ) FILTER (WHERE vcr.Id_TipoCampo IS NOT NULL), '[]'
      ) AS valoresCampos
    FROM reportesmensuales r
    LEFT JOIN valorescamposreporte vcr ON r.Id_Reporte = vcr.Id_Reporte
    LEFT JOIN tiposcamposreporte tc ON vcr.Id_TipoCampo = tc.Id_TipoCampo
    WHERE r.Persona_Id = $1 AND r.Ministerio_Id = $2
    GROUP BY r.Id_Reporte, r.Mes, r.Ano, r.Ministerio_Id, r.Persona_Id, r.Distrito_Id
  `;
  try {
    const { rows } = await pool.query(sqlReportes, [id, ministerioId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No se encontraron reportes.' });
    }
    res.json({ reportes: rows });
  } catch (err) {
    console.error('Error al obtener los reportes:', err);
    res.status(500).json({ error: 'Error al obtener los reportes.' });
  }
};

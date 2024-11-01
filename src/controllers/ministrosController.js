import pool from '../models/db.js';

// Verificar si el ministro ordenado existe
const verifyMinistroExists = async (ministroId) => {
  const sql = 'SELECT COUNT(*) FROM ministrosordenados WHERE id_ministro = $1';
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
  const { persona_id_ministros, numero_licencia } = req.body;

  const sql = `
    INSERT INTO ministrosordenados (persona_id_ministros, numero_licencia) 
    VALUES ($1, $2) RETURNING *
  `;
  try {
    const { rows } = await pool.query(sql, [persona_id_ministros, numero_licencia]);
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
    SELECT mo.*, p.nombre_persona, p.telefono_persona, p.foto_persona, 
           p.direccion_persona, p.fecha_nacimiento, p.id_iglesia, p.id_distrito
    FROM ministrosordenados mo
    LEFT JOIN persona p ON mo.persona_id_ministros = p.id_persona
    WHERE mo.id_ministro = $1
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
    SELECT p.id_persona as id_ministro, p.nombre_persona, 
           MAX(r.fecha_reporte) as ultimoreporte, 
           CASE 
               WHEN MAX(r.fecha_reporte) IS NULL THEN 'Pendiente'
               WHEN r.estado_reporte = 'Enviado' THEN 'Enviado'
               WHEN r.estado_reporte = 'Incompleto' THEN 'Incompleto'
               ELSE 'Pendiente'
           END as estado_reporte
    FROM persona p
    JOIN cargo_persona cp ON p.id_persona = cp.id_persona
    JOIN cargo c ON cp.id_cargo = c.id_cargo
    LEFT JOIN reportesmensuales r ON p.id_persona = r.persona_id
    WHERE c.nombre_cargo = 'Ministro Ordenado'
    GROUP BY p.id_persona
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
        mo.id_ministro, 
        mo.numero_licencia, 
        mo.descripcion_adicional, 
        p.id_persona AS persona_id_ministros, 
        p.nombre_persona, 
        p.telefono_persona, 
        p.foto_persona, 
        p.direccion_persona, 
        p.fecha_nacimiento, 
        p.id_iglesia,
        m.id_ministerio, 
        m.nombre_ministerio
    FROM ministrosordenados mo
    JOIN persona p ON mo.persona_id_ministros = p.id_persona
    JOIN persona_ministerio pm ON p.id_persona = pm.id_persona
    JOIN ministerios m ON pm.id_ministerio = m.id_ministerio
    WHERE m.nombre_ministerio ILIKE '%Ordenado%'
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
    const sqlGetPersonaInfo = 'SELECT id_persona, id_distrito FROM persona WHERE usuario_id = $1';
    const { rows: personaRows } = await pool.query(sqlGetPersonaInfo, [usuario_id]);
    if (personaRows.length === 0) {
      return res.status(404).json({ error: 'No se encontró un id_persona para el usuario' });
    }

    const { id_persona: personaId, id_distrito: distritoId } = personaRows[0];
    const sqlReporte = `
      INSERT INTO reportesmensuales (mes, ano, ministerio_id, persona_id, distrito_id) 
      VALUES ($1, $2, $3, $4, $5) RETURNING id_reporte
    `;
    const { rows: reporteRows } = await pool.query(sqlReporte, [mes, ano, ministerio_id, personaId, distritoId]);
    const reporteId = reporteRows[0].id_reporte;
    console.log('Reporte insertado con ID:', reporteId);

    const sqlValores = `
      INSERT INTO valorescamposreporte (id_reporte, id_tipocampo, valor) 
      VALUES ($1, $2, $3)
    `;
    const valores = Object.entries(valoresCampos).map(([id_tipocampo, valor]) => [reporteId, id_tipocampo, valor]);

    // Inserción en bloque usando un solo query
    for (const [id_reporte, id_tipocampo, valor] of valores) {
      await pool.query(sqlValores, [id_reporte, id_tipocampo, valor]);
    }

    res.json({ message: 'Reporte creado exitosamente', id_reporte: reporteId });
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
      SET mes = $1, ano = $2, ministro_id = $3 
      WHERE id_reporte = $4 RETURNING *
    `;
    await pool.query(sqlUpdate, [mes, ano, ministroId, id]);

    const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE id_reporte = $1';
    await pool.query(sqlDeleteValores, [id]);

    const sqlInsertValores = `
      INSERT INTO valorescamposreporte (id_reporte, id_tipocampo, valor) 
      VALUES ($1, $2, $3)
    `;
    for (const [id_tipocampo, valor] of Object.entries(valoresCampos)) {
      await pool.query(sqlInsertValores, [id, id_tipocampo, valor]);
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
  const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE id_reporte = $1';
  const sqlDeleteReporte = 'DELETE FROM reportesmensuales WHERE id_reporte = $1 RETURNING *';

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
      pm.id_ministerio, 
      m.nombre_ministerio, 
      p.id_persona, 
      p.id_distrito, 
      mo.numero_licencia
    FROM persona_ministerio pm
    JOIN persona p ON pm.id_persona = p.id_persona
    JOIN ministerios m ON pm.id_ministerio = m.id_ministerio
    LEFT JOIN ministrosordenados mo ON p.id_persona = mo.persona_id_ministros
    WHERE p.usuario_id = $1 AND m.nombre_ministerio = 'Ministro Ordenado'
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
      r.id_reporte, r.mes, r.ano, r.ministerio_id, r.persona_id, r.distrito_id,
      COALESCE(
        json_agg(
          json_build_object(
            'id_tipocampo', vcr.id_tipocampo,
            'nombre_campo', tc.nombre_campo,
            'valor', vcr.valor
          )
        ) FILTER (WHERE vcr.id_tipocampo IS NOT NULL), '[]'
      ) AS valores_campos
    FROM reportesmensuales r
    LEFT JOIN valorescamposreporte vcr ON r.id_reporte = vcr.id_reporte
    LEFT JOIN tiposcamposreporte tc ON vcr.id_tipocampo = tc.id_tipocampo
    WHERE r.persona_id = $1 AND r.ministerio_id = $2
    GROUP BY r.id_reporte, r.mes, r.ano, r.ministerio_id, r.persona_id, r.distrito_id
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

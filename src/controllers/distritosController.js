import pool from '../models/db.js';

// Validar si la persona existe
const verifyPersonaExists = async (personaId) => {
  const sql = 'SELECT COUNT(*) FROM persona WHERE id_persona = $1';
  try {
    const { rows } = await pool.query(sql, [personaId]);
    return rows[0].count > 0;
  } catch (err) {
    console.error('Error al verificar si la persona existe:', err);
    throw err;
  }
};

// Listar todos los distritos
export const getAllDistritos = async (req, res) => {
  const sql = 'SELECT * FROM distritos';
  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los distritos:', err);
    res.status(500).json({ error: 'Error al obtener los distritos' });
  }
};

// Obtener un distrito por ID
export const getDistritoById = async (req, res) => {
  const sql = 'SELECT * FROM distritos WHERE id_distrito = $1';
  const id = req.params.id;
  try {
    const { rows } = await pool.query(sql, [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener el distrito:', err);
    res.status(500).json({ error: 'Error al obtener el distrito' });
  }
};

// Crear un nuevo distrito con validaciones
export const createDistrito = async (req, res) => {
  const { nombre_distrito, persona_id_distrito } = req.body;

  try {
    // Verificar que la persona asignada existe
    const exists = await verifyPersonaExists(persona_id_distrito);
    if (!exists) {
      return res.status(400).json({ error: 'La persona asignada no existe.' });
    }

    const sql = 'INSERT INTO distritos (nombre_distrito, persona_id_distrito) VALUES ($1, $2) RETURNING *';
    const values = [nombre_distrito, persona_id_distrito];
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al crear el distrito:', err);
    res.status(500).json({ error: 'Error al crear el distrito' });
  }
};

// Actualizar un distrito con validaciones
export const updateDistrito = async (req, res) => {
  const id = req.params.id;
  const { nombre_distrito, persona_id_distrito } = req.body;

  try {
    // Verificar que la persona asignada existe
    const exists = await verifyPersonaExists(persona_id_distrito);
    if (!exists) {
      return res.status(400).json({ error: 'La persona asignada no existe.' });
    }

    const sql = 'UPDATE distritos SET nombre_distrito = $1, persona_id_distrito = $2 WHERE id_distrito = $3 RETURNING *';
    const values = [nombre_distrito, persona_id_distrito, id];
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al actualizar el distrito:', err);
    res.status(500).json({ error: 'Error al actualizar el distrito' });
  }
};

// Eliminar un distrito
export const deleteDistrito = async (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM distritos WHERE id_distrito = $1 RETURNING *';
  try {
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Distrito no encontrado' });
    }
    res.json({ message: 'Distrito eliminado con éxito' });
  } catch (err) {
    console.error('Error al eliminar el distrito:', err);
    res.status(500).json({ error: 'Error al eliminar el distrito' });
  }
};

// Buscar distritos por nombre o persona asignada
export const searchDistritos = async (req, res) => {
  const search = req.query.search || '';
  const sql = `
    SELECT distritos.*, persona.nombre_persona
    FROM distritos 
    LEFT JOIN persona ON distritos.persona_id_distrito = persona.id_persona
    WHERE distritos.nombre_distrito ILIKE $1 OR persona.nombre_persona ILIKE $2
  `;
  const values = [`%${search}%`, `%${search}%`];

  try {
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('Error al buscar distritos:', err);
    res.status(500).json({ error: 'Error al buscar distritos' });
  }
};

// Obtener los reportes de un distrito por ID
export const getReportesByDistrito = async (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT reportes.*, persona.nombre_persona, ministerios.nombre_ministerio
    FROM reportes
    JOIN persona ON reportes.persona_id_reporte = persona.id_persona
    JOIN ministerios ON reportes.ministerio_id_reporte = ministerios.id_ministerio
    WHERE reportes.distrito_id_reporte = $1
  `;

  try {
    const { rows } = await pool.query(sql, [id]);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los reportes del distrito:', err);
    res.status(500).json({ error: 'Error al obtener los reportes del distrito' });
  }
};

// Obtener datos de un distrito
export const getDistritoData = async (req, res) => {
  const sql = `
    SELECT 
    d.id_distrito, 
    d.nombre_distrito,
    (SELECT COUNT(*) FROM iglesias WHERE iglesias.id_distrito = d.id_distrito) AS num_iglesias,
    (SELECT COUNT(DISTINCT p.id_persona) 
        FROM persona p 
        JOIN cargo_persona cp ON p.id_persona = cp.id_persona 
        JOIN cargo c ON cp.id_cargo = c.id_cargo 
        WHERE c.nombre_cargo = 'Pastor' AND p.id_distrito = d.id_distrito) AS num_pastores,
    (SELECT COUNT(*) FROM ministerios WHERE ministerios.id_distrito = d.id_distrito) AS num_ministerios,
    (SELECT COUNT(DISTINCT p.id_persona) 
        FROM persona p 
        JOIN ministrosordenados mo ON p.id_persona = mo.persona_id_ministros 
        WHERE p.id_distrito = d.id_distrito) AS num_ministros_ordenados
FROM distritos d
WHERE d.nombre_distrito != 'Área General'

UNION ALL

SELECT 
    3 AS id_distrito, 
    'Área General' AS nombre_distrito,
    SUM(iglesias_count) AS num_iglesias,
    SUM(pastores_count) AS num_pastores,
    SUM(ministerios_count) AS num_ministerios,
    SUM(ministros_count) AS num_ministros_ordenados
FROM (
    SELECT 
        (SELECT COUNT(*) FROM iglesias WHERE iglesias.id_distrito = d.id_distrito) AS iglesias_count,
        (SELECT COUNT(DISTINCT p.id_persona) 
            FROM persona p 
            JOIN cargo_persona cp ON p.id_persona = cp.id_persona 
            JOIN cargo c ON cp.id_cargo = c.id_cargo 
            WHERE c.nombre_cargo = 'Pastor' AND p.id_distrito = d.id_distrito) AS pastores_count,
        (SELECT COUNT(*) FROM ministerios WHERE ministerios.id_distrito = d.id_distrito) AS ministerios_count,
        (SELECT COUNT(DISTINCT p.id_persona) 
            FROM persona p 
            JOIN ministrosordenados mo ON p.id_persona = mo.persona_id_ministros 
            WHERE p.id_distrito = d.id_distrito) AS ministros_count
    FROM distritos d
    WHERE d.id_distrito IN (1, 2)
) AS suma;
  `;

  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo datos de los distritos:', err);
    res.status(500).json({ error: 'Error obteniendo datos de los distritos.' });
  }
};

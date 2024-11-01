import pool from '../models/db.js';

// Validar si la persona existe
const verifyPersonaExists = async (personaId) => {
  const sql = 'SELECT COUNT(*) FROM persona WHERE Id_Persona = $1';
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
  const sql = 'SELECT * FROM distritos WHERE Id_Distrito = $1';
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
  const { Nombre_Distrito, persona_id_distrito } = req.body;

  try {
    // Verificar que la persona asignada existe
    const exists = await verifyPersonaExists(persona_id_distrito);
    if (!exists) {
      return res.status(400).json({ error: 'La persona asignada no existe.' });
    }

    const sql = 'INSERT INTO distritos (Nombre_Distrito, persona_id_distrito) VALUES ($1, $2) RETURNING *';
    const values = [Nombre_Distrito, persona_id_distrito];
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
  const { Nombre_Distrito, persona_id_distrito } = req.body;

  try {
    // Verificar que la persona asignada existe
    const exists = await verifyPersonaExists(persona_id_distrito);
    if (!exists) {
      return res.status(400).json({ error: 'La persona asignada no existe.' });
    }

    const sql = 'UPDATE distritos SET Nombre_Distrito = $1, persona_id_distrito = $2 WHERE Id_Distrito = $3 RETURNING *';
    const values = [Nombre_Distrito, persona_id_distrito, id];
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
  const sql = 'DELETE FROM distritos WHERE Id_Distrito = $1 RETURNING *';
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
    SELECT distritos.*, persona.Nombre_Persona
    FROM distritos 
    LEFT JOIN persona ON distritos.persona_id_distrito = persona.Id_Persona
    WHERE distritos.Nombre_Distrito ILIKE $1 OR persona.Nombre_Persona ILIKE $2
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
    SELECT reportes.*, persona.Nombre_Persona, ministerios.Nombre_Ministerio
    FROM reportes
    JOIN persona ON reportes.persona_id_reporte = persona.Id_Persona
    JOIN ministerios ON reportes.ministerio_id_reporte = ministerios.Id_Ministerio
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
        d.Id_Distrito, 
        d.Nombre_Distrito,
        (SELECT COUNT(*) FROM iglesias WHERE iglesias.Id_Distrito = d.Id_Distrito) AS num_iglesias,
        (SELECT COUNT(DISTINCT p.Id_Persona) 
            FROM persona p 
            JOIN cargo_persona cp ON p.Id_Persona = cp.Id_Persona 
            JOIN cargo c ON cp.Id_Cargo = c.Id_Cargo 
            WHERE c.Nombre_Cargo = 'Pastor' AND p.Id_Distrito = d.Id_Distrito) AS num_pastores,
        (SELECT COUNT(*) FROM ministerios WHERE ministerios.Id_Distrito = d.Id_Distrito) AS num_ministerios,
        (SELECT COUNT(DISTINCT p.Id_Persona) 
            FROM persona p 
            JOIN ministrosordenados mo ON p.Id_Persona = mo.Persona_Id_Ministros 
            WHERE p.Id_Distrito = d.Id_Distrito) AS num_ministros_ordenados
    FROM distritos d
    WHERE d.Nombre_Distrito != 'Área General'

    UNION ALL

    SELECT 
        3 AS Id_Distrito, 
        'Área General' AS Nombre_Distrito,
        SUM(iglesias_count) AS num_iglesias,
        SUM(pastores_count) AS num_pastores,
        SUM(ministerios_count) AS num_ministerios,
        SUM(ministros_count) AS num_ministros_ordenados
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM iglesias WHERE iglesias.Id_Distrito = d.Id_Distrito) AS iglesias_count,
            (SELECT COUNT(DISTINCT p.Id_Persona) 
                FROM persona p 
                JOIN cargo_persona cp ON p.Id_Persona = cp.Id_Persona 
                JOIN cargo c ON cp.Id_Cargo = c.Id_Cargo 
                WHERE c.Nombre_Cargo = 'Pastor' AND p.Id_Distrito = d.Id_Distrito) AS pastores_count,
            (SELECT COUNT(*) FROM ministerios WHERE ministerios.Id_Distrito = d.Id_Distrito) AS ministerios_count,
            (SELECT COUNT(DISTINCT p.Id_Persona) 
                FROM persona p 
                JOIN ministrosordenados mo ON p.Id_Persona = mo.Persona_Id_Ministros 
                WHERE p.Id_Distrito = d.Id_Distrito) AS ministros_count
        FROM distritos d
        WHERE d.Id_Distrito IN (1, 2)
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

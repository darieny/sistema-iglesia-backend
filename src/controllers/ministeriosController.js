import pool from '../models/db.js';

// Obtener todos los ministerios para las cards, incluyendo el nombre del distrito
export const getAllMinisterios = async (req, res) => {
  const sql = `
    SELECT ministerios.Id_Ministerio, 
           ministerios.Nombre_Ministerio, 
           ministerios.Descripcion, 
           ministerios.Id_Distrito, 
           distritos.Nombre_Distrito
    FROM ministerios
    LEFT JOIN distritos ON ministerios.Id_Distrito = distritos.Id_Distrito;
  `;
  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los ministerios:', err);
    res.status(500).json({ error: 'Error al obtener los ministerios' });
  }
};

// Crear un nuevo ministerio
export const createMinisterio = async (req, res) => {
  const { Nombre_Ministerio, Descripcion, Id_Distrito, persona_id_director } = req.body;

  if (!Nombre_Ministerio) {
    return res.status(400).json({ error: 'El nombre del ministerio es obligatorio' });
  }

  const sql = `
    INSERT INTO ministerios (Nombre_Ministerio, Descripcion, Id_Distrito, persona_id_director) 
    VALUES ($1, $2, $3, $4) RETURNING *
  `;
  const values = [Nombre_Ministerio, Descripcion || null, Id_Distrito || null, persona_id_director || null];

  try {
    const { rows } = await pool.query(sql, values);
    const newMinisterio = rows[0];
    res.json({
      id: newMinisterio.id_ministerio,
      Nombre_Ministerio: newMinisterio.nombre_ministerio,
      Descripcion: newMinisterio.descripcion || 'Sin descripción',
      Id_Distrito: newMinisterio.id_distrito,
      persona_id_director: newMinisterio.persona_id_director
    });
  } catch (err) {
    console.error('Error al crear ministerio:', err);
    res.status(500).json({ error: 'Error al crear ministerio' });
  }
};

// Obtener un ministerio por ID
export const getMinisterioById = async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM ministerios WHERE Id_Ministerio = $1';

  try {
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ministerio no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener el ministerio:', err);
    res.status(500).json({ error: 'Error al obtener el ministerio' });
  }
};

// Obtener el ministerio_id de "Ministro Ordenado" por nombre
export const getMinistroOrdenadoId = async (req, res) => {
  const sql = `SELECT Id_Ministerio FROM ministerios WHERE Nombre_Ministerio = 'Ministro Ordenado'`;

  try {
    const { rows } = await pool.query(sql);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ministerio Ordenado no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener el ministerio de Ministros Ordenados:', err);
    res.status(500).json({ error: 'Error al obtener el ministerio de Ministros Ordenados' });
  }
};

// Buscar ministerios
export const searchMinisterios = async (req, res) => {
  const search = req.query.search || '';
  const sql = `
    SELECT * FROM ministerios 
    WHERE Nombre_Ministerio ILIKE $1 OR Descripcion ILIKE $2
  `;
  const values = [`%${search}%`, `%${search}%`];

  try {
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('Error al buscar ministerios:', err);
    res.status(500).json({ error: 'Error al buscar ministerios' });
  }
};

// Obtener todos los ministerios, excluyendo "Ministro Ordenado"
export const getMinisterios = async (req, res) => {
  const { Usuario_ID } = req.query;
  console.log("Usuario_ID recibido en la petición:", Usuario_ID);

  const sql = `
    SELECT m.Id_Ministerio, m.Nombre_Ministerio
    FROM ministerios m
    JOIN persona_ministerio pm ON pm.Id_Ministerio = m.Id_Ministerio
    JOIN persona p ON p.Id_Persona = pm.Id_Persona
    JOIN cargo_persona cp ON cp.Id_Persona = p.Id_Persona
    JOIN cargo c ON c.Id_Cargo = cp.Id_Cargo
    WHERE p.Usuario_ID = $1 
      AND m.Nombre_Ministerio != 'Ministro Ordenado'
  `;

  try {
    const { rows } = await pool.query(sql, [Usuario_ID]);
    console.log("Ministerios obtenidos para el usuario:", rows);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los ministerios del usuario:', err);
    res.status(500).json({ error: 'Error al obtener los ministerios del usuario' });
  }
};

// Obtener reportes con nombre de la persona que los envió
export const getReportesByMinisterio = async (req, res) => {
  const { ministerioId } = req.params;

  const sql = `
    SELECT r.Id_Reporte, r.Mes, r.Ano, 
           p.Nombre_Persona 
    FROM reportesmensuales r
    JOIN persona p ON r.Persona_Id = p.Id_Persona
    WHERE r.Ministerio_Id = $1
  `;

  try {
    const { rows } = await pool.query(sql, [ministerioId]);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los reportes:', err);
    res.status(500).json({ error: 'Error al obtener los reportes' });
  }
};

import pool from '../models/db.js';

// Obtener todos los subministerios
export const getAllSubministerios = async (req, res) => {
  const sql = 'SELECT * FROM subministerios';
  
  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los subministerios:', err);
    res.status(500).json({ error: 'Error al obtener los subministerios' });
  }
};

// Crear un nuevo subministerio
export const createSubministerio = async (req, res) => {
  const { Nombre_Subministerio, id_ministerio, Id_Persona_Director } = req.body;
  
  console.log('Datos recibidos en el backend:', { Nombre_Subministerio, id_ministerio, Id_Persona_Director });

  if (!Nombre_Subministerio || !id_ministerio || !Id_Persona_Director) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const sql = `
    INSERT INTO subministerios (Nombre_Subministerio, id_ministerio, Id_Persona_Director) 
    VALUES ($1, $2, $3) RETURNING Id_Subministerio
  `;

  try {
    const { rows } = await pool.query(sql, [Nombre_Subministerio, id_ministerio, Id_Persona_Director]);
    res.status(201).json({ message: 'Subministerio agregado exitosamente', id: rows[0].id_subministerio });
  } catch (err) {
    console.error('Error al crear subministerio:', err);
    res.status(500).json({ error: 'Error al crear subministerio' });
  }
};

// Obtener un subministerio por ID
export const getSubministerioById = async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM subministerios WHERE Id_Subministerio = $1';

  try {
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subministerio no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener el subministerio:', err);
    res.status(500).json({ error: 'Error al obtener el subministerio' });
  }
};

// Buscar subministerios
export const searchSubministerios = async (req, res) => {
  const search = req.query.search || '';
  const sql = 'SELECT * FROM subministerios WHERE Nombre_Subministerio ILIKE $1';
  const values = [`%${search}%`];

  try {
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('Error al buscar subministerios:', err);
    res.status(500).json({ error: 'Error al buscar subministerios' });
  }
};

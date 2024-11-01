import pool from '../models/db.js';
import multer from 'multer';

// Multer para almacenar las fotos en una carpeta llamada "fotosIglesias"
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'fotosIglesias/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

export const uploadIglesia = multer({ storage });

// Listar todas las iglesias
export const getAllIglesias = async (req, res) => {
  const sql = `
    SELECT iglesias.*, 
           persona.nombre_persona AS nombre_pastor
    FROM iglesias
    LEFT JOIN persona ON iglesias.id_iglesia = persona.id_iglesia
    LEFT JOIN cargo_persona cp ON persona.id_persona = cp.id_persona
    LEFT JOIN cargo ON cp.id_cargo = cargo.id_cargo AND cargo.nombre_cargo = 'Pastor'
    GROUP BY iglesias.id_iglesia, persona.nombre_persona;
  `;

  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener iglesias con pastores:', err);
    res.status(500).json({ error: 'Error al obtener iglesias.' });
  }
};

// Obtener una iglesia por ID
export const getIglesiaById = async (req, res) => {
  const id = req.params.id;

  const iglesiaSql = `
    SELECT iglesias.id_iglesia, iglesias.nombre_iglesia, iglesias.direccion_iglesia, iglesias.foto_iglesia, iglesias.puntogps, iglesias.id_distrito, 
           persona.nombre_persona AS nombre_pastor, 
           distritos.nombre_distrito,
           array_agg(cargo.nombre_cargo) AS cargos
    FROM iglesias 
    LEFT JOIN persona ON iglesias.id_iglesia = persona.id_iglesia 
    LEFT JOIN distritos ON iglesias.id_distrito = distritos.id_distrito
    LEFT JOIN cargo_persona cp ON persona.id_persona = cp.id_persona
    LEFT JOIN cargo ON cp.id_cargo = cargo.id_cargo AND cargo.nombre_cargo = 'Pastor' 
    WHERE iglesias.id_iglesia = $1 
    GROUP BY iglesias.id_iglesia, persona.nombre_persona, distritos.nombre_distrito;
  `;

  const bienesSql = `
    SELECT bienes.nombre_bienes, bienes.tipo_bienes 
    FROM bienes 
    WHERE bienes.iglesia_id_bienes = $1;
  `;

  try {
    const iglesiaResults = await pool.query(iglesiaSql, [id]);

    if (iglesiaResults.rows.length === 0) {
      return res.status(404).json({ message: 'Iglesia no encontrada' });
    }

    const bienesResults = await pool.query(bienesSql, [id]);
    const iglesia = iglesiaResults.rows[0];
    iglesia.bienes = bienesResults.rows;
    res.json(iglesia);
  } catch (err) {
    console.error('Error al obtener la iglesia:', err);
    res.status(500).json({ error: 'Error al obtener la iglesia.' });
  }
};

// Crear una nueva iglesia
export const createIglesia = async (req, res) => {
  const { nombre_iglesia, direccion_iglesia, puntogps, id_distrito } = req.body;
  const fotoIgle = req.file ? `/fotosIglesias/${req.file.filename}` : null;

  const sql = `
    INSERT INTO iglesias (nombre_iglesia, direccion_iglesia, puntogps, foto_iglesia, id_distrito) 
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `;
  const values = [nombre_iglesia, direccion_iglesia, puntogps, fotoIgle, id_distrito];

  try {
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al crear la iglesia:', err);
    res.status(500).json({ error: 'Error al crear la iglesia' });
  }
};

// Actualizar una iglesia
export const updateIglesia = async (req, res) => {
  const id = req.params.id;
  const { nombre_iglesia, direccion_iglesia, puntogps, id_distrito } = req.body;
  const fotoIgle = req.file ? `/fotosIglesias/${req.file.filename}` : req.body.foto;

  const sql = `
    UPDATE iglesias 
    SET nombre_iglesia = $1, direccion_iglesia = $2, puntogps = $3, foto_iglesia = $4, id_distrito = $5 
    WHERE id_iglesia = $6 RETURNING *
  `;
  const values = [nombre_iglesia, direccion_iglesia, puntogps, fotoIgle, id_distrito, id];

  try {
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al actualizar la iglesia:', err);
    res.status(500).json({ error: 'Error al actualizar la iglesia' });
  }
};

// Eliminar una iglesia
export const deleteIglesia = async (req, res) => {
  const id = req.params.id;

  const updatePersonasSql = 'UPDATE persona SET id_iglesia = NULL WHERE id_iglesia = $1';
  const deleteIglesiaSql = 'DELETE FROM iglesias WHERE id_iglesia = $1 RETURNING *';

  try {
    await pool.query(updatePersonasSql, [id]);
    const { rows } = await pool.query(deleteIglesiaSql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Iglesia no encontrada' });
    }
    res.json({ message: 'Iglesia eliminada con éxito.' });
  } catch (err) {
    console.error('Error al eliminar la iglesia:', err);
    res.status(500).json({ message: 'Error al eliminar la iglesia.' });
  }
};

// Buscar iglesias
export const searchIglesias = async (req, res) => {
  const search = req.query.search || '';
  const sql = `
    SELECT * FROM iglesias 
    WHERE nombre_iglesia ILIKE $1 OR direccion_iglesia ILIKE $2 OR puntogps ILIKE $3
  `;
  const values = [`%${search}%`, `%${search}%`, `%${search}%`];

  try {
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('Error al buscar iglesias:', err);
    res.status(500).json({ error: 'Error al buscar iglesias' });
  }
};

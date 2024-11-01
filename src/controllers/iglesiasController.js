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
           persona.Nombre_Persona AS Nombre_Pastor
    FROM iglesias
    LEFT JOIN persona ON iglesias.Id_Iglesia = persona.id_iglesia
    LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
    LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo AND cargo.Nombre_Cargo = 'Pastor'
    GROUP BY iglesias.Id_Iglesia, persona.Nombre_Persona;
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
    SELECT iglesias.Id_Iglesia, iglesias.Nombre_Iglesia, iglesias.Direccion_Iglesia, iglesias.Foto_Iglesia, iglesias.PuntoGPS, iglesias.Id_Distrito, 
           persona.Nombre_Persona AS Nombre_Pastor, 
           distritos.Nombre_Distrito,
           array_agg(cargo.Nombre_Cargo) AS Cargos
    FROM iglesias 
    LEFT JOIN persona ON iglesias.Id_Iglesia = persona.id_iglesia 
    LEFT JOIN distritos ON iglesias.Id_Distrito = distritos.Id_Distrito
    LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
    LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo AND cargo.Nombre_Cargo = 'Pastor' 
    WHERE iglesias.Id_Iglesia = $1 
    GROUP BY iglesias.Id_Iglesia, persona.Nombre_Persona, distritos.Nombre_Distrito;
  `;

  const bienesSql = `
    SELECT bienes.Nombre_Bienes, bienes.Tipo_Bienes 
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
  const { Nombre_Iglesia, Direccion_Iglesia, PuntoGPS, Id_Distrito } = req.body;
  const fotoIgle = req.file ? `/fotosIglesias/${req.file.filename}` : null;

  const sql = `
    INSERT INTO iglesias (Nombre_Iglesia, Direccion_Iglesia, PuntoGPS, Foto_Iglesia, Id_Distrito) 
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `;
  const values = [Nombre_Iglesia, Direccion_Iglesia, PuntoGPS, fotoIgle, Id_Distrito];

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
  const { Nombre_Iglesia, Direccion_Iglesia, PuntoGPS, Id_Distrito } = req.body;
  const fotoIgle = req.file ? `/fotosIglesias/${req.file.filename}` : req.body.foto;

  const sql = `
    UPDATE iglesias 
    SET Nombre_Iglesia = $1, Direccion_Iglesia = $2, PuntoGPS = $3, Foto_Iglesia = $4, Id_Distrito = $5 
    WHERE Id_Iglesia = $6 RETURNING *
  `;
  const values = [Nombre_Iglesia, Direccion_Iglesia, PuntoGPS, fotoIgle, Id_Distrito, id];

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
  const deleteIglesiaSql = 'DELETE FROM iglesias WHERE Id_Iglesia = $1 RETURNING *';

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
    WHERE Nombre_Iglesia ILIKE $1 OR Direccion_Iglesia ILIKE $2 OR PuntoGPS ILIKE $3
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

import pool from '../models/db.js';

// Validar si la iglesia existe
const verifyIglesiaExists = async (iglesiaId) => {
  const sql = 'SELECT COUNT(*) FROM iglesias WHERE Id_Iglesia = $1';
  try {
    const { rows } = await pool.query(sql, [iglesiaId]);
    return rows[0].count > 0;
  } catch (err) {
    console.error('Error al verificar si la iglesia existe:', err);
    throw err;
  }
};

export const getAllBienes = async (req, res) => {
  const distritoId = req.query.distritoId || null;
  const iglesiaId = req.query.iglesiaId || null;
  const userRole = req.query.userRole || '';

  let sql = `
    SELECT bienes.*, iglesias.Nombre_Iglesia 
    FROM bienes
    LEFT JOIN iglesias ON bienes.iglesia_id_bienes = iglesias.Id_Iglesia
  `;

  // Filtro según el rol del usuario
  if (userRole.includes('Administrador')) {
    sql += ';';
  } else if (userRole.includes('Supervisor de Distrito')) {
    sql += ` WHERE iglesias.Id_Distrito = $1;`;
  } else if (userRole.includes('Pastor')) {
    if (iglesiaId) {
      sql += ` WHERE bienes.iglesia_id_bienes = $1;`;
    } else {
      return res.status(200).json([]); // Si no tiene iglesia asignada, no mostramos bienes
    }
  } else {
    return res.status(403).json({ message: 'No tienes permiso para ver los bienes' });
  }

  try {
    const values = userRole.includes('Supervisor de Distrito') || userRole.includes('Pastor') ? [distritoId || iglesiaId] : [];
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los bienes:', err);
    res.status(500).json({ error: 'Error al obtener los bienes' });
  }
};

export const getBienById = async (req, res) => {
  const sql = `
    SELECT bienes.*, iglesias.Nombre_Iglesia 
    FROM bienes 
    LEFT JOIN iglesias ON bienes.iglesia_id_bienes = iglesias.Id_Iglesia 
    WHERE bienes.Id_Bienes = $1
  `;
  const id = req.params.id;

  try {
    const { rows } = await pool.query(sql, [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener el bien:', err);
    res.status(500).json({ error: 'Error al obtener el bien' });
  }
};

export const createBien = async (req, res) => {
  const { Nombre_Bienes, Tipo_Bienes, Ubicacion_Bienes, Fecha_Adquisicion, Valor_Quetzales, Descripcion, Estado_Bienes, iglesia_id_bienes } = req.body;

  if (Valor_Quetzales <= 0) {
    return res.status(400).json({ error: 'El valor en Quetzales debe ser un número positivo.' });
  }

  const fechaActual = new Date();
  if (new Date(Fecha_Adquisicion) > fechaActual) {
    return res.status(400).json({ error: 'La fecha de adquisición no puede ser en el futuro.' });
  }

  try {
    const exists = await verifyIglesiaExists(iglesia_id_bienes);
    if (!exists) {
      return res.status(400).json({ error: 'La iglesia asignada no existe.' });
    }

    const sql = `
      INSERT INTO bienes (Nombre_Bienes, Tipo_Bienes, Ubicacion_Bienes, Fecha_Adquisicion, Valor_Quetzales, Descripcion, Estado_Bienes, iglesia_id_bienes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `;
    const values = [Nombre_Bienes, Tipo_Bienes, Ubicacion_Bienes, Fecha_Adquisicion, Valor_Quetzales, Descripcion, Estado_Bienes, iglesia_id_bienes];
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al crear el bien:', err);
    res.status(500).json({ error: 'Error al crear el bien' });
  }
};

export const updateBien = async (req, res) => {
  const id = req.params.id;
  const { Nombre_Bienes, Tipo_Bienes, Ubicacion_Bienes, Fecha_Adquisicion, Valor_Quetzales, Descripcion, Estado_Bienes, iglesia_id_bienes } = req.body;

  if (Valor_Quetzales <= 0) {
    return res.status(400).json({ error: 'El valor en Quetzales debe ser un número positivo.' });
  }

  const fechaActual = new Date();
  if (new Date(Fecha_Adquisicion) > fechaActual) {
    return res.status(400).json({ error: 'La fecha de adquisición no puede ser en el futuro.' });
  }

  try {
    const exists = await verifyIglesiaExists(iglesia_id_bienes);
    if (!exists) {
      return res.status(400).json({ error: 'La iglesia asignada no existe.' });
    }

    const sql = `
      UPDATE bienes 
      SET Nombre_Bienes = $1, Tipo_Bienes = $2, Ubicacion_Bienes = $3, Fecha_Adquisicion = $4, 
          Valor_Quetzales = $5, Descripcion = $6, Estado_Bienes = $7, iglesia_id_bienes = $8 
      WHERE Id_Bienes = $9 RETURNING *
    `;
    const values = [Nombre_Bienes, Tipo_Bienes, Ubicacion_Bienes, Fecha_Adquisicion, Valor_Quetzales, Descripcion, Estado_Bienes, iglesia_id_bienes, id];
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al actualizar el bien:', err);
    res.status(500).json({ error: 'Error al actualizar el bien' });
  }
};

export const deleteBien = async (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM bienes WHERE Id_Bienes = $1 RETURNING *';
  try {
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bien no encontrado' });
    }
    res.json({ message: 'Bien eliminado con éxito' });
  } catch (err) {
    console.error('Error al eliminar el bien:', err);
    res.status(500).json({ error: 'Error al eliminar el bien' });
  }
};

export const searchBienes = async (req, res) => {
  const search = req.query.search || '';
  const sql = `
    SELECT bienes.*, iglesias.Nombre_Iglesia 
    FROM bienes 
    LEFT JOIN iglesias ON bienes.iglesia_id_bienes = iglesias.Id_Iglesia 
    WHERE bienes.Nombre_Bienes ILIKE $1 OR bienes.Tipo_Bienes ILIKE $2 OR iglesias.Nombre_Iglesia ILIKE $3
  `;
  const values = [`%${search}%`, `%${search}%`, `%${search}%`];

  try {
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('Error al buscar bienes:', err);
    res.status(500).json({ error: 'Error al buscar bienes' });
  }
};

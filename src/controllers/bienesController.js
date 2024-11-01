import pool from '../models/db.js';

// Validar si la iglesia existe
const verifyIglesiaExists = async (iglesiaId) => {
  const sql = 'SELECT COUNT(*) FROM iglesias WHERE id_iglesia = $1';
  try {
    const { rows } = await pool.query(sql, [iglesiaId]);
    return rows[0].count > 0;
  } catch (err) {
    console.error('Error al verificar si la iglesia existe:', err);
    throw err;
  }
};

export const getAllBienes = async (req, res) => {
  const distritoId = req.query.distritoid || null;
  const iglesiaId = req.query.iglesiaid || null;
  const userRole = req.query.userrole || '';

  let sql = `
    SELECT bienes.*, iglesias.nombre_iglesia 
    FROM bienes
    LEFT JOIN iglesias ON bienes.iglesia_id_bienes = iglesias.id_iglesia
  `;

  // Filtro según el rol del usuario
  if (userRole.includes('Administrador')) {
    sql += ';';
  } else if (userRole.includes('Supervisor de Distrito')) {
    sql += ` WHERE iglesias.id_distrito = $1;`;
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
    SELECT bienes.*, iglesias.nombre_iglesia 
    FROM bienes 
    LEFT JOIN iglesias ON bienes.iglesia_id_bienes = iglesias.id_iglesia 
    WHERE bienes.id_bienes = $1
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
  const { nombre_bienes, tipo_bienes, ubicacion_bienes, fecha_adquisicion, valor_quetzales, descripcion, estado_bienes, iglesia_id_bienes } = req.body;

  if (valor_quetzales <= 0) {
    return res.status(400).json({ error: 'El valor en Quetzales debe ser un número positivo.' });
  }

  const fechaActual = new Date();
  if (new Date(fecha_adquisicion) > fechaActual) {
    return res.status(400).json({ error: 'La fecha de adquisición no puede ser en el futuro.' });
  }

  try {
    const exists = await verifyIglesiaExists(iglesia_id_bienes);
    if (!exists) {
      return res.status(400).json({ error: 'La iglesia asignada no existe.' });
    }

    const sql = `
      INSERT INTO bienes (nombre_bienes, tipo_bienes, ubicacion_bienes, fecha_adquisicion, valor_quetzales, descripcion, estado_bienes, iglesia_id_bienes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `;
    const values = [nombre_bienes, tipo_bienes, ubicacion_bienes, fecha_adquisicion, valor_quetzales, descripcion, estado_bienes, iglesia_id_bienes];
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al crear el bien:', err);
    res.status(500).json({ error: 'Error al crear el bien' });
  }
};

export const updateBien = async (req, res) => {
  const id = req.params.id;
  const { nombre_bienes, tipo_bienes, ubicacion_bienes, fecha_adquisicion, valor_quetzales, descripcion, estado_bienes, iglesia_id_bienes } = req.body;

  if (valor_quetzales <= 0) {
    return res.status(400).json({ error: 'El valor en Quetzales debe ser un número positivo.' });
  }

  const fechaActual = new Date();
  if (new Date(fecha_adquisicion) > fechaActual) {
    return res.status(400).json({ error: 'La fecha de adquisición no puede ser en el futuro.' });
  }

  try {
    const exists = await verifyIglesiaExists(iglesia_id_bienes);
    if (!exists) {
      return res.status(400).json({ error: 'La iglesia asignada no existe.' });
    }

    const sql = `
      UPDATE bienes 
      SET nombre_bienes = $1, tipo_bienes = $2, ubicacion_bienes = $3, fecha_adquisicion = $4, 
          valor_quetzales = $5, descripcion = $6, estado_bienes = $7, iglesia_id_bienes = $8 
      WHERE id_bienes = $9 RETURNING *
    `;
    const values = [nombre_bienes, tipo_bienes, ubicacion_bienes, fecha_adquisicion, valor_quetzales, descripcion, estado_bienes, iglesia_id_bienes, id];
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al actualizar el bien:', err);
    res.status(500).json({ error: 'Error al actualizar el bien' });
  }
};

export const deleteBien = async (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM bienes WHERE id_bienes = $1 RETURNING *';
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
    SELECT bienes.*, iglesias.nombre_iglesia 
    FROM bienes 
    LEFT JOIN iglesias ON bienes.iglesia_id_bienes = iglesias.id_iglesia 
    WHERE bienes.nombre_bienes ILIKE $1 OR bienes.tipo_bienes ILIKE $2 OR iglesias.nombre_iglesia ILIKE $3
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

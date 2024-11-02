import pool from '../models/db.js';

// Crear campos
export const createCamposReporte = async (req, res) => {
  const { ministerio_id, campos } = req.body;
  console.log('Datos recibidos en el backend:', req.body);

  if (!ministerio_id || !campos || campos.length === 0) {
    return res.status(400).json({ error: 'Ministerio y al menos un campo son requeridos' });
  }

  // Construir la consulta de inserción con múltiples valores
  const sql = `
    INSERT INTO tiposcamposreporte (ministerio_id, nombre_campo, tipo_dato) 
    VALUES ${campos.map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`).join(', ')}
  `;
  const values = campos.flatMap(campo => [ministerio_id, campo.nombreCampo, campo.tipoDato]);

  try {
    await pool.query(sql, values);
    res.status(201).json({ message: 'Campos creados exitosamente' });
  } catch (err) {
    console.error('Error al crear los campos:', err);
    res.status(500).json({ error: 'Error al crear los campos' });
  }
};

// Obtener los campos de un ministerio
export const getCamposPorMinisterio = async (req, res) => {
  const { ministerio_id } = req.params;
  const sql = 'SELECT id_tipocampo, nombre_campo, tipo_dato FROM tiposcamposreporte WHERE ministerio_id = $1';

  try {
    const { rows } = await pool.query(sql, [ministerio_id]);
    res.json(rows); // Enviando los campos al frontend
  } catch (err) {
    console.error('Error al obtener los campos:', err);
    res.status(500).json({ error: 'Error al obtener los campos' });
  }
};

// Guardar los valores de los campos de un reporte
export const saveValoresCamposReporte = async (req, res) => {
  const { id_reporte, valores } = req.body;

  console.log('Datos recibidos para guardar los valores:', req.body);

  if (!id_reporte || !valores?.length) {
    return res.status(400).json({ error: 'Datos inválidos para guardar los valores de los campos' });
  }

  // Construir la consulta de inserción con múltiples valores
  const sql = `
    INSERT INTO valorescamposreporte (id_reporte, id_tipocampo, valor) 
    VALUES ${valores.map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`).join(', ')}
  `;
  const values = valores.flatMap(v => [id_reporte, v.id_tipocampo, v.valor]);

  try {
    await pool.query(sql, values);
    res.json({ message: 'Valores de los campos insertados exitosamente' });
  } catch (err) {
    console.error('Error al insertar los valores de los campos del reporte:', err);
    res.status(500).json({ error: 'Error al insertar los valores de los campos del reporte' });
  }
};

// Obtener los valores de los campos de un reporte específico
export const getValoresCamposPorReporte = async (req, res) => {
  const { id_reporte } = req.params;
  console.log('ID de reporte recibido:', id_reporte);
  const sql = `
    SELECT valorescamposreporte.id_tipocampo, tiposcamposreporte.nombre_campo, valorescamposreporte.valor
    FROM valorescamposreporte
    INNER JOIN tiposcamposreporte ON valorescamposreporte.id_tipocampo = tiposcamposreporte.id_tipocampo
    WHERE valorescamposreporte.id_reporte = $1
  `;

  try {
    const { rows } = await pool.query(sql, [id_reporte]);
    console.log('Datos obtenidos para valoresCampos:', rows);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los valores de los campos del reporte:', err);
    res.status(500).json({ error: 'Error al obtener los valores de los campos del reporte' });
  }
};

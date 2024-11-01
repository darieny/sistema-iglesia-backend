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
    INSERT INTO tiposcamposreporte (ministerio_id, Nombre_Campo, Tipo_Dato) 
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
  const sql = 'SELECT Id_TipoCampo, Nombre_Campo, Tipo_Dato FROM tiposcamposreporte WHERE ministerio_id = $1';

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
  const { Id_Reporte, valores } = req.body;

  console.log('Datos recibidos para guardar los valores:', req.body);

  if (!Id_Reporte || !valores?.length) {
    return res.status(400).json({ error: 'Datos inválidos para guardar los valores de los campos' });
  }

  // Construir la consulta de inserción con múltiples valores
  const sql = `
    INSERT INTO valorescamposreporte (Id_Reporte, Id_TipoCampo, Valor) 
    VALUES ${valores.map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`).join(', ')}
  `;
  const values = valores.flatMap(v => [Id_Reporte, v.Id_TipoCampo, v.Valor]);

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
  const { Id_Reporte } = req.params;
  const sql = `
    SELECT valorescamposreporte.Id_TipoCampo, tiposcamposreporte.Nombre_Campo, valorescamposreporte.Valor
    FROM valorescamposreporte
    INNER JOIN tiposcamposreporte ON valorescamposreporte.Id_TipoCampo = tiposcamposreporte.Id_TipoCampo
    WHERE valorescamposreporte.Id_Reporte = $1
  `;

  try {
    const { rows } = await pool.query(sql, [Id_Reporte]);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los valores de los campos del reporte:', err);
    res.status(500).json({ error: 'Error al obtener los valores de los campos del reporte' });
  }
};

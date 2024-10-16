import connection from '../models/db.js';

//Crear campos
export const createCamposReporte = (req, res) => {
    const { ministerio_id, campos } = req.body;
    console.log('Datos recibidos en el backend:', req.body);

    if (!ministerio_id || !campos || campos.length === 0) {
        return res.status(400).json({ error: 'Ministerio y al menos un campo son requeridos' });
    }

    const sql = 'INSERT INTO tiposcamposreporte (ministerio_id, Nombre_Campo, Tipo_Dato) VALUES ?';
    const valores = campos.map(campo => [ministerio_id, campo.nombreCampo, campo.tipoDato]);

    connection.query(sql, [valores], (err, result) => {
        if (err) {
            console.error('Error al crear los campos:', err);
            return res.status(500).json({ error: 'Error al crear los campos' });
        }
        res.status(201).json({ message: 'Campos creados exitosamente' });
    });
};

// Obtener los campos de un ministerio
export const getCamposPorMinisterio = (req, res) => {
    const { ministerio_id } = req.params;
    const sql = 'SELECT Id_TipoCampo, Nombre_Campo, Tipo_Dato FROM tiposcamposreporte WHERE ministerio_id = ?';

    connection.query(sql, [ministerio_id], (err, result) => {
        if (err) {
            console.error('Error al obtener los campos:', err);
            return res.status(500).json({ error: 'Error al obtener los campos' });
        }
        res.json(result);  // Enviando los campos al frontend
    });
};

// Guardar los valores de los campos de un reporte
export const saveValoresCamposReporte = (req, res) => {
    const { Id_Reporte, valores } = req.body;
  
    // Agrega este console.log para verificar lo que está recibiendo el backend
    console.log('Datos recibidos para guardar los valores:', req.body);
  
    if (!Id_Reporte || !valores || !valores.length) {
      return res.status(400).json({ error: 'Datos inválidos para guardar los valores de los campos' });
    }
  
    const sql = 'INSERT INTO valorescamposreporte (Id_Reporte, Id_TipoCampo, Valor) VALUES ?';
    const values = valores.map(v => [Id_Reporte, v.Id_TipoCampo, v.Valor]);
  
    connection.query(sql, [values], (err, result) => {
      if (err) {
        console.error('Error al insertar los valores de los campos del reporte:', err);
        return res.status(500).json({ error: 'Error al insertar los valores de los campos del reporte' });
      }
  
      res.json({ message: 'Valores de los campos insertados exitosamente' });
    });
  };

  // Obtener los valores de los campos de un reporte específico
export const getValoresCamposPorReporte = (req, res) => {
    const { Id_Reporte } = req.params;
    const sql = `
      SELECT valorescamposreporte.Id_TipoCampo, tiposcamposreporte.Nombre_Campo, valorescamposreporte.Valor
      FROM valorescamposreporte
      INNER JOIN tiposcamposreporte ON valorescamposreporte.Id_TipoCampo = tiposcamposreporte.Id_TipoCampo
      WHERE valorescamposreporte.Id_Reporte = ?
    `;
  
    connection.query(sql, [Id_Reporte], (err, result) => {
      if (err) {
        console.error('Error al obtener los valores de los campos del reporte:', err);
        return res.status(500).json({ error: 'Error al obtener los valores de los campos del reporte' });
      }
      res.json(result);
    });
  };
  




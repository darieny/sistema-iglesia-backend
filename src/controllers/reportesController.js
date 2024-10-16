import connection from '../models/db.js';

// Verificar si el subministerio existe
const verifySubministerioExists = (subministerioId, callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM subministerios WHERE Id_Subministerio = ?';
    connection.query(sql, [subministerioId], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result[0].count > 0);
    });
};

// Obtener todos los reportes (filtrados según el rol)
export const getAllReportes = (req, res) => {
    const { userRole, distritoId, userId } = req.query;

    // Consulta base
    let sql = `
        SELECT reportesmensuales.*, ministerios.Nombre_Ministerio
        FROM reportesmensuales
        LEFT JOIN ministerios ON reportesmensuales.Ministerio_Id = ministerios.Id_Ministerio
    `;

    // Condiciones basadas en el rol del usuario
    if (userRole === "Administrador") {
        // Administrador: ver todos los reportes
        sql += ` WHERE 1`;
    } else if (userRole === "Supervisor de Distrito 1" || userRole === "Supervisor de Distrito 2") {
        // Supervisores: solo reportes de su distrito
        sql += ` WHERE reportesmensuales.Distrito_Id = ?`;
    } else if (userRole === "Pastor") {
        // Pastores: solo ver sus propios reportes
        sql += ` WHERE reportesmensuales.Persona_Id = ?`;
    }

    // Valores que se pasarán a la consulta, dependiendo del rol
    let queryValues = [];
    if (userRole === "Supervisor de Distrito 1" || userRole === "Supervisor de Distrito 2") {
        queryValues = [distritoId];
    } else if (userRole === "Pastor") {
        queryValues = [userId];
    }

    // Ejecutar la consulta
    connection.query(sql, queryValues, (err, results) => {
        if (err) {
            console.error('Error al obtener los reportes:', err);
            return res.status(500).json({ error: 'Error al obtener los reportes' });
        }
        res.json(results);
    });
};



// Obtener un reporte por ID
export const getReporteById = (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT 
            r.*, 
            d.Nombre_Distrito, 
            p.Nombre_Persona 
        FROM 
            reportesmensuales r
        LEFT JOIN 
            distritos d ON r.Distrito_Id = d.Id_Distrito
        LEFT JOIN 
            persona p ON r.Persona_Id = p.Id_Persona
        WHERE 
            r.Id_Reporte = ?;
    `;

    connection.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error al obtener el reporte:', err);
            return res.status(500).json({ error: 'Error al obtener el reporte' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        res.json(result[0]);
    });
};


// Crear un nuevo reporte con los valores de los campos
export const createReporte = (req, res) => {
    const { mes, ano, ministerio_id, valoresCampos, Usuario_ID, iglesia_id, distrito_id } = req.body;
    console.log('Datos recibidos:', req.body);

    // Verificar que distrito_id no sea null o undefined
    console.log('Distrito ID recibido:', distrito_id);

    // Primero obtenemos el Id_Persona utilizando el Usuario_ID
    const sqlGetPersona = 'SELECT Id_Persona FROM persona WHERE Usuario_ID = ?';
    connection.query(sqlGetPersona, [Usuario_ID], (err, results) => {
        if (err) {
            console.error('Error al obtener Id_Persona:', err);
            return res.status(500).json({ error: 'Error al obtener Id_Persona' });
        }

        if (results.length === 0) {
            console.error('No se encontró un Id_Persona para el usuario:', Usuario_ID);
            return res.status(404).json({ error: 'No se encontró un Id_Persona para el usuario' });
        }

        const Persona_Id = results[0].Id_Persona; // Aquí obtienes el Id_Persona

        // Inserta el reporte utilizando el Id_Persona
        const sqlReporte = 'INSERT INTO reportesmensuales (Mes, Ano, Ministerio_Id, Persona_Id, Distrito_Id) VALUES (?, ?, ?, ?, ?)';
        connection.query(sqlReporte, [mes, ano, ministerio_id, Persona_Id, distrito_id], (err, result) => {
            if (err) {
                console.error('Error al crear el reporte:', err);
                return res.status(500).json({ error: 'Error al crear el reporte' });
            }

            const reporteId = result.insertId;

            // Insertar los valores de los campos del reporte
            const sqlValores = 'INSERT INTO valorescamposreporte (Id_Reporte, Id_TipoCampo, Valor) VALUES ?';
            const valores = Object.keys(valoresCampos).map(idTipoCampo => [
                reporteId, idTipoCampo, valoresCampos[idTipoCampo]
            ]);

            console.log('Valores que se insertarán:', valores);

            connection.query(sqlValores, [valores], (err, result) => {
                if (err) {
                    console.error('Error al insertar los valores del reporte:', err);
                    return res.status(500).json({ error: 'Error al insertar los valores del reporte' });
                }
                res.json({ message: 'Reporte creado exitosamente' });
            });
        });
    });
};





// Actualizar un reporte mensual con validaciones
export const updateReporte = (req, res) => {
    const id = req.params.id;
    const { mes, ano, ministerioId, distritoId, personaId, valoresCampos } = req.body;

    // Actualizar en la tabla reportesMensuales
    const sql = `
      UPDATE reportesmensuales 
      SET Mes = ?, Ano = ?, Ministerio_Id = ?, Distrito_Id = ?, Persona_Id = ? 
      WHERE Id_Reporte = ?`;

    connection.query(sql, [mes, ano, ministerioId, distritoId, personaId, id], (err, result) => {
        if (err) {
            console.error('Error al actualizar el reporte:', err);
            return res.status(500).json({ error: 'Error al actualizar el reporte' });
        }

        // Eliminar los valores de campos antiguos antes de insertar los nuevos
        const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE Id_Reporte = ?';
        connection.query(sqlDeleteValores, [id], (err, result) => {
            if (err) {
                console.error('Error al eliminar valores antiguos:', err);
                return res.status(500).json({ error: 'Error al eliminar valores antiguos' });
            }

            const sqlValores = 'INSERT INTO valorescamposreporte (Id_Reporte, Id_TipoCampo, Valor) VALUES ?';
            const valores = Object.keys(valoresCampos).map(idTipoCampo => [
                id, idTipoCampo, valoresCampos[idTipoCampo]
            ]);

            connection.query(sqlValores, [valores], (err, result) => {
                if (err) {
                    console.error('Error al insertar nuevos valores:', err);
                    return res.status(500).json({ error: 'Error al insertar nuevos valores' });
                }

                res.json({ message: 'Reporte actualizado exitosamente' });
            });
        });
    });
};

// Eliminar un reporte mensual
export const deleteReporte = (req, res) => {
    const id = req.params.id;

    const sqlDeleteValores = 'DELETE FROM valorescamposreporte WHERE Id_Reporte = ?';
    connection.query(sqlDeleteValores, [id], (err, result) => {
        if (err) throw err;

        const sql = 'DELETE FROM reportesmensuales WHERE Id_Reporte = ?';
        connection.query(sql, [id], (err, result) => {
            if (err) throw err;
            res.json({ message: 'Reporte eliminado con éxito' });
        });
    });
};


// Obtener estadísticas de reportes
export const getEstadisticasReportes = (req, res) => {
  
    const sqlMensual = `
      SELECT COUNT(*) AS reporteMensual
      FROM reportesmensuales
      WHERE Mes = MONTH(CURDATE()) AND Ano = YEAR(CURDATE())
    `;
  
    const sqlAnual = `
      SELECT Mes, Ano, COUNT(*) AS Total
      FROM reportesmensuales
      GROUP BY Mes, Ano
      ORDER BY Ano, Mes;
    `;
  
    connection.query(sqlMensual, (err, resultMensual) => {
      if (err) {
        console.error('Error al obtener reportes mensuales:', err);
        return res.status(500).json({ error: 'Error al obtener reportes mensuales.' });
      }
  
  
      // Obtener el año actual para filtrar la consulta anual
      const currentYear = new Date().getFullYear();
  
      connection.query(sqlAnual, [currentYear], (err, resultAnual) => {
        if (err) {
          console.error('Error al obtener reportes anuales:', err);
          return res.status(500).json({ error: 'Error al obtener reportes anuales.' });
        }

  
        res.json({
          reporteMensual: resultMensual[0].reporteMensual,
          reportesAnuales: resultAnual,
        });
      });
    });
  };
  
  
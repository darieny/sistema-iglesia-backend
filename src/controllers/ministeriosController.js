import pool from '../models/db.js'; // Cambié connection por pool para PostgreSQL

// Obtener todos los ministerios para las cards, incluyendo el nombre del distrito
export const getAllMinisterios = (req, res) => {
  const sql = `
    SELECT ministerios."Id_Ministerio", 
           ministerios."Nombre_Ministerio", 
           ministerios."Descripcion", 
           ministerios."Id_Distrito", 
           distritos."Nombre_Distrito"
    FROM ministerios
    LEFT JOIN distritos ON ministerios."Id_Distrito" = distritos."Id_Distrito";
  `;
  pool.query(sql, (err, result) => {
    if (err) {
      console.error('Error al obtener los ministerios:', err);
      return res.status(500).json({ error: 'Error al obtener los ministerios' });
    }
    res.json(result.rows);
  });
};

// Crear un nuevo ministerio
export const createMinisterio = (req, res) => {
  const { Nombre_Ministerio, Descripcion, Id_Distrito, persona_id_director } = req.body;

  // Validaciones básicas
  if (!Nombre_Ministerio) {
    return res.status(400).json({ error: 'El nombre del ministerio es obligatorio' });
  }

  // SQL para insertar un nuevo ministerio
  const sql = `
    INSERT INTO ministerios ("Nombre_Ministerio", "Descripcion", "Id_Distrito", "persona_id_director") 
    VALUES ($1, $2, $3, $4) RETURNING "Id_Ministerio";
  `;
  const values = [Nombre_Ministerio, Descripcion || null, Id_Distrito || null, persona_id_director || null];

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error al crear ministerio:', err);
      return res.status(500).json({ error: 'Error al crear ministerio' });
    }

    // Devuelve el ID generado por la base de datos
    res.json({
      id: result.rows[0].Id_Ministerio,
      Nombre_Ministerio,
      Descripcion: Descripcion || 'Sin descripción',
      Id_Distrito: Id_Distrito || null,
      persona_id_director: persona_id_director || null
    });
  });
};

// Obtener un ministerio por ID
export const getMinisterioById = (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM ministerios WHERE "Id_Ministerio" = $1';

  pool.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al obtener el ministerio:', err);
      return res.status(500).json({ error: 'Error al obtener el ministerio' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ministerio no encontrado' });
    }

    res.json(result.rows[0]); // Devuelve el primer resultado
  });
};

// Obtener el ministerio_id de "Ministro Ordenado" por nombre
export const getMinistroOrdenadoId = (req, res) => {
  const sql = 'SELECT "Id_Ministerio" FROM ministerios WHERE "Nombre_Ministerio" = \'Ministro Ordenado\'';

  pool.query(sql, (err, result) => {
    if (err) {
      console.error('Error al obtener el ministerio de Ministros Ordenados:', err);
      return res.status(500).json({ error: 'Error al obtener el ministerio de Ministros Ordenados' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ministerio Ordenado no encontrado' });
    }

    res.json(result.rows[0]); // Devuelve el ministerio_id
  });
};

// Buscar ministerios
export const searchMinisterios = (req, res) => {
  const search = req.query.search || '';
  const sql = `
    SELECT * FROM ministerios 
    WHERE "Nombre_Ministerio" ILIKE $1 OR "Descripcion" ILIKE $2
  `;
  const values = [`%${search}%`, `%${search}%`];

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error al buscar ministerios:', err);
      return res.status(500).json({ error: 'Error al buscar ministerios' });
    }
    res.json(result.rows);
  });
};

// Obtener todos los ministerios, excluyendo "Ministro Ordenado"
export const getMinisterios = (req, res) => {
  const { Usuario_ID } = req.query;

  console.log("Usuario_ID recibido en la petición:", Usuario_ID);

  const sql = `
    SELECT m."Id_Ministerio", m."Nombre_Ministerio"
    FROM ministerios m
    JOIN persona_ministerio pm ON pm."Id_Ministerio" = m."Id_Ministerio"
    JOIN persona p ON p."Id_Persona" = pm."Id_Persona"
    JOIN cargo_persona cp ON cp."Id_Persona" = p."Id_Persona"
    JOIN cargo c ON c."Id_Cargo" = cp."Id_Cargo"
    WHERE p."Usuario_ID" = $1 
      AND m."Nombre_Ministerio" != 'Ministro Ordenado'
  `;

  pool.query(sql, [Usuario_ID], (err, result) => {
    if (err) {
      console.error('Error al obtener los ministerios del usuario:', err);
      return res.status(500).json({ error: 'Error al obtener los ministerios del usuario' });
    }
    console.log("Ministerios obtenidos para el usuario:", result.rows);
    res.json(result.rows);
  });
};

// Obtener reportes con nombre de la persona que los envió
export const getReportesByMinisterio = (req, res) => {
  const { ministerioId } = req.params;

  const sql = `
    SELECT r."Id_Reporte", r."Mes", r."Ano", 
           p."Nombre_Persona" 
    FROM reportesmensuales r
    JOIN persona p ON r."Persona_Id" = p."Id_Persona"
    WHERE r."Ministerio_Id" = $1
  `;

  pool.query(sql, [ministerioId], (err, reportes) => {
    if (err) {
      console.error('Error al obtener los reportes:', err);
      return res.status(500).json({ error: 'Error al obtener los reportes' });
    }
    res.json(reportes.rows);
  });
};

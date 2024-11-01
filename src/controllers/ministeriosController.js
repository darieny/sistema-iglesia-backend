import pool from '../models/db.js'; // Cambié connection por pool para PostgreSQL

// Obtener todos los ministerios para las cards, incluyendo el nombre del distrito
export const getAllMinisterios = (req, res) => {
  const sql = `
    SELECT ministerios.id_ministerio, 
           ministerios.nombre_ministerio, 
           ministerios.descripcion, 
           ministerios.id_distrito, 
           distritos.nombre_distrito
    FROM ministerios
    LEFT JOIN distritos ON ministerios.id_distrito = distritos.id_distrito;
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
  const { nombre_ministerio, descripcion, id_distrito, persona_id_director } = req.body;

  // Validaciones básicas
  if (!nombre_ministerio) {
    return res.status(400).json({ error: 'El nombre del ministerio es obligatorio' });
  }

  // SQL para insertar un nuevo ministerio
  const sql = `
    INSERT INTO ministerios (nombre_ministerio, descripcion, id_distrito, persona_id_director) 
    VALUES ($1, $2, $3, $4) RETURNING id_ministerio;
  `;
  const values = [nombre_ministerio, descripcion || null, id_distrito || null, persona_id_director || null];

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error al crear ministerio:', err);
      return res.status(500).json({ error: 'Error al crear ministerio' });
    }

    // Devuelve el ID generado por la base de datos
    res.json({
      id: result.rows[0].id_ministerio,
      nombre_ministerio,
      descripcion: descripcion || 'Sin descripción',
      id_distrito: id_distrito || null,
      persona_id_director: persona_id_director || null
    });
  });
};

// Obtener un ministerio por ID
export const getMinisterioById = (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM ministerios WHERE id_ministerio = $1';

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
  const sql = 'SELECT id_ministerio FROM ministerios WHERE nombre_ministerio = \'Ministro Ordenado\'';

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
    WHERE nombre_ministerio ILIKE $1 OR descripcion ILIKE $2
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
  const { usuario_id } = req.query;

  console.log("usuario_id recibido en la petición:", usuario_id);

  const sql = `
    SELECT m.id_ministerio, m.nombre_ministerio
    FROM ministerios m
    JOIN persona_ministerio pm ON pm.id_ministerio = m.id_ministerio
    JOIN persona p ON p.id_persona = pm.id_persona
    JOIN cargo_persona cp ON cp.id_persona = p.id_persona
    JOIN cargo c ON c.id_cargo = cp.id_cargo
    WHERE p.usuario_id = $1 
      AND m.nombre_ministerio != 'Ministro Ordenado'
  `;

  pool.query(sql, [usuario_id], (err, result) => {
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
    SELECT r.id_reporte, r.mes, r.ano, 
           p.nombre_persona 
    FROM reportesmensuales r
    JOIN persona p ON r.persona_id = p.id_persona
    WHERE r.ministerio_id = $1
  `;

  pool.query(sql, [ministerioId], (err, reportes) => {
    if (err) {
      console.error('Error al obtener los reportes:', err);
      return res.status(500).json({ error: 'Error al obtener los reportes' });
    }
    res.json(reportes.rows);
  });
};

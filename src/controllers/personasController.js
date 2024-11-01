import multer from 'multer';
import pool from '../models/db.js';

// Multer para almacenar las fotos en una carpeta llamada "fotosPerfil"
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'fotosPerfil/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

export const upload = multer({ storage });

// Listar todas las personas con sus cargos
export const getAllPersonas = async (req, res) => {
  const sql = `
    SELECT persona.*, iglesias.Nombre_Iglesia, STRING_AGG(cargo.Nombre_Cargo, ', ') AS Cargos
    FROM persona
    LEFT JOIN iglesias ON persona.id_iglesia = iglesias.Id_Iglesia
    LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
    LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo
    GROUP BY persona.Id_Persona, iglesias.Nombre_Iglesia
  `;
  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener personas:', err);
    res.status(500).json({ error: 'Error al obtener personas.' });
  }
};

// Obtener una persona por ID
export const getPersonaById = async (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT persona.*, 
           iglesias.Nombre_Iglesia, 
           distritos.Nombre_Distrito, 
           STRING_AGG(cargo.Nombre_Cargo, ', ') AS Cargos
    FROM persona
    LEFT JOIN iglesias ON persona.id_iglesia = iglesias.Id_Iglesia
    LEFT JOIN distritos ON persona.id_distrito = distritos.Id_Distrito
    LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
    LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo
    WHERE persona.Id_Persona = $1
    GROUP BY persona.Id_Persona, iglesias.Nombre_Iglesia, distritos.Nombre_Distrito
  `;
  try {
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Persona no encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener la persona:', err);
    res.status(500).json({ error: 'Error al obtener la persona.' });
  }
};

// Obtener personas por id_iglesia (para verificar si ya hay un pastor asignado)
export const getPersonasByIglesiaId = async (req, res) => {
  const { id_iglesia } = req.query;
  if (!id_iglesia) {
    return res.status(400).json({ error: 'id_iglesia es obligatorio' });
  }
  const sql = `
    SELECT persona.*, STRING_AGG(cargo.Nombre_Cargo, ', ') AS Cargos
    FROM persona
    LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
    LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo
    WHERE persona.id_iglesia = $1 AND cargo.Nombre_Cargo = 'Pastor'
    GROUP BY persona.Id_Persona
  `;
  try {
    const { rows } = await pool.query(sql, [id_iglesia]);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo personas por id_iglesia:', err);
    res.status(500).json({ error: 'Error obteniendo personas' });
  }
};

// Obtener los IDs de los cargos según los nombres
const getCargosIds = async (cargos) => {
  const sql = `SELECT Id_Cargo FROM cargo WHERE Nombre_Cargo = ANY($1::text[])`;
  try {
    const { rows } = await pool.query(sql, [cargos]);
    return rows.map(cargo => cargo.id_cargo);
  } catch (err) {
    console.error('Error obteniendo IDs de cargos:', err);
    throw err;
  }
};

// Crear una nueva persona
export const createPersona = async (req, res) => {
  const { Nombre_Persona, Telefono_Persona, Direccion_Persona, Fecha_Nacimiento, cargos, ministerios, id_iglesia, Id_Distrito } = req.body;
  const foto = req.file ? `/fotosPerfil/${req.file.filename}` : null;
  const newPersona = {
    Nombre_Persona,
    Telefono_Persona,
    Direccion_Persona,
    Fecha_Nacimiento,
    Foto_Persona: foto,
    id_iglesia: id_iglesia || null,
    Id_Distrito: Id_Distrito || null
  };

  try {
    // Crear la persona
    const sqlInsertPersona = `INSERT INTO persona (Nombre_Persona, Telefono_Persona, Direccion_Persona, Fecha_Nacimiento, Foto_Persona, id_iglesia, Id_Distrito) 
                              VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING Id_Persona`;
    const { rows } = await pool.query(sqlInsertPersona, Object.values(newPersona));
    const personaId = rows[0].id_persona;

    // Procesar los cargos
    let cargosArray = [];
    try {
      cargosArray = typeof cargos === 'string' ? JSON.parse(cargos) : cargos;
    } catch {
      cargosArray = Array.isArray(cargos) ? cargos : [cargos];
    }
    if (cargosArray.length > 0) {
      const cargoIds = await getCargosIds(cargosArray);
      const sqlInsertCargos = 'INSERT INTO cargo_persona (Id_Persona, Id_Cargo) VALUES ($1, $2)';
      for (const cargoId of cargoIds) {
        await pool.query(sqlInsertCargos, [personaId, cargoId]);
      }
    }

    // Procesar los ministerios
    if (ministerios && ministerios.length > 0) {
      const sqlInsertMinisterios = 'INSERT INTO persona_ministerio (Id_Persona, Id_Ministerio) VALUES ($1, $2)';
      for (const ministerioId of ministerios) {
        await pool.query(sqlInsertMinisterios, [personaId, ministerioId]);
      }
    }
    res.json({ id: personaId, ...newPersona });
  } catch (err) {
    console.error('Error creando la persona:', err);
    res.status(500).json({ error: 'Error creando la persona.' });
  }
};

// Actualizar una persona
export const updatePersona = async (req, res) => {
  const id = req.params.id;
  const { Nombre_Persona, Telefono_Persona, Direccion_Persona, Fecha_Nacimiento, cargos, ministerios, id_iglesia, Id_Distrito } = req.body;
  const foto = req.file ? `/fotosPerfil/${req.file.filename}` : req.body.Foto_Persona;
  const updatedPersona = {
    Nombre_Persona,
    Telefono_Persona,
    Direccion_Persona,
    Fecha_Nacimiento,
    Foto_Persona: foto,
    id_iglesia: id_iglesia || null,
    Id_Distrito: Id_Distrito || null
  };

  try {
    // Actualizar la persona
    const sqlUpdatePersona = `UPDATE persona SET Nombre_Persona = $1, Telefono_Persona = $2, Direccion_Persona = $3, Fecha_Nacimiento = $4, 
                              Foto_Persona = $5, id_iglesia = $6, Id_Distrito = $7 WHERE Id_Persona = $8`;
    await pool.query(sqlUpdatePersona, [...Object.values(updatedPersona), id]);

    // Eliminar los cargos anteriores
    await pool.query('DELETE FROM cargo_persona WHERE Id_Persona = $1', [id]);

    // Obtener y asignar los nuevos cargos
    let cargosArray = [];
    try {
      cargosArray = typeof cargos === 'string' ? JSON.parse(cargos) : cargos;
    } catch {
      cargosArray = Array.isArray(cargos) ? cargos : [cargos];
    }
    if (cargosArray.length > 0) {
      const cargoIds = await getCargosIds(cargosArray);
      const sqlInsertCargos = 'INSERT INTO cargo_persona (Id_Persona, Id_Cargo) VALUES ($1, $2)';
      for (const cargoId of cargoIds) {
        await pool.query(sqlInsertCargos, [id, cargoId]);
      }
    }

    // Eliminar y asignar nuevos ministerios
    await pool.query('DELETE FROM persona_ministerio WHERE Id_Persona = $1', [id]);
    if (ministerios && ministerios.length > 0) {
      const sqlInsertMinisterios = 'INSERT INTO persona_ministerio (Id_Persona, Id_Ministerio) VALUES ($1, $2)';
      for (const ministerioId of ministerios) {
        await pool.query(sqlInsertMinisterios, [id, ministerioId]);
      }
    }

    res.json({ id, ...updatedPersona });
  } catch (err) {
    console.error('Error actualizando la persona:', err);
    res.status(500).json({ error: 'Error actualizando la persona.' });
  }
};

// Eliminar una persona
export const deletePersona = async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM subministerios WHERE Id_Persona_Director = $1', [id]);
    await pool.query('DELETE FROM ministrosordenados WHERE Persona_Id_Ministros = $1', [id]);
    await pool.query('DELETE FROM cargo_persona WHERE Id_Persona = $1', [id]);
    const { rowCount } = await pool.query('DELETE FROM persona WHERE Id_Persona = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }
    res.json({ message: 'Persona eliminada con éxito' });
  } catch (err) {
    console.error('Error eliminando la persona:', err);
    res.status(500).json({ error: 'Error eliminando la persona.' });
  }
};

// Buscar personas
export const searchPersonas = async (req, res) => {
  const search = req.query.search || '';
  const sql = `
    SELECT persona.*, iglesias.Nombre_Iglesia, STRING_AGG(cargo.Nombre_Cargo, ', ') AS Cargos
    FROM persona
    LEFT JOIN iglesias ON persona.id_iglesia = iglesias.Id_Iglesia
    LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
    LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo
    WHERE persona.Nombre_Persona ILIKE $1 OR persona.Direccion_Persona ILIKE $2 
          OR cargo.Nombre_Cargo ILIKE $3 OR persona.Telefono_Persona ILIKE $4
    GROUP BY persona.Id_Persona, iglesias.Nombre_Iglesia
  `;
  const values = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
  try {
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('Error al buscar personas:', err);
    res.status(500).json({ error: 'Error al buscar personas.' });
  }
};

// Obtener el Persona_Id desde el Usuario_ID
export const getPersonaByUsuarioId = async (req, res) => {
  const { Usuario_ID } = req.params;
  const sql = 'SELECT Id_Persona FROM persona WHERE Usuario_ID = $1';
  try {
    const { rows } = await pool.query(sql, [Usuario_ID]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró Persona_Id para el Usuario_ID' });
    }
    res.json({ Persona_Id: rows[0].id_persona });
  } catch (err) {
    console.error('Error al obtener Persona_Id:', err);
    res.status(500).json({ error: 'Error al obtener Persona_Id' });
  }
};

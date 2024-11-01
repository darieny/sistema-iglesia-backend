import pool from '../models/db.js';
import bcrypt from 'bcrypt';

// Crear un nuevo usuario
export const createUser = async (req, res) => {
  const { username, password, selectedPersona, selectedRoles, activo } = req.body;
  const fechaRegistro = new Date();

  if (!username || !password || !selectedPersona || !selectedRoles || selectedRoles.length === 0) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Hash de la contraseña
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insertar el nuevo usuario en la tabla login
    const sqlInsertUser = `
      INSERT INTO login (usuario, contrasena, fecha_registro, activo) 
      VALUES ($1, $2, $3, $4) RETURNING id_usuarios
    `;

    const { rows } = await pool.query(sqlInsertUser, [username, hashedPassword, fechaRegistro, activo]);
    const idUsuario = rows[0].id_usuarios;

    // Insertar los roles en la tabla rolesusuarios
    const sqlInsertRoles = 'INSERT INTO rolesusuarios (id_usuarios, id_rol) VALUES ($1, $2)';

    for (const rolId of selectedRoles) {
      await pool.query(sqlInsertRoles, [idUsuario, rolId]);
    }

    // Actualizar la tabla persona para asociar la persona seleccionada con el id_usuarios
    const sqlUpdatePersona = 'UPDATE persona SET usuario_id = $1 WHERE id_persona = $2';
    await pool.query(sqlUpdatePersona, [idUsuario, selectedPersona]);

    res.status(201).json({ message: 'Usuario creado exitosamente', id: idUsuario });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// Obtener todos los usuarios
export const getAllUsers = async (req, res) => {
  const sql = 'SELECT * FROM login';

  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener los usuarios:', err);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
};

// Obtener un usuario por ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      l.id_usuarios, 
      l.usuario, 
      p.nombre_persona, 
      p.telefono_persona, 
      p.direccion_persona, 
      p.fecha_nacimiento, 
      STRING_AGG(r.nombre_rol, ', ') AS roles
    FROM login l
    LEFT JOIN persona p ON l.id_usuarios = p.usuario_id
    LEFT JOIN rolesusuarios ru ON l.id_usuarios = ru.id_usuarios
    LEFT JOIN roles r ON ru.id_rol = r.id_rol
    WHERE l.id_usuarios = $1
    GROUP BY 
      l.id_usuarios, 
      l.usuario, 
      p.nombre_persona, 
      p.telefono_persona, 
      p.direccion_persona, 
      p.fecha_nacimiento;
  `;

  try {
    const { rows } = await pool.query(sql, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener el usuario:', err);
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
};

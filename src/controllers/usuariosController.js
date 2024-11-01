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
      INSERT INTO login (Usuario, Contrasena, Fecha_Registro, Activo) 
      VALUES ($1, $2, $3, $4) RETURNING Id_Usuarios
    `;

    const { rows } = await pool.query(sqlInsertUser, [username, hashedPassword, fechaRegistro, activo]);
    const idUsuario = rows[0].id_usuarios;

    // Insertar los roles en la tabla RolesUsuarios
    const sqlInsertRoles = 'INSERT INTO rolesusuarios (Id_Usuarios, Id_Rol) VALUES ($1, $2)';

    for (const rolId of selectedRoles) {
      await pool.query(sqlInsertRoles, [idUsuario, rolId]);
    }

    // Actualizar la tabla persona para asociar la persona seleccionada con el Id_Usuarios
    const sqlUpdatePersona = 'UPDATE persona SET Usuario_ID = $1 WHERE Id_Persona = $2';
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
      l.Id_Usuarios, 
      l.Usuario, 
      p.Nombre_Persona, 
      p.Telefono_Persona, 
      p.Direccion_Persona, 
      p.Fecha_Nacimiento, 
      STRING_AGG(r.Nombre_Rol, ', ') AS Roles
    FROM login l
    LEFT JOIN persona p ON l.Id_Usuarios = p.Usuario_ID
    LEFT JOIN rolesusuarios ru ON l.Id_Usuarios = ru.Id_Usuarios
    LEFT JOIN roles r ON ru.Id_Rol = r.Id_Rol
    WHERE l.Id_Usuarios = $1
    GROUP BY 
      l.Id_Usuarios, 
      l.Usuario, 
      p.Nombre_Persona, 
      p.Telefono_Persona, 
      p.Direccion_Persona, 
      p.Fecha_Nacimiento;
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

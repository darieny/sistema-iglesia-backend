import pool from '../models/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  const { username, password } = req.body;

  // Consulta que une la tabla login con roles y persona para obtener también el id_persona
  const consult = `
    SELECT login.*, roles.nombre_rol, persona.id_iglesia, persona.id_distrito, persona.id_persona
    FROM login
    JOIN rolesusuarios ON login.id_usuarios = rolesusuarios.id_usuarios
    JOIN roles ON rolesusuarios.id_rol = roles.id_rol
    LEFT JOIN persona ON login.id_usuarios = persona.usuario_id
    WHERE login.usuario = $1
  `;

  try {
    const { rows } = await pool.query(consult, [username]);

    if (rows.length === 0) {
      console.log('Usuario no encontrado');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];

    // Usamos bcrypt.compare para verificar la contraseña
    bcrypt.compare(password, user.contrasena, (err, isMatch) => {
      if (err) {
        console.error('Error al comparar contraseñas:', err);
        return res.status(500).json({ message: 'Error en el servidor' });
      }

      if (!isMatch) {
        console.log('Contraseña incorrecta');
        return res.status(401).json({ message: 'Contraseña incorrecta' });
      }

      // Recorrer todos los resultados y agrupar los roles en un array
      const roles = rows.map(row => row.nombre_rol); // Todos los roles del usuario

      // Si las credenciales son correctas, incluimos los roles en el token JWT
      const token = jwt.sign(
        { 
          username: user.usuario, 
          roles: roles,  // Incluimos todos los roles como un array
          userId: user.id_usuarios, 
          personaId: user.id_persona,  // Incluimos id_persona en el token
          iglesia_id: user.id_iglesia,
          distrito_id: user.id_distrito 
        },  
        "Stack",
        { expiresIn: '3m' } // El token expira en 3 minutos
      );

      // Devolvemos el token y el id_persona como parte de la respuesta JSON
      res.status(200).json({ token, personaId: user.id_persona }); // También devolvemos id_persona
    });
  } catch (err) {
    console.error('Error en el proceso de autenticación:', err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

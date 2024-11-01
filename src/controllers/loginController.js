import pool from '../models/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  const { username, password } = req.body;

  // Consulta que une la tabla login con roles y persona para obtener también el Id_Persona
  const consult = `
    SELECT login.*, roles.Nombre_Rol, persona.id_iglesia, persona.Id_Distrito, persona.Id_Persona
    FROM login
    JOIN rolesusuarios ON login.Id_Usuarios = rolesusuarios.Id_Usuarios
    JOIN roles ON rolesusuarios.Id_Rol = roles.Id_Rol
    LEFT JOIN persona ON login.Id_Usuarios = persona.Usuario_ID
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
          personaId: user.id_persona,  // Incluimos Id_Persona en el token
          iglesia_id: user.id_iglesia,
          distrito_id: user.id_distrito 
        },  
        "Stack",
        { expiresIn: '3m' } // El token expira en 3 minutos
      );

      // Devolvemos el token y el Id_Persona como parte de la respuesta JSON
      res.status(200).json({ token, personaId: user.id_persona }); // También devolvemos Id_Persona
    });
  } catch (err) {
    console.error('Error en el proceso de autenticación:', err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

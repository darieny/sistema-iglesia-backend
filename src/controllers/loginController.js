import connection from '../models/db.js';
import bcrypt from 'bcrypt';  // Asegúrate de tener bcrypt instalado
import jwt from 'jsonwebtoken';

export const login = (req, res) => {
    const { username, password } = req.body;

    // Consulta que une la tabla login con roles y persona para obtener también el Id_Persona
    const consult = `
    SELECT login.*, roles.Nombre_Rol, persona.id_iglesia, persona.Id_Distrito, persona.Id_Persona  -- Incluimos Id_Persona
    FROM login
    JOIN rolesusuarios ON login.Id_Usuarios = rolesusuarios.Id_Usuarios
    JOIN roles ON rolesusuarios.Id_Rol = roles.Id_Rol
    LEFT JOIN persona ON login.Id_Usuarios = persona.Usuario_ID
    WHERE login.usuario = ?
  `;

    try {
        connection.query(consult, [username], (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).json({ message: 'Error en el servidor' });
            }

            if (results.length === 0) {
                console.log('Usuario no encontrado');
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            const user = results[0];

            // Usamos bcrypt.compare para verificar la contraseña
            bcrypt.compare(password, user.Contrasena, (err, isMatch) => {
                if (err) {
                    console.error('Error al comparar contraseñas:', err);
                    return res.status(500).json({ message: 'Error en el servidor' });
                }

                if (!isMatch) {
                    console.log('Contraseña incorrecta');
                    return res.status(401).json({ message: 'Contraseña incorrecta' });
                }

                // Recorrer todos los resultados y agrupar los roles en un array
                const roles = results.map(row => row.Nombre_Rol);  // Todos los roles del usuario

                // Si las credenciales son correctas, incluimos los roles en el token JWT
                const token = jwt.sign(
                    { 
                        username: user.usuario, 
                        roles: roles,  // Incluimos todos los roles como un array
                        userId: user.Id_Usuarios, 
                        personaId: user.Id_Persona,  // Incluimos Persona_Id en el token
                        iglesia_id: user.id_iglesia,
                        distrito_id: user.Id_Distrito 
                    },  
                    "Stack",
                    { expiresIn: '3m' } // El token expira en 3 minutos
                );

                // Devolvemos el token y el Persona_Id como parte de la respuesta JSON
                res.status(200).json({ token, personaId: user.Id_Persona });  // También devolvemos Persona_Id
            });
        });
    } catch (err) {
        console.error('Error en el proceso de autenticación:', err);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};




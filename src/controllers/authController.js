import crypto from 'crypto';
import connection from '../models/db.js';
import { sendEmail } from './sendEmail.js';

export const forgotPassword = (req, res) => {
  const { usuario, email } = req.body;

  const token = crypto.randomBytes(20).toString('hex'); //Genera el token
  const expires = Date.now() + 300000; // El token expira en 5 minutos

  // Verificar que el usuario existe en la base de datos
  const sql = `SELECT * FROM login WHERE usuario = ?`;

  connection.query(sql, [usuario], (err, results) => {
    if (err) {
      console.error('Error al buscar usuario:', err); // Log detallado del error
      return res.status(500).json({ error: 'Error en la base de datos' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Guardar el token en la base de datos
    const updateSql = `
      UPDATE login 
      SET reset_token = ?, reset_expires = ? 
      WHERE usuario = ?
    `;

    connection.query(updateSql, [token, expires, usuario], async (err) => {
      if (err) return res.status(500).json({ error: 'Error en el servidor' });

      try {
        // Enviar el correo al usuario con el enlace de recuperación
        await sendEmail(
          email,
          'Recuperación de Contraseña',
          `Haz clic en el siguiente enlace para restablecer tu contraseña:
          http://localhost:3000/reset-password/${token}`
        );

        res.json({ message: 'Correo enviado con instrucciones' });
      } catch (error) {
        console.error('Error al enviar el correo:', error);
        res.status(500).json({ error: 'Error al enviar el correo' });
      }
    });
  });
};



//Funcion de restablecimiento de contraseña
export const resetPassword = (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
  
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex'); //Encripta la nueva contraseña
  
    const sql = `
      UPDATE login 
      SET Contrasena = ?, reset_token = NULL, reset_expires = NULL 
      WHERE reset_token = ? AND reset_expires > ?
    `;
  
    connection.query(sql, [hashedPassword, token, Date.now()], (err, result) => {
      if (err || result.affectedRows === 0) {
        return res.status(400).json({ error: 'Token inválido o expirado' });
      }
  
      res.json({ message: 'Contraseña restablecida exitosamente' });
    });
  };
  

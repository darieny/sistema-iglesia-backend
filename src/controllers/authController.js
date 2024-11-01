import crypto from 'crypto';
import pool from '../models/db.js';
import { sendEmail } from './sendEmail.js';

export const forgotPassword = async (req, res) => {
  const { usuario, email } = req.body;

  const token = crypto.randomBytes(20).toString('hex'); // Genera el token
  const expires = Date.now() + 300000; // El token expira en 5 minutos

  try {
    // Verificar que el usuario existe en la base de datos
    const sql = `SELECT * FROM login WHERE usuario = $1`;
    const { rows } = await pool.query(sql, [usuario]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Guardar el token en la base de datos
    const updateSql = `
      UPDATE login 
      SET reset_token = $1, reset_expires = $2 
      WHERE usuario = $3
    `;
    await pool.query(updateSql, [token, expires, usuario]);

    // Enviar el correo al usuario con el enlace de recuperación
    try {
      await sendEmail(
        email,
        'Recuperación de Contraseña',
        `Haz clic en el siguiente enlace para restablecer tu contraseña:
        ${process.env.FRONTEND_URL}/reset-password/${token}`
      );

      res.json({ message: 'Correo enviado con instrucciones' });
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      res.status(500).json({ error: 'Error al enviar el correo' });
    }
  } catch (err) {
    console.error('Error en la base de datos:', err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
};

// Función de restablecimiento de contraseña
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex'); // Encripta la nueva contraseña

  try {
    const sql = `
      UPDATE login 
      SET contrasena = $1, reset_token = NULL, reset_expires = NULL 
      WHERE reset_token = $2 AND reset_expires > $3
    `;
    const result = await pool.query(sql, [hashedPassword, token, Date.now()]);

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    res.json({ message: 'Contraseña restablecida exitosamente' });
  } catch (err) {
    console.error('Error en la base de datos:', err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
};

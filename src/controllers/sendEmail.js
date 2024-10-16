import transporter from './emailConfig.js';

export const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: 'sistemawebidpu@outlook.com',
    to, // Destinatario
    subject, // Asunto del correo
    text, // Contenido del correo
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', info.messageId);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    throw new Error('No se pudo enviar el correo.');
  }
};

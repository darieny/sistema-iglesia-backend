import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: process.env.EMAIL_PORT,
  auth: {
    user: 'apikey', // Siempre debe ser 'apikey'
    pass: process.env.EMAIL_KEY //API Key
  },
});

export default transporter;

import express from 'express';
import routes from './api/endPoints.js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Opciones de configuración de CORS para permitir todos los orígenes
const corsOptions = {
  origin: '*', // Permitir todos los orígenes
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos
  credentials: false // No permitir el envío de credenciales si no es necesario
};

// Aplicar CORS para todos los orígenes
app.use(cors(corsOptions));

// Middleware para la política de Referencia (Referrer Policy)
app.use((_req, res, next) => {
  res.header("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});

// Manejar preflight requests para todas las rutas
app.options('*', cors(corsOptions));

// Middleware para parsear JSON y datos codificados en URL
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (por ejemplo, fotos de perfil)
app.use('/fotosPerfil', express.static('fotosPerfil')); //Se configura la carpeta como un directorio estático

app.use('/', routes); //Todas las rutas comenzarán directamente desde la raíz ('/')

// Iniciar el servidor en desarrollo o producción
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`App listening on port ${port}`);
  });
}
export default app;
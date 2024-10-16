import express from 'express';
import routes from './api/endPoints.js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use('/fotosPerfil', express.static('fotosPerfil')); //Se configura la carpeta como un directorio estático

app.use('/', routes); //Todas las rutas comenzarán directamente desde la raíz ('/')

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
      console.log(`App listening on port ${port}`);
    });
  }
  export default app;
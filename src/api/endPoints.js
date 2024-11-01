import { Router } from 'express';
const router = Router();
import { ping } from '../controllers/pingController.js';
import {login} from '../controllers/loginController.js';
import { getAllPersonas, getPersonaById, createPersona, updatePersona, deletePersona, getPersonasByIglesiaId } from '../controllers/personasController.js';
import { getAllIglesias, getIglesiaById, createIglesia, updateIglesia, deleteIglesia, uploadIglesia } from '../controllers/iglesiasController.js';
import { getAllBienes, getBienById, createBien, updateBien, deleteBien, searchBienes } from '../controllers/bienesController.js';
import { createMinisterio, getAllMinisterios, getMinisterioById, getMinistroOrdenadoId, searchMinisterios, getMinisterios, getReportesByMinisterio } from '../controllers/ministeriosController.js';
import { getAllReportes, getReporteById, createReporte, updateReporte, deleteReporte, getEstadisticasReportes } from '../controllers/reportesController.js';
import { getAllSubministerios, createSubministerio, getSubministerioById } from '../controllers/SubministerioController.js'
import { createCamposReporte, getCamposPorMinisterio, getValoresCamposPorReporte, saveValoresCamposReporte } from '../controllers/CamposReportesController.js';
import { getAllMinistrosOrdenados, getMinistroById, createReporteMinistro, updateReporteMinistro, deleteReporteMinistro, createMinistroOrdenado, getReportesByMinistroOrdenado, getMinisterioOrdenadoByUserId} from '../controllers/ministrosController.js'
import { getAllDistritos, getDistritoById, createDistrito, updateDistrito, deleteDistrito, getReportesByDistrito, getDistritoData } from '../controllers/distritosController.js'
import { createUser, getAllUsers, getUserById } from '../controllers/usuariosController.js';
import { getAllRoles } from '../controllers/rolesController.js';
import { forgotPassword, resetPassword } from '../controllers/authController.js';


//Rutas para Login
router.get('/ping', ping);
router.post('/login', login);

//Rutas para Personas
router.get('/personas', getAllPersonas);
router.get('/personas/:id', getPersonaById);
router.get('/personasPorIglesia', getPersonasByIglesiaId);
router.post('/personas', createPersona);
router.put('/personas/:id', updatePersona);
router.delete('/personas/:id', deletePersona);

//Rutas para Iglesias
router.get('/iglesias', getAllIglesias);
router.get('/iglesias/:id', getIglesiaById);
router.post('/iglesias', uploadIglesia.single('fotoIgle'), createIglesia);
router.put('/iglesias/:id', uploadIglesia.single('fotoIgle'), updateIglesia);
router.delete('/iglesias/:id', deleteIglesia);

//Rutas para Bienes
router.get('/bienes', getAllBienes);
router.get('/bienes/:id', getBienById);
router.get('/buscarBienes', searchBienes);
router.post('/bienes', createBien);
router.put('/bienes/:id', updateBien);
router.delete('/bienes/:id', deleteBien);

//Rutas para Ministerios
router.get('/ministerios', getAllMinisterios);
router.post('/ministerios', createMinisterio);
router.get('/ministerios/:id', getMinisterioById);
router.get('/buscarMinisterios', searchMinisterios);
router.get('/ministroOrdenadoId', getMinistroOrdenadoId);
router.get('/ministeriosExcluyendoOrdenado', getMinisterios);
router.get('/reportes/ministerio/:ministerioId', getReportesByMinisterio);


//Rutas para Reportes
router.get('/reportes/estadisticas', getEstadisticasReportes);
router.get('/reportes', getAllReportes);
router.get('/reportes/:id', getReporteById);
router.post('/reportes', createReporte);
router.put('/reportes/:id', updateReporte);
router.delete('/reportes/:id', deleteReporte);


//Rutas para subministerios
router.get('/subministerios', getAllSubministerios);
router.post('/subministerios', createSubministerio);
router.get('/subministerios/:id', getSubministerioById);

//Rutas para los campos de un reporte
router.post('/camposReporte', createCamposReporte);
router.get('/camposReporte/:ministerio_id', getCamposPorMinisterio);
router.get('/valoresCamposReporte/:Id_Reporte', getValoresCamposPorReporte);

//Rutas para los reportes de Ministros Ordenados
router.post('/reportes/ministroOrdenado', createReporteMinistro);
router.put('/reportes/ministroOrdenado/:id', updateReporteMinistro);
router.delete('/reportes/ministroOrdenado/:id', deleteReporteMinistro);
router.get('/reportes/ministroOrdenado/:id', getReportesByMinistroOrdenado);

//Rutas para Ministros Ordenados
router.get('/ministrosOrdenados', getAllMinistrosOrdenados);
router.get('/ministrosOrdenados/:id', getMinistroById);
router.post('/ministrosOrdenados/reportes', createReporteMinistro);
router.put('/ministrosOrdenados/reportes/:id', updateReporteMinistro);
router.delete('/ministrosOrdenados/reportes/:id', deleteReporteMinistro);
router.post('/ministrosOrdenados', createMinistroOrdenado);
router.get('/usuarios/:id/ministro', getMinisterioOrdenadoByUserId);

//Rutas para distritos
router.get('/distritos', getAllDistritos);
router.get('/distritos/:id', getDistritoById);
router.post('/distritos', createDistrito);
router.put('/distritos/:id', updateDistrito);
router.delete('/distritos/:id', deleteDistrito);
router.get('/distritos/:id/reportes', getReportesByDistrito);
router.get('/distritos/:id/datos', getDistritoData);

//Rutas para los usuarios
router.post('/crearUsuario', createUser);
router.get('/usuarios', getAllUsers);
router.get('/usuarios/:id', getUserById);

//Rutas para los roles
router.get('/roles', getAllRoles);

//Ruta para guardar los valores de los reportes
router.post('/valoresCamposReporte', saveValoresCamposReporte);

//Rutas para sección "Olvidé mi contraseña"
router.post('/auth/olvidemicontrasena', forgotPassword);
router.post('/auth/reset-password/:token', resetPassword);

export default router;
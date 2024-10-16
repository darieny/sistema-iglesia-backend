import connection from '../models/db.js';
import multer from 'multer';

//Multer para almacenar las fotos en una carpeta llamada "fotosIglesias"
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'fotosIglesias/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

export const uploadIglesia = multer({storage});

//Listar todas las iglesias
export const getAllIglesias = (req, res) => {
    const sql = `
        SELECT iglesias.*, 
               ANY_VALUE(persona.Nombre_Persona) AS Nombre_Pastor
        FROM iglesias
        LEFT JOIN persona ON iglesias.Id_Iglesia = persona.id_iglesia
        LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
        LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo AND cargo.Nombre_Cargo = 'Pastor'
        GROUP BY iglesias.Id_Iglesia;
    `;

    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error al obtener iglesias con pastores:', err);
            return res.status(500).json({ error: 'Error al obtener iglesias.' });
        }
        res.json(result);
    });
};



// Obtener una iglesia por ID
export const getIglesiaById = (req, res) => {
    const id = req.params.id;

    // Primera consulta para obtener los detalles de la iglesia y el pastor asociado (si existe)
    const iglesiaSql = `
        SELECT iglesias.Id_Iglesia, iglesias.Nombre_Iglesia, iglesias.Direccion_Iglesia, iglesias.Foto_Iglesia, iglesias.PuntoGPS, iglesias.Id_Distrito, 
               persona.Nombre_Persona AS Nombre_Pastor, 
               distritos.Nombre_Distrito,
               GROUP_CONCAT(cargo.Nombre_Cargo) AS Cargos
        FROM iglesias 
        LEFT JOIN persona ON iglesias.Id_Iglesia = persona.id_iglesia 
        LEFT JOIN distritos ON iglesias.Id_Distrito = distritos.Id_Distrito
        LEFT JOIN cargo_persona cp ON persona.Id_Persona = cp.Id_Persona
        LEFT JOIN cargo ON cp.Id_Cargo = cargo.Id_Cargo AND cargo.Nombre_Cargo = 'Pastor' 
        WHERE iglesias.Id_Iglesia = ? 
        GROUP BY iglesias.Id_Iglesia, iglesias.Nombre_Iglesia, iglesias.Direccion_Iglesia, iglesias.Foto_Iglesia, iglesias.PuntoGPS, iglesias.Id_Distrito, persona.Nombre_Persona, distritos.Nombre_Distrito;
    `;

    // Segunda consulta para obtener los bienes de la iglesia
    const bienesSql = `
        SELECT bienes.Nombre_Bienes, bienes.Tipo_Bienes 
        FROM bienes 
        WHERE bienes.iglesia_id_bienes = ?;
    `;

    // Ejecutar la primera consulta (Iglesia y Pastor)
    connection.query(iglesiaSql, [id], (err, iglesiaResults) => {
        if (err) throw err;

        // Verificar si la iglesia existe
        if (iglesiaResults.length === 0) {
            return res.status(404).json({ message: 'Iglesia no encontrada' });
        }

        // Ejecutar la segunda consulta para los bienes de la iglesia
        connection.query(bienesSql, [id], (err, bienesResults) => {
            if (err) throw err;

            // Combinar los resultados y enviarlos al frontend
            const iglesia = iglesiaResults[0];
            iglesia.bienes = bienesResults;  // Agregar los bienes al resultado de la iglesia
            res.json(iglesia);
        });
    });
};




// Crear una nueva iglesia
export const createIglesia = (req, res) => {
    const { Nombre_Iglesia, Direccion_Iglesia, PuntoGPS, Id_Distrito } = req.body;
    const fotoIgle = req.file ? `/fotosIglesias/${req.file.filename}` : null; // Asignación de la ruta de la foto

    const sql = 'INSERT INTO iglesias SET ?';
    const newIglesia = { Nombre_Iglesia, Direccion_Iglesia, PuntoGPS, Foto_Iglesia: fotoIgle, Id_Distrito };

    connection.query(sql, newIglesia, (err, result) => {
        if (err) throw err;
        res.json({ id: result.insertId, ...newIglesia });
    });
};

// Actualizar una iglesia
export const updateIglesia = (req, res) => {
    const id = req.params.id;
    const { Nombre_Iglesia, Direccion_Iglesia, PuntoGPS, Id_Distrito } = req.body;
    const fotoIgle = req.file ? `/fotosIglesias/${req.file.filename}` : req.body.foto; // Mantener la foto anterior si no se sube una nueva
    const sql = 'UPDATE iglesias SET ? WHERE Id_Iglesia = ?';
    const updatedIglesia = { Nombre_Iglesia, Direccion_Iglesia, PuntoGPS, Foto_Iglesia: fotoIgle, Id_Distrito };

    connection.query(sql, [updatedIglesia, id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error actualizando la iglesia' });
        }
        res.json({ id, ...updatedIglesia });
    });
};

//Eliminar una iglesia
export const deleteIglesia = (req, res) => {
    const id = req.params.id;

    // Primero, actualizamos las personas asociadas para que id_iglesia sea NULL
    const updatePersonasSql = 'UPDATE persona SET id_iglesia = NULL WHERE id_iglesia = ?';

    connection.query(updatePersonasSql, [id], (err, result) => {
        if (err) {
            console.error('Error al actualizar las personas:', err);
            return res.status(500).json({message: 'Error al actualizar las personas asociadas.'});
        }

        // Una vez que las personas están actualizadas, eliminamos la iglesia
        const deleteIglesiaSql = 'DELETE FROM iglesias WHERE Id_Iglesia = ?';
        connection.query(deleteIglesiaSql, [id], (err, result) => {
            if (err) {
                console.error('Error al eliminar la iglesia:', err);
                return res.status(500).json({message: 'Error al eliminar la iglesia.'});
            }

            res.json({message: 'Iglesia eliminada con éxito.'});
        });
    });
};

//Buscar una persona
export const searchIglesias = (req, res) => {
    const search = req.query.search || ''; 
    const sql = `
        SELECT * FROM iglesias 
        WHERE Nombre_Iglesia LIKE ? OR Direccion_Iglesia LIKE ? OR PuntoGPS LIKE ?
    `;
    const values = [`%${search}%`, `%${search}%`, `%${search}%`];
    
    connection.query(sql, values, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
};
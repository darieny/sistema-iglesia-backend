import connection from '../models/db.js';
import bcrypt from 'bcrypt';

// Crear un nuevo usuario
export const createUser = (req, res) => {
    const { username, password, selectedPersona, selectedRoles, activo } = req.body;
    
    // Agregar la fecha de registro
    const fechaRegistro = new Date();  // Obtiene la fecha y hora actual

    // Verificar que los datos necesarios están presentes
    if (!username || !password || !selectedPersona || !selectedRoles || selectedRoles.length === 0) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Hash de la contraseña
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insertar el nuevo usuario en la tabla login
        const sqlInsertUser = 'INSERT INTO login (Usuario, Contrasena, Fecha_Registro, Activo) VALUES (?, ?, ?, ?)';
        
        connection.query(sqlInsertUser, [username, hashedPassword, fechaRegistro, activo], (err, result) => {
            if (err) {
                console.error('Error al crear usuario:', err);
                return res.status(500).json({ error: 'Error al crear usuario' });
            }

            const idUsuario = result.insertId;

            // Insertar los roles en la tabla RolesUsuarios
            const sqlInsertRoles = 'INSERT INTO rolesusuarios (Id_Usuarios, Id_Rol) VALUES (?, ?)';

            selectedRoles.forEach(rolId => {
                connection.query(sqlInsertRoles, [idUsuario, rolId], (err) => {
                    if (err) {
                        console.error('Error al asignar rol al usuario:', err);
                        return res.status(500).json({ error: 'Error al asignar rol al usuario' });
                    }
                });
            });
            
            // Actualizar la tabla persona para asociar la persona seleccionada con el Id_Usuarios
            const sqlUpdatePersona = 'UPDATE persona SET Usuario_ID = ? WHERE Id_Persona = ?';
            connection.query(sqlUpdatePersona, [idUsuario, selectedPersona], (err) => {
                if (err) {
                    console.error('Error al asociar usuario con la persona:', err);
                    return res.status(500).json({ error: 'Error al asociar usuario con la persona' });
                }
            });

            res.status(201).json({ message: 'Usuario creado exitosamente', id: idUsuario });
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        return res.status(500).json({ error: 'Error al crear usuario' });
    }
};






// Obtener todos los usuarios
export const getAllUsers = (req, res) => {
    const sql = 'SELECT * FROM login';
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener los usuarios:', err);
            return res.status(500).json({ error: 'Error al obtener los usuarios' });
        }
        res.json(results);
    });
};

// Obtener un usuario por ID
export const getUserById = (req, res) => {
    const { id } = req.params;  // Captura del ID desde los parámetros de la ruta

    const sql = `
        SELECT 
            l.Id_Usuarios, 
            l.Usuario, 
            p.Nombre_Persona, 
            p.Telefono_Persona, 
            p.Direccion_Persona, 
            p.Fecha_Nacimiento, 
            GROUP_CONCAT(r.Nombre_Rol SEPARATOR ', ') AS Roles
        FROM login l
        LEFT JOIN persona p ON l.Id_Usuarios = p.Usuario_ID
        LEFT JOIN rolesusuarios ru ON l.Id_Usuarios = ru.Id_Usuarios
        LEFT JOIN roles r ON ru.Id_Rol = r.Id_Rol
        WHERE l.Id_Usuarios = ?
        GROUP BY 
            l.Id_Usuarios, 
            l.Usuario, 
            p.Nombre_Persona, 
            p.Telefono_Persona, 
            p.Direccion_Persona, 
            p.Fecha_Nacimiento;
    `;

    connection.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error al obtener el usuario:', err);
            return res.status(500).json({ error: 'Error al obtener el usuario' });
        }

        console.log('Resultados de la base de datos:', result);

        if (result.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result[0]);  // Enviar la información del usuario
    });
};


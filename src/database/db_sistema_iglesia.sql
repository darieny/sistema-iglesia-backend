create database sistema_iglesia;
use sistema_iglesia;

create table login(
	usuario varchar(50) not null,
    contrasena varchar(50) not null,
    primary key (usuario, contrasena)
);

-- insertar datos de prueba en la tabla login
INSERT INTO login (usuario, contrasena) VALUES
('user1', '1234'),
('user2','1234');
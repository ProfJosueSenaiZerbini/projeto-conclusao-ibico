banco 

create database Ibico;
use Ibico;

-- tabela dos usuarios 
create table usuarios(
id INT auto_increment primary key,      -- chave primaria que sempre vai se incrementar
nome varchar(100) not null,             -- nome do usuario nunca vazio
email varchar(100) unique not null,     -- email do usuario nunca vazio
senha varchar(255) not null,            -- senha do usuario nunca vazio 
tipo enum('Contratante', 'Trabalhador') not null, -- para identificar se o usuario e "Contratante" ou "Trabalhador"
dat_nasc date not null, -- data de nascimento do o usuario nunca vazio
saldo_simulado decimal (10,2) default 0.00 -- sera o saldo do usuario, 10 e a quantidade de digitos e o 2 eos numeros depois da virgula
);
 
 -- tabela de Bicos (Vagas)
 create table bicos (
 id int auto_increment primary key, -- chave primaria
 contratante_id int not null, -- vai ser o id do contratante
 trabalhador_id int default null, -- vai ser o id do tarbalhador 
 titulo varchar(100) not null, -- Titulo da vaga 
 descrição text not null, -- descrição da vaga 
 valor decimal(10,2) not null, -- valor que vaga oferece
 data_servico date not null, -- o dia que o bico vai acontecer
 horario varchar(20) not null, -- horario do bico
 bairro varchar(100) not null,
 status enum('Aberto','Em andamento','Finalizado','Cancelado') default 'Aberto',
 foreign key (contratante_id) references usuarios(id),
 foreign key (trabalhador_id) references usuarios(id)
);

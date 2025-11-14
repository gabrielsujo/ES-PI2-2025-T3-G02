create table Professores (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(255) NOT NULL,
	telefone VARCHAR(20),
	email VARCHAR(255) UNIQUE NOT NULL,
	senha_hash VARCHAR(255) NOT NULL
);
create table Instituicoes (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(255) NOT NULL,
	usuario_id INT NOT NULL,
	FOREIGN KEY (usuario_id) REFERENCES Professores(id)
		ON DELETE CASCADE
);
create table Disciplinas (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(255) NOT NULL,
	codigo VARCHAR(50),
	sigla VARCHAR(20),
	periodo VARCHAR(100),
	instituicao_id INT NOT NULL,
	FOREIGN KEY (instituicao_id) REFERENCES Instituicoes(id)
		ON DELETE  CASCADE
);
create table Componentes (
	id SERIAL PRIMARY KEY,
	sigla VARCHAR(20) NOT NULL,
	nome VARCHAR(255) NOT NULL,
	descricao TEXT,
	disciplina_id INT NOT NULL, 
	FOREIGN KEY (disciplina_id) REFERENCES Disciplinas(id)
		ON DELETE CASCADE,
	UNIQUE(disciplina_id,sigla) -- a p1 so pode existir uma vez por disciplina
);
create table Turmas (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(100) NOT NULL,
	horario VARCHAR(100),
	disciplina_id INT NOT NULL,
	dia_semana VARCHAR(100),
	local VARCHAR(255),
	FOREIGN KEY (disciplina_id) REFERENCES Disciplinas(id)
		ON DELETE CASCADE
);
create table Alunos (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(255) NOT NULL,
	matricula VARCHAR(50),
	professor_id INT NOT NULL,
	FOREIGN KEY (professor_id) REFERENCES Professores(id)
		ON DELETE CASCADE
);

CREATE TABLE Matriculas (
	id SERIAL PRIMARY KEY,
	aluno_id INT NOT NULL,
	turma_id INT NOT NULL,
	FOREIGN KEY (aluno_id) REFERENCES Alunos(id) ON DELETE CASCADE,
	FOREIGN KEY (turma_id) REFERENCES Turmas(id) ON DELETE CASCADE,
	UNIQUE(aluno_id, turma_id)
);

create table Notas (
	id SERIAL PRIMARY KEY,
	valor DECIMAL(4,2) NOT NULL,
	componente_id INT NOT NULL,
	matricula_id INT NOT NULL,
	FOREIGN KEY (componente_id) references Componentes(id) ON DELETE CASCADE,
	foreign key (matricula_id) references Matricula(id) ON DELETE CASCADE
	);



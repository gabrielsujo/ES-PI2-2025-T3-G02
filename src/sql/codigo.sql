CREATE TABLE Professores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL
);

CREATE TABLE Instituicoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    usuario_id INT NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES Professores(id)
);

CREATE TABLE Disciplinas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50),
    sigla VARCHAR(20),
    periodo VARCHAR(100),
    formula_calculo VARCHAR(500),
    instituicao_id INT NOT NULL,
    FOREIGN KEY (instituicao_id) REFERENCES Instituicoes(id)
);

CREATE TABLE Componentes (
    id SERIAL PRIMARY KEY,
    sigla VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    disciplina_id INT NOT NULL, 
    FOREIGN KEY (disciplina_id) REFERENCES Disciplinas(id),
    UNIQUE(disciplina_id, sigla)
);

CREATE TABLE Turmas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    dia_semana VARCHAR(100),
    horario VARCHAR(100),
    local VARCHAR(255),
    disciplina_id INT NOT NULL,
    FOREIGN KEY (disciplina_id) REFERENCES Disciplinas(id)
);

CREATE TABLE Alunos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    matricula VARCHAR(50),
    turma_id INT NOT NULL,
    FOREIGN KEY (turma_id) REFERENCES Turmas(id)
);

CREATE TABLE Notas (
    id SERIAL PRIMARY KEY,
    valor DECIMAL(4,2),
    componente_id INT NOT NULL,
    aluno_id INT NOT NULL,
    FOREIGN KEY (componente_id) REFERENCES Componentes(id),
    FOREIGN KEY (aluno_id) REFERENCES Alunos(id),
    UNIQUE(aluno_id, componente_id)
);

CREATE TABLE Log_Notas (
    id_log SERIAL PRIMARY KEY,
    aluno_id_log INT,
    componente_id_log INT,
    valor_antigo DECIMAL(4,2),
    valor_novo DECIMAL(4,2),
    operacao VARCHAR(10),
    data_modificacao TIMESTAMP
);

CREATE OR REPLACE FUNCTION func_auditoria_notas()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO Log_Notas (
            aluno_id_log, 
            componente_id_log, 
            valor_antigo, 
            valor_novo, 
            operacao, 
            data_modificacao
        )
        VALUES (
            NEW.aluno_id, 
            NEW.componente_id, 
            NULL, 
            NEW.valor, 
            'INSERT', 
            NOW()
        );
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO Log_Notas (
            aluno_id_log, 
            componente_id_log, 
            valor_antigo, 
            valor_novo, 
            operacao, 
            data_modificacao
        )
        VALUES (
            NEW.aluno_id, 
            NEW.componente_id, 
            OLD.valor, 
            NEW.valor, 
            'UPDATE', 
            NOW()
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_AUDITORIA_NOTAS ON Notas;

CREATE TRIGGER TRG_AUDITORIA_NOTAS
    AFTER INSERT OR UPDATE ON Notas
    FOR EACH ROW
    EXECUTE FUNCTION func_auditoria_notas();

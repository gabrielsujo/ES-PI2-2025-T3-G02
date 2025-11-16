Projeto NotaDez (ES-PI2-2025-T3-G02)
Murilo Moraes, Guilherme Oliveira, Gabriel Martins, Vinicius Valim

O Projeto NotaDez é um projeto desenvolvido para a disciplina de Projeto Integrador. O sistema permite que professores gerenciem suas instituições, disciplinas, turmas e alunos, com um foco principal no lançamento de notas e na configuração de fórmulas de cálculo de média.

Funcionalidades Principais
--Autenticação de Usuário: Sistema completo de registro e login de professores usando JSON  e bcrypt para criptografia de senhas.
--Recuperação de Senha: Funcionalidade de "Esqueci minha senha" com envio de e-mail .


Gerenciamento:
--Instituições: Crie, liste, edite e remova instituições de ensino.
--Disciplinas: Crie, liste e remova disciplinas vinculadas a uma instituição.
--Turmas: Crie, liste e remova turmas vinculadas a uma disciplina.
--Alunos: Crie, liste, edite e remova alunos por turma.


Gestão de Notas:

--Importação de Alunos: Importe listas de alunos para uma turma via upload de arquivo .csv.
--Configuração de Média: Defina a fórmula de cálculo da nota final (aritmética simples ou ponderada) para cada disciplina, usando componentes como P1, P2.
--Lançamento de Notas: Interface dedicada para lançar as notas de cada componente (P1, P2) para cada aluno da turma.
--Exportação de Notas: Exporte um .csv com o diário de notas da turma, incluindo as notas dos componentes e a nota final calculada.



Tecnologias:
Backend: Node.js, TypeScript

Banco de Dados: PostgreSQL

Frontend: HTML5, CSS3, JavaScript 

Autenticação: JSON , bcrypt

Configuração e Instalação
Siga os passos abaixo para executar o projeto localmente!



1. Pré-requisitos:
--Node.js 

--PostgreSQL 

--git clone https://github.com/gabrielsujo/es-pi2-2025-t3-g02.git

--cd es-pi2-2025-t3-g02



3. Instalar Dependências
Execute o comando abaixo para instalar todas as dependências listadas no package.json (como Express, mathjs):

--npm install
--npm install mathjs
--npm install @types/mathjs --save-dev



4. Configurar Variáveis de Ambiente
Crie um arquivo chamado .env na raiz do projeto. Este arquivo não deve ser enviado para o GitHub (ele já está no .gitignore).
Copie o conteúdo abaixo para o seu arquivo .env e substitua os valores pelos da sua configuração local, especialmente do banco de dados e do serviço de e-mail.

DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD="sua_senha_do_banco_aqui"
DB_DATABASE=postgres
DB_PORT=5432

# CONFIGURAÇÃO DO SERVIDOR
PORT=3000

# SEGURANÇA (JSON WEB TOKEN)
JWT_SECRET=coloqueaquiumafrasealeatoria

# Servico de email para recuperar a senha
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seuemail@example.com
EMAIL_PASS=sua_senha



5. Configurar o Banco de Dados
Certifique-se de que seu servidor PostgreSQL esteja rodando e
crie o banco de dados com o nome que você especificou em DB_DATABASE 

O arquivo src/sql/codigo.sql contém todo o script de criação das tabelas, funções necessárias.

Execute o conteúdo desse arquivo no seu banco de dados para criar a estrutura.

-----Com tudo instalado e configurado, você pode rodar o servidor-----

---> npm run dev

Após iniciar, a aplicação estará disponível em http://localhost:3000 (ou a porta definida no seu .env)!

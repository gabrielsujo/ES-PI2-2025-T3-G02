document.addEventListener('DOMContentLoaded', () => {

    // 1. funções auxiliares

    function getToken() {
        return localStorage.getItem('token');
    }

    function getUrlParam(param) {
        return new URLSearchParams(window.location.search).get(param);
    }

    // verifica se o usuário está logado
    if (!getToken()) {
        alert('Sessão expirada. Faça o login novamente.');
        window.location.href = 'login.html';
        return; // para a execução
    }

   
    const institutionId = getUrlParam('instituicao_id');
    const listaDisciplinas = document.getElementById('disciplinas-lista');

    // modal de disciplina
    const modalDisciplina = document.getElementById('modal-disciplina');
    const formDisciplina = document.getElementById('form-disciplina');
    const btnAddDisciplina = document.getElementById('add-disciplina-btn');

    // modal de turma
    const modalTurma = document.getElementById('modal-turma');
    const formTurma = document.getElementById('form-turma');
    const hiddenDisciplinaIdTurma = document.getElementById('turma-disciplina-id'); // input <hidden>

    // validação: precisa do id da instituição
    if (!institutionId) {
        alert('ID da Instituição não encontrado na URL. Retornando ao dashboard.');
        window.location.href = 'dashboard.html';
        return;
    }

    // --- 3. função principal: carregar disciplinas ---

    async function carregarDisciplinas() {
        // limpa o conteúdo estático do html
        listaDisciplinas.innerHTML = ''; 

        try {
            // monta os cabeçalhos para a requisição
            const headers = {
                'Authorization': `Bearer ${getToken()}`
            };

            // busca na api as disciplinas (e suas turmas)
            const response = await fetch(`/api/instituicoes/${institutionId}/disciplinas`, { headers });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Não foi possível carregar as disciplinas');
            }

            const disciplinas = await response.json();

            // se não houver disciplinas exibe uma mensagem
            if (disciplinas.length === 0) {
                listaDisciplinas.innerHTML = '<p style="padding: 2rem; text-align: center; color: var(--text-secondary);">Nenhuma disciplina cadastrada.</p>';
                return;
            }

            // para cada disciplina, cria um card e adiciona na lista
            disciplinas.forEach(disciplina => {
                const card = criarCardDisciplina(disciplina);
                listaDisciplinas.appendChild(card);
            });

        } catch (err) {
            console.error('Erro ao carregar disciplinas:', err);
            alert(`Erro: ${err.message}`);
        }
    }

    // --- 4. funções de renderização (como criar o html) ---

    /**
     * cria o html de um card de disciplina
     */
    function criarCardDisciplina(disciplina) {
        const article = document.createElement('article');
        article.className = 'card disciplina-card';
        
        // cria a lista de turmas (ou exibe a mensagem "nenhuma turma")
        const turmasHtml = disciplina.turmas.length > 0
            ? disciplina.turmas.map(turma => criarItemTurma(turma, disciplina.id)).join('')
            : '<li style="padding: 0.5rem; color: var(--text-secondary);">Nenhuma turma cadastrada.</li>';

        // preenche o html do card com os dados da disciplina
        article.innerHTML = `
            <div class="card-content">
                <h3>${disciplina.nome}</h3>
                <p><strong>Código:</strong> ${disciplina.codigo} | <strong>Sigla:</strong> ${disciplina.sigla} | <strong>Período:</strong> ${disciplina.periodo}</p>
            </div>
            <div class="turmas-section">
                <h4>Turmas</h4>
                <ul class="turmas-lista">${turmasHtml}</ul>
                <button class="btn-secondary-small btn-add-turma" data-disciplina-id="${disciplina.id}">+ Adicionar Turma</button>
            </div>
            <div class="card-actions disciplina-actions card-actions-multi">
                <button class="btn-danger-outline btn-excluir" data-id="${disciplina.id}" data-nome="${disciplina.nome}" data-tipo="disciplina">
                    Remover
                </button>
                <a href="./componentes.html?disciplina_id=${disciplina.id}" class="btn-secondary">Configurar componentes</a>
            </div>
        `;
        return article;
    }

    /**
     * cria o html de um item <li> de turma
     */
    function criarItemTurma(turma, disciplinaId) {
        // correção importante: passa os ids para as páginas de alunos e notas
        return `
            <li class="turma-item">
                <span>${turma.nome} - ${turma.dia_semana}, ${turma.horario}</span>
                <div class="turma-actions">
                    <a href="./alunos.html?turma_id=${turma.id}&disciplina_id=${disciplinaId}" class="btn-tertiary">Gerenciar Alunos</a>
                    <a href="./notas.html?turma_id=${turma.id}&disciplina_id=${disciplinaId}" class="btn-tertiary">Lançar Notas</a>
                    <button class="btn-tertiary-danger btn-excluir" data-id="${turma.id}" data-nome="${turma.nome}" data-tipo="turma">
                        Remover
                    </button>
                </div>
            </li>
        `;
    }

    

    // --- modal "adicionar disciplina" ---
    
    // abrir o modal
    btnAddDisciplina.addEventListener('click', () => {
        formDisciplina.reset(); // limpa o formulário
        modalDisciplina.style.display = 'flex';
    });

    // salvar a disciplina
    formDisciplina.addEventListener('submit', async (e) => {
        e.preventDefault(); // impede o recarregamento da página
        
        // pega os dados dos inputs do formulário
        const dados = {
            nome: document.getElementById('disciplina-nome').value,
            sigla: document.getElementById('disciplina-sigla').value,
            codigo: document.getElementById('disciplina-codigo').value,
            periodo: document.getElementById('disciplina-periodo').value,
            instituicao_id: institutionId // adiciona o id da instituição
        };

        try {
            const response = await fetch('/api/disciplinas', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Não foi possível salvar');
            }

            alert('Disciplina criada com sucesso!');
            modalDisciplina.style.display = 'none'; // fecha o modal
            carregarDisciplinas(); // recarrega a lista de disciplinas

        } catch (err) {
            alert(`Erro ao salvar: ${err.message}`);
        }
    });

    // --- modal "adicionar turma" ---
    
    // abrir o modal (usando "delegação de evento")
    // como os botões "+ adicionar turma" são dinâmicos,
    // ouvimos por cliques na 'listaDisciplinas' inteira.
    listaDisciplinas.addEventListener('click', (e) => {
        // se o que foi clicado foi um botão com a classe 'btn-add-turma'
        if (e.target.classList.contains('btn-add-turma')) {
            const disciplinaId = e.target.dataset.disciplinaId;
            formTurma.reset();
            hiddenDisciplinaIdTurma.value = disciplinaId; // coloca o id no input hidden
            modalTurma.style.display = 'flex';
        }
    });

    // salvar a turma
    formTurma.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // pega os dados dos inputs do formulário
        const dados = {
            nome: document.getElementById('turma-nome').value,
            dia: document.getElementById('turma-dia').value, // o nome do input é 'dia'
            horario: document.getElementById('turma-horario').value,
            local: document.getElementById('turma-local').value,
            disciplinaId: hiddenDisciplinaIdTurma.value // pega o id do input hidden
        };
        
        try {
            const response = await fetch('/api/turmas', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Não foi possível salvar');
            }

            alert('Turma criada com sucesso!');
            modalTurma.style.display = 'none'; // fecha o modal
            carregarDisciplinas(); // recarrega a lista para mostrar a nova turma

        } catch (err) {
            alert(`Erro ao salvar: ${err.message}`);
        }
    });

    // --- 6. lógica para fechar modais (genérico) ---
    // adiciona o evento para todos os botões "x" e "cancelar"
    document.querySelectorAll('.modal-close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // encontra o modal pai (o '.modal-overlay') e o esconde
            e.target.closest('.modal-overlay').style.display = 'none';
        });
    });

    // --- 7. início ---
    // carrega as disciplinas assim que a página é aberta
    carregarDisciplinas();
});
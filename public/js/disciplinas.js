
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. funções auxiliares ---

    function getToken() {
        return localStorage.getItem('token');
    }

    function getUrlParam(param) {
        return new URLSearchParams(window.location.search).get(param);
    }

    if (!getToken()) {
        alert('Sessão expirada. Faça o login novamente.');
        window.location.href = 'login.html';
        return; 
    }

    // --- 2. referências principais ---
    const institutionId = getUrlParam('instituicao_id');
    const listaDisciplinas = document.getElementById('disciplinas-lista');

    // modal de disciplina
    const modalDisciplina = document.getElementById('modal-disciplina');
    const formDisciplina = document.getElementById('form-disciplina');
    const btnAddDisciplina = document.getElementById('add-disciplina-btn');
    const tituloModalDisciplina = document.getElementById('modal-disciplina-title');
    const btnSubmitDisciplina = formDisciplina.querySelector('button[type="submit"]');

    // modal de turma
    const modalTurma = document.getElementById('modal-turma');
    const formTurma = document.getElementById('form-turma');
    const hiddenDisciplinaIdTurma = document.getElementById('turma-disciplina-id');
    const tituloModalTurma = document.getElementById('modal-turma-title');
    const btnSubmitTurma = formTurma.querySelector('button[type="submit"]');

    // variável para controlar se estamos criando ou editando
    let modoEdicao = {
        ativo: false,
        tipo: null, // 'disciplina' ou 'turma'
        id: null
    };

    if (!institutionId) {
        alert('ID da Instituição não encontrado na URL. Retornando ao dashboard.');
        window.location.href = 'dashboard.html';
        return;
    }

    // --- 3. função principal: carregar disciplinas ---

    async function carregarDisciplinas() {
        listaDisciplinas.innerHTML = ''; 

        try {
            const headers = { 'Authorization': `Bearer ${getToken()}` };
            const response = await fetch(`/api/instituicoes/${institutionId}/disciplinas`, { headers });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Não foi possível carregar as disciplinas');
            }

            const disciplinas = await response.json();

            if (disciplinas.length === 0) {
                listaDisciplinas.innerHTML = '<p style="padding: 2rem; text-align: center; color: var(--text-secondary);">Nenhuma disciplina cadastrada.</p>';
                return;
            }

            disciplinas.forEach(disciplina => {
                const card = criarCardDisciplina(disciplina);
                listaDisciplinas.appendChild(card);
            });

        } catch (err) {
            console.error('Erro ao carregar disciplinas:', err);
            alert(`Erro: ${err.message}`);
        }
    }

    // --- 4. funções de renderização (criação do html) ---

    function criarCardDisciplina(disciplina) {
        const article = document.createElement('article');
        article.className = 'card disciplina-card';
        
        const turmasHtml = disciplina.turmas.length > 0
            ? disciplina.turmas.map(turma => criarItemTurma(turma, disciplina.id, institutionId)).join('')
            : '<li style="padding: 0.5rem; color: var(--text-secondary);">Nenhuma turma cadastrada.</li>';

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
                
                <button class="btn-secondary btn-edit-disciplina" 
                    data-id="${disciplina.id}" 
                    data-nome="${disciplina.nome}" 
                    data-sigla="${disciplina.sigla}" 
                    data-codigo="${disciplina.codigo}" 
                    data-periodo="${disciplina.periodo}">
                    Editar
                </button>

                <a href="./componentes.html?disciplina_id=${disciplina.id}&instituicao_id=${institutionId}" class="btn-secondary">Configurar componentes</a>
            </div>
        `;
        // ajusta o layout dos botões (flex)
        article.querySelector('.card-actions-multi').style.justifyContent = 'space-between';
        article.querySelector('.btn-excluir').style.flex = '1';
        article.querySelector('.btn-edit-disciplina').style.flex = '1';
        article.querySelector('.btn-secondary').style.flex = '2'; // dá mais espaço

        return article;
    }

    function criarItemTurma(turma, disciplinaId, institutionId) {
        return `
            <li class="turma-item">
                <span>${turma.nome} - ${turma.dia_semana}, ${turma.horario}</span>
                <div class="turma-actions">
                    <button class="btn-tertiary btn-edit-turma"
                        data-id="${turma.id}"
                        data-nome="${turma.nome}"
                        data-dia="${turma.dia_semana}"
                        data-horario="${turma.horario}"
                        data-local="${turma.local}"
                        data-disciplina-id="${disciplinaId}">
                        Editar
                    </button>
                    <a href="./alunos.html?turma_id=${turma.id}&disciplina_id=${disciplinaId}&instituicao_id=${institutionId}" class="btn-tertiary">Gerenciar Alunos</a>
                    <a href="./notas.html?turma_id=${turma.id}&disciplina_id=${disciplinaId}&instituicao_id=${institutionId}" class="btn-tertiary">Lançar Notas</a>
                    <button class="btn-tertiary-danger btn-excluir" data-id="${turma.id}" data-nome="${turma.nome}" data-tipo="turma">
                        Remover
                    </button>
                </div>
            </li>
        `;
    }

    // --- 5. lógica dos modais ---

    /**
     * reseta e fecha todos os modais, limpando o modo de edição
     */
    function fecharTodosModais() {
        modalDisciplina.style.display = 'none';
        modalTurma.style.display = 'none';
        
        // reseta o estado de edição
        modoEdicao = { ativo: false, tipo: null, id: null };
        
        // reseta os formulários
        formDisciplina.reset();
        formTurma.reset();
        
        // reseta os títulos e botões para o padrão "adicionar"
        tituloModalDisciplina.textContent = 'Adicionar Nova Disciplina';
        btnSubmitDisciplina.textContent = 'Salvar Disciplina';
        tituloModalTurma.textContent = 'Adicionar Nova Turma';
        btnSubmitTurma.textContent = 'Salvar Turma';
    }

    // --- modal "adicionar disciplina" (abrir) ---
    btnAddDisciplina.addEventListener('click', () => {
        fecharTodosModais(); // limpa tudo primeiro
        // re-configura para "adicionar" (já feito no fecharTodosModais)
        modalDisciplina.style.display = 'flex';
    });

    // --- modal "adicionar/editar disciplina" (salvar) ---
    formDisciplina.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const dados = {
            nome: document.getElementById('disciplina-nome').value,
            sigla: document.getElementById('disciplina-sigla').value,
            codigo: document.getElementById('disciplina-codigo').value,
            periodo: document.getElementById('disciplina-periodo').value,
            instituicao_id: institutionId // necessário para criar
        };
        
        let url = '/api/disciplinas';
        let method = 'POST';

        // se estiver editando, muda a url e o método
        if (modoEdicao.ativo && modoEdicao.tipo === 'disciplina') {
            url = `/api/disciplinas/${modoEdicao.id}`;
            method = 'PUT';
        }

        try {
            const response = await fetch(url, { 
                method: method,
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

            alert(method === 'POST' ? 'Disciplina criada!' : 'Disciplina atualizada!');
            fecharTodosModais();
            carregarDisciplinas(); 

        } catch (err) {
            alert(`Erro ao salvar: ${err.message}`);
        }
    });

    // --- modal "adicionar/editar turma" (salvar) ---
    formTurma.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const dados = {
            nome: document.getElementById('turma-nome').value,
            dia: document.getElementById('turma-dia').value,
            horario: document.getElementById('turma-horario').value,
            local: document.getElementById('turma-local').value,
            disciplinaId: hiddenDisciplinaIdTurma.value // pego do input hidden
        };
        
        let url = '/api/turmas';
        let method = 'POST';

        // se estiver editando, muda a url e o método
        if (modoEdicao.ativo && modoEdicao.tipo === 'turma') {
            url = `/api/turmas/${modoEdicao.id}`;
            method = 'PUT';
        }
        
        try {
            const response = await fetch(url, { 
                method: method,
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

            alert(method === 'POST' ? 'Turma criada!' : 'Turma atualizada!');
            fecharTodosModais();
            carregarDisciplinas();

        } catch (err) {
            alert(`Erro ao salvar: ${err.message}`);
        }
    });


    // --- 6. listeners de clique (delegação de evento) ---
    
    listaDisciplinas.addEventListener('click', (e) => {
        const target = e.target;

        // --- abrir modal "adicionar turma" ---
        if (target.classList.contains('btn-add-turma')) {
            fecharTodosModais(); // limpa tudo
            const disciplinaId = target.dataset.disciplinaId;
            hiddenDisciplinaIdTurma.value = disciplinaId; // define o id da disciplina
            modalTurma.style.display = 'flex';
        }

        // --- abrir modal "editar disciplina" ---
        if (target.classList.contains('btn-edit-disciplina')) {
            fecharTodosModais(); // limpa tudo
            const data = target.dataset;

            // 1. define o estado de edição
            modoEdicao.ativo = true;
            modoEdicao.tipo = 'disciplina';
            modoEdicao.id = data.id;

            // 2. preenche o formulário
            tituloModalDisciplina.textContent = 'Editar Disciplina';
            btnSubmitDisciplina.textContent = 'Atualizar';
            document.getElementById('disciplina-nome').value = data.nome;
            document.getElementById('disciplina-sigla').value = data.sigla;
            document.getElementById('disciplina-codigo').value = data.codigo;
            document.getElementById('disciplina-periodo').value = data.periodo;
            
            // 3. abre o modal
            modalDisciplina.style.display = 'flex';
        }
        
        // --- abrir modal "editar turma" ---
        if (target.classList.contains('btn-edit-turma')) {
            fecharTodosModais(); // limpa tudo
            const data = target.dataset;

            // 1. define o estado de edição
            modoEdicao.ativo = true;
            modoEdicao.tipo = 'turma';
            modoEdicao.id = data.id;

            // 2. preenche o formulário
            tituloModalTurma.textContent = 'Editar Turma';
            btnSubmitTurma.textContent = 'Atualizar';
            document.getElementById('turma-nome').value = data.nome;
            document.getElementById('turma-dia').value = data.dia;
            document.getElementById('turma-horario').value = data.horario;
            document.getElementById('turma-local').value = data.local;
            hiddenDisciplinaIdTurma.value = data.disciplinaId; // importante
            
            // 3. abre o modal
            modalTurma.style.display = 'flex';
        }
    });

    // --- 7. lógica para fechar modais (botões x e cancelar) ---
    document.querySelectorAll('.modal-close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            fecharTodosModais(); // reseta tudo ao fechar
        });
    });

    // --- 8. início ---
    carregarDisciplinas();
});

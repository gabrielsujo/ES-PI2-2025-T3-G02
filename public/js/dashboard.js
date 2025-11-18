document.addEventListener('DOMContentLoaded', () => {
    //  pegando os botões, inputs e etc.
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const modal = document.getElementById('modal-instituicao');
    const modalTitle = document.getElementById('modal-instituicao-title');
    const form = document.getElementById('form-instituicao');
    const hiddenIdInput = document.getElementById('instituicao-id-hidden');
    const nomeInput = document.getElementById('instituicao-nome');
    const submitButton = document.getElementById('modal-instituicao-submit');
    
    const btnAdd = document.getElementById('add-instituicao-btn');
    const btnLogout = document.getElementById('logout-button');
    const listaInstituicoes = document.getElementById('instituicoes-lista');
    const emptyMsg = document.getElementById('empty-state-msg');
    
    //  headers da api para não ficar repetindo
    const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    //  funções principais

    // busca as instituições na api e desenha na tela
    async function carregarInstituicoes() {
        listaInstituicoes.innerHTML = ''; 
        emptyMsg.style.display = 'none';

        try {
            const response = await fetch('/api/instituicoes', { headers: apiHeaders });

            // se o token tiver expirado, manda pro login
            if (response.status === 401 || response.status === 403) { 
                alert('Sua sessão expirou. Faça o login novamente.');
                localStorage.removeItem('token');
                window.location.href = 'login.html'; 
                return;
            }

            const instituicoes = await response.json();

            if (instituicoes.length === 0) {
                emptyMsg.style.display = 'block';
                abrirModalParaCriar();
            } else {
                instituicoes.forEach(inst => {
                    const card = criarCardInstituicao(inst);
                    listaInstituicoes.appendChild(card);
                });
            }
        } catch (err) {
            console.error('Erro ao carregar instituições:', err);
            alert('Não foi possível carregar suas instituições.');
        }
    }

    // cria o html do card
    function criarCardInstituicao(inst) {
        const article = document.createElement('article');
        article.className = 'card';
        
        let subtitleHtml = '';
        if (!inst.totalDisciplinas || inst.totalDisciplinas === 0) {
            subtitleHtml = '<p class="card-subtitle-empty">Nenhuma disciplina cadastrada</p>';
        } else if (inst.totalDisciplinas === 1) {
            subtitleHtml = '<p class="card-subtitle">1 disciplina cadastrada</p>';
        } else {
            subtitleHtml = `<p class="card-subtitle">${inst.totalDisciplinas} disciplinas cadastradas</p>`;
        }

        article.innerHTML = `
            <div class="card-content">
                <h3>${inst.nome}</h3>
                ${subtitleHtml} 
            </div>
            <div class="card-actions card-actions-multi d-flex justify-content-between align-items-center">
                
                <a href="/disciplinas.html?instituicao_id=${inst.id}" class="btn-primary-main">
                    Gerenciar Disciplinas
                </a>
                
                <div class="btn-small-group d-flex align-items-center">
                    <button class="btn-secondary btn-editar btn-sm me-2" 
                            data-id="${inst.id}" 
                            data-nome="${inst.nome}">
                        Editar
                    </button>
                    
                    <button class="btn-danger-outline btn-excluir btn-sm" 
                            data-id="${inst.id}" 
                            data-nome="${inst.nome}" 
                            data-tipo="instituicao">
                        Remover
                    </button>
                </div>
            </div>
        `;
        return article;
    }

    // --- funções do modal (abrir/fechar) ---

    // abre o modal para criar
    function abrirModalParaCriar() {
        modalTitle.textContent = 'Adicionar Nova Instituição';
        hiddenIdInput.value = ''; // limpa o id
        nomeInput.value = ''; // limpa o nome
        submitButton.textContent = 'Salvar Instituição';
        modal.style.display = 'flex';
        nomeInput.focus();
    }

    // abre o modal para editar
    function abrirModalParaEditar(id, nome) {
        modalTitle.textContent = 'Editar Instituição';
        hiddenIdInput.value = id; // bota o id no campo escondido
        nomeInput.value = nome; // bota o nome atual no input
        submitButton.textContent = 'Atualizar';
        modal.style.display = 'flex';
        nomeInput.focus();
    }

    // fecha qualquer modal
    function fecharModal() {
        modal.style.display = 'none';
        form.reset(); // limpa o form
        hiddenIdInput.value = ''; // garante que limpou o id
    }

    // 4. salvar (serve para criar ou editar)
    async function salvarInstituicao(event) {
        event.preventDefault();
        const nome = nomeInput.value.trim();
        const id = hiddenIdInput.value; // pega o id (se tiver)
        
        if (!nome) {
            alert('O nome é obrigatório.');
            return;
        }

        // se tem id, edita. se não, cria.
        const isEditMode = id !== '';
        const url = isEditMode ? `/api/instituicoes/${id}` : '/api/instituicoes';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: apiHeaders,
                body: JSON.stringify({ nome: nome })
            });

            const result = await response.json();

            if (response.ok) {
                alert(isEditMode ? 'Instituição atualizada!' : 'Instituição criada!');
                fecharModal();
                carregarInstituicoes(); // recarrega a lista
            } else {
                alert(`Erro: ${result.error || 'Não foi possível salvar.'}`);
            }
        } catch (err) {
            console.error('Erro ao salvar:', err);
            alert('Falha na comunicação com o servidor.');
        }
    }
    // carrega tudo assim que a página abre
    carregarInstituicoes();

    // clique no botão "adicionar instituição"
    btnAdd.addEventListener('click', abrirModalParaCriar);

    // clique no botão "sair"
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // clique nos botões de fechar modal (x e cancelar)
    modal.querySelectorAll('.modal-close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', fecharModal);
    });
    form.addEventListener('submit', salvarInstituicao);

    // clique no botão editar de um card (usa delegação de evento)
    listaInstituicoes.addEventListener('click', (e) => {
        // procura pelo botão '.btn-editar' mais próximo
        const editButton = e.target.closest('.btn-editar');
        if (editButton) {
            const id = editButton.dataset.id;
            const nome = editButton.dataset.nome;
            abrirModalParaEditar(id, nome);
        }
    });
});
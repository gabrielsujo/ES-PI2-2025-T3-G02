document.addEventListener('DOMContentLoaded', () => {
    // --- REFERÊNCIAS DO DOM ---
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const modal = document.getElementById('modal-instituicao');
    const modalTitle = document.getElementById('modal-instituicao-title');
    const form = document.getElementById('form-instituicao');
    const hiddenIdInput = document.getElementById('instituicao-id-hidden'); // ⬅️ Referência para o input hidden
    const nomeInput = document.getElementById('instituicao-nome');
    const submitButton = document.getElementById('modal-instituicao-submit');
    
    const btnAdd = document.getElementById('add-instituicao-btn');
    const btnLogout = document.getElementById('logout-button');
    const listaInstituicoes = document.getElementById('instituicoes-lista');
    const emptyMsg = document.getElementById('empty-state-msg');
    
    // --- CABEÇALHOS GLOBAIS DA API ---
    const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // --- FUNÇÕES ---

    /**
     * READ (GET): Busca instituições na API e as renderiza
     */
    async function carregarInstituicoes() {
        listaInstituicoes.innerHTML = ''; 
        emptyMsg.style.display = 'none';

        try {
            const response = await fetch('/api/instituicoes', { headers: apiHeaders });

            if (response.status === 401 || response.status === 403) { 
                alert('Sua sessão expirou. Faça o login novamente.');
                localStorage.removeItem('token');
                window.location.href = 'login.html'; 
                return;
            }

            const instituicoes = await response.json();

            if (instituicoes.length === 0) {
                emptyMsg.style.display = 'block';
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

    /**
     * Helper: Cria o HTML do Card
     */
    function criarCardInstituicao(inst) {
        const article = document.createElement('article');
        article.className = 'card';
        
        article.innerHTML = `
            <div class="card-content">
                <h3>${inst.nome}</h3>
                <p class="card-subtitle-empty">Nenhuma disciplina cadastrada</p> 
            </div>
            <div class="card-actions card-actions-multi">
                <button class="btn-danger-outline btn-excluir" 
                        data-id="${inst.id}" 
                        data-nome="${inst.nome}" 
                        data-tipo="instituicao">
                    Remover
                </button>
                
                <button class="btn-secondary btn-editar" data-id="${inst.id}" data-nome="${inst.nome}">
                    Editar
                </button>
                
                <a href="/disciplinas.html?instituicao_id=${inst.id}" class="btn-secondary">
                    Gerenciar Disciplinas
                </a>
            </div>
        `;
        return article;
    }

    // --- Funções de Abrir/Fechar Modal ---

    function abrirModalParaCriar() {
        modalTitle.textContent = 'Adicionar Nova Instituição';
        hiddenIdInput.value = ''; // Limpa o ID
        nomeInput.value = ''; // Limpa o nome
        submitButton.textContent = 'Salvar Instituição';
        modal.style.display = 'flex';
        nomeInput.focus();
    }

    // --- ADICIONADO PARA EDITAR ---
    // Preenche o modal com os dados existentes
    function abrirModalParaEditar(id, nome) {
        modalTitle.textContent = 'Editar Instituição';
        hiddenIdInput.value = id; // Define o ID para o modo de edição
        nomeInput.value = nome; // Preenche o nome atual
        submitButton.textContent = 'Atualizar';
        modal.style.display = 'flex';
        nomeInput.focus();
    }

    function fecharModal() {
        modal.style.display = 'none';
        form.reset(); // Limpa o formulário ao fechar
        hiddenIdInput.value = ''; // Garante que o ID foi limpo
    }

    /**
     * CREATE (POST) / UPDATE (PUT): Salva ou Edita
     */
    // --- ATUALIZADO PARA EDITAR ---
    async function salvarInstituicao(event) {
        event.preventDefault();
        const nome = nomeInput.value.trim();
        const id = hiddenIdInput.value; // Pega o ID (estará vazio se for "Criar")
        
        if (!nome) {
            alert('O nome é obrigatório.');
            return;
        }

        // Verifica se é modo de Edição (se tem ID)
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
                carregarInstituicoes(); // Recarrega a lista
            } else {
                alert(`Erro: ${result.error || 'Não foi possível salvar.'}`);
            }
        } catch (err) {
            console.error('Erro ao salvar:', err);
            alert('Falha na comunicação com o servidor.');
        }
    }


    // --- EVENT LISTENERS ---
    
    carregarInstituicoes();

    btnAdd.addEventListener('click', abrirModalParaCriar);

    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    modal.querySelectorAll('.modal-close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', fecharModal);
    });

    form.addEventListener('submit', salvarInstituicao);

    // --- ADICIONADO PARA EDITAR ---
    // Listener para os botões "Editar" (usa delegação de eventos na lista)
    listaInstituicoes.addEventListener('click', (e) => {
        // Verifica se o clique foi num botão de editar
        const editButton = e.target.closest('.btn-editar');
        if (editButton) {
            const id = editButton.dataset.id;
            const nome = editButton.dataset.nome;
            abrirModalParaEditar(id, nome);
        }
    });
});

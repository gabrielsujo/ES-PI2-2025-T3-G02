// Em: public/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    // Se não houver token, redireciona para o login
    if (!token) {
        window.location.href = '/login.html'; 
        return;
    }

    // --- Elementos do DOM ---
    const lista = document.getElementById('instituicoes-lista');
    const msgVazia = document.getElementById('empty-state-msg');
    const btnAdd = document.getElementById('add-instituicao-btn');
    const modal = document.getElementById('modal-instituicao');
    const form = document.getElementById('form-instituicao');
    const inputNome = document.getElementById('instituicao-nome');
    const btnLogout = document.getElementById('logout-button');

    // --- 1. Carregar Instituições (GET) ---
    async function carregarInstituicoes() {
        try {
            // Usa a URL relativa (correto, pois está no mesmo servidor)
            const response = await fetch('/api/instituicoes', {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}` 
                }
            });

            // Se o token for inválido/expirado, o backend retorna 401
            if (response.status === 401 || response.status === 403) { 
                alert('Sua sessão expirou. Faça o login novamente.');
                localStorage.removeItem('token');
                window.location.href = '/login.html'; 
                return;
            }

            const instituicoes = await response.json();
            lista.innerHTML = ''; // Limpa os cards de exemplo

            if (instituicoes.length === 0) {
                msgVazia.style.display = 'block';
            } else {
                msgVazia.style.display = 'none';
                // Renderiza (desenha) os cards
                instituicoes.forEach(inst => {
                    const card = document.createElement('article');
                    card.className = 'card';
                    
                    // (O backend de disciplinas.html vai preencher o card-subtitle)
                    card.innerHTML = `
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
                            <a href="/disciplinas.html?instituicao_id=${inst.id}" class="btn-secondary">
                                Gerenciar Disciplinas
                            </a>
                        </div>
                    `;
                    lista.appendChild(card);
                });
            }
        } catch (err) {
            console.error('Erro ao carregar instituições:', err);
            alert('Não foi possível carregar suas instituições.');
        }
    }

    // --- 2. Adicionar Instituição (POST) ---
    
    // Abrir o modal
    btnAdd.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    // Enviar o formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = inputNome.value.trim();
        if (!nome) return;

        try {
            const response = await fetch('/api/instituicoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ nome: nome })
            });

            if (response.ok) {
                form.reset();
                modal.style.display = 'none';
                carregarInstituicoes(); // Recarrega a lista
            } else {
                const err = await response.json();
                alert(`Erro ao salvar: ${err.error || 'Erro desconhecido'}`);
            }
        } catch (err) {
            console.error('Falha na comunicação ao salvar:', err);
            alert('Falha na comunicação ao salvar.');
        }
    });

    // --- 3. Fechar Modal (X ou Cancelar) ---
    modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay') || 
            e.target.classList.contains('btn-cancel') || 
            e.target.classList.contains('modal-close-btn')) {
            
            modal.style.display = 'none';
            form.reset();
        }
    });

    // --- 4. Logout ---
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    // --- Iniciar ---
    carregarInstituicoes();

});
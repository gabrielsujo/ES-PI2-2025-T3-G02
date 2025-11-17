import { generateFormula } from '/utils/GerarFormula.js'; 

document.addEventListener('DOMContentLoaded', () => {

    let G_COMPONENTES = [];
    let G_FORMULA_SALVA = '';
    let G_DISCIPLINA_ID = null;
    let G_INSTITUICAO_ID = null;
    let G_EDITANDO_COMPONENTE_ID = null;

    const headerNomeDisciplina = document.getElementById('disciplina-nome-header');
    const linkVoltarDisciplinas = document.getElementById('back-to-disciplinas');

    const listaComponentesUI = document.getElementById('componentes-lista');
    const emptyComponentesMsg = document.getElementById('empty-componentes-msg');
    const btnAddComponete = document.getElementById('add-componente-btn');

    const formFormula = document.getElementById('form-formula-config');
    const tipoMediaSelect = document.getElementById('tipo-media');
    const pesosArea = document.getElementById('pesos-area');
    const pesosInputsContainer = document.getElementById('pesos-inputs-container');
    const formulaDisplay = document.getElementById('formula-display');
    const formulaFeedback = document.getElementById('formula-validation-feedback');

    const modalComponente = document.getElementById('modal-componente');
    const formComponente = document.getElementById('form-componente');
    const modalComponenteTitle = document.getElementById('modal-componente-title');
    const modalComponenteSubmit = document.getElementById('modal-componente-submit');
    const hiddenComponenteId = document.getElementById('componente-id-hidden');
    const nomeComponenteInput = document.getElementById('componente-nome');
    const siglaComponenteInput = document.getElementById('componente-sigla');
    const descComponenteInput = document.getElementById('componente-desc');

    const modalExclusao = document.getElementById('modal-confirmar-exclusao');
    const modalExclusaoMsg = document.getElementById('modal-exclusao-msg');
    const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao-sim');
    let G_ITEM_PARA_EXCLUIR = null;



    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        G_DISCIPLINA_ID = params.get('disciplina_id');
        G_INSTITUICAO_ID = params.get('instituicao_id');
    }

    function getToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sessão expirada.');
            window.location.href = 'login.html';
        }
        return token;
    }

    async function loadDadosDisciplina() {
        const token = getToken();
        if (!G_DISCIPLINA_ID || !token) {
            alert('Erro: ID da disciplina ou token não encontrado.');
            return;
        }

        linkVoltarDisciplinas.href = `./disciplinas.html?instituicao_id=${G_INSTITUICAO_ID}`;

        try {
            const response = await fetch(`/api/disciplinas/${G_DISCIPLINA_ID}/componentes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falha ao carregar dados');
            }

            const data = await response.json();
            

            G_COMPONENTES = data.componentes || [];
            G_FORMULA_SALVA = data.formula || '';

            renderComponentesLista();
            renderFormulaUI();

        } catch (err) {
            console.error(err);
            alert(`Erro ao carregar dados: ${err.message}`);
        }
    }


    function renderComponentesLista() {
        listaComponentesUI.innerHTML = ''; 
        if (G_COMPONENTES.length === 0) {
            emptyComponentesMsg.style.display = 'block';
            return;
        }
        
        emptyComponentesMsg.style.display = 'none';

        G_COMPONENTES.forEach(comp => {
            const li = document.createElement('li');
            li.className = 'componente-item turma-item'; 
            li.innerHTML = `
                <div class="componente-info">
                    <strong>${comp.nome} (Sigla: ${comp.sigla})</strong>
                    <span>${comp.descricao || 'Sem descrição'}</span>
                </div>
                <div class="componente-actions turma-actions">
                    <button class="btn-tertiary btn-edit-componente"
                        data-id="${comp.id}"
                        data-nome="${comp.nome}"
                        data-sigla="${comp.sigla}"
                        data-desc="${comp.descricao || ''}">
                        Editar
                    </button>
                    <button class="btn-tertiary-danger btn-delete-componente"
                        data-id="${comp.id}"
                        data-nome="${comp.nome}">
                        Remover
                    </button>
                </div>
            `;
            listaComponentesUI.appendChild(li);
        });
    }

    function renderFormulaUI() {
        formulaDisplay.textContent = G_FORMULA_SALVA || 'Nenhuma fórmula configurada.';
        
        if (tipoMediaSelect.value === 'ponderada') {
            pesosArea.style.display = 'block';
            pesosInputsContainer.innerHTML = '';

            if (G_COMPONENTES.length === 0) {
                 pesosInputsContainer.innerHTML = '<p class="form-hint">Adicione componentes primeiro.</p>';
                 return;
            }

            G_COMPONENTES.forEach(comp => {
                const div = document.createElement('div');
                div.className = 'input-group';
                div.innerHTML = `
                    <label for="peso-${comp.sigla}">Peso para ${comp.sigla}</label>
                    <input 
                        type="number" 
                        id="peso-${comp.sigla}" 
                        name="peso-${comp.sigla}" 
                        class="input-peso-componente"
                        data-sigla="${comp.sigla}"
                        min="0" 
                        value="1" 
                        required>
                `;
                pesosInputsContainer.appendChild(div);
            });
        } else {
            pesosArea.style.display = 'none';
            pesosInputsContainer.innerHTML = '';
        }
        
        validarFormula(G_FORMULA_SALVA);
    }

    function validarFormula(formula) {
        if (!formula || G_COMPONENTES.length === 0) {
            formulaFeedback.style.display = 'none';
            return;
        }

        const siglasNaFormula = new Set(formula.match(/[A-Za-z0-9_]+/g) || []);
        const siglasCadastradas = new Set(G_COMPONENTES.map(c => c.sigla));
        
        let feedback = '';

        siglasCadastradas.forEach(sigla => {
            if (!siglasNaFormula.has(sigla)) {
                feedback += `⚠️ A sigla '${sigla}' está cadastrada mas não foi usada na fórmula.\n`;
            }
        });

        siglasNaFormula.forEach(sigla => {
            if (!siglasCadastradas.has(sigla) && isNaN(sigla)) { 
                 feedback += `❌ A sigla '${sigla}' está na fórmula mas não foi cadastrada.\n`;
            }
        });

        if (feedback) {
            formulaFeedback.textContent = feedback;
            formulaFeedback.style.display = 'block';
        } else {
            formulaFeedback.style.display = 'none';
        }
    }


    function abrirModalComponente(modo, data = null) {
        formComponente.reset();
        if (modo === 'criar') {
            G_EDITANDO_COMPONENTE_ID = null;
            modalComponenteTitle.textContent = 'Adicionar Componente';
            modalComponenteSubmit.textContent = 'Salvar';
        } else if (modo === 'editar' && data) {
            G_EDITANDO_COMPONENTE_ID = data.id;
            modalComponenteTitle.textContent = 'Editar Componente';
            modalComponenteSubmit.textContent = 'Atualizar';
            
            hiddenComponenteId.value = data.id;
            nomeComponenteInput.value = data.nome;
            siglaComponenteInput.value = data.sigla;
            descComponenteInput.value = data.desc;
        }
        modalComponente.style.display = 'flex';
        nomeComponenteInput.focus();
    }

    function fecharModalComponente() {
        modalComponente.style.display = 'none';
        formComponente.reset();
        G_EDITANDO_COMPONENTE_ID = null;
    }

    async function salvarComponente(e) {
        e.preventDefault();
        const token = getToken();

        const dados = {
            nome: nomeComponenteInput.value.trim(),
            sigla: siglaComponenteInput.value.trim().toUpperCase(),
            desc: descComponenteInput.value.trim(),
            disciplina_id: G_DISCIPLINA_ID
        };

        if (!dados.nome || !dados.sigla) {
            alert('Nome e Sigla são obrigatórios.');
            return;
        }

        const isEditMode = G_EDITANDO_COMPONENTE_ID !== null;
        const url = isEditMode ? `/api/componentes/${G_EDITANDO_COMPONENTE_ID}` : '/api/componentes';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falha ao salvar');
            }

            alert(`Componente ${isEditMode ? 'atualizado' : 'criado'}!`);
            fecharModalComponente();
            loadDadosDisciplina();
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    }


    function abrirModalExclusao(id, nome) {
        G_ITEM_PARA_EXCLUIR = { id, nome };
        modalExclusaoMsg.innerHTML = `Tem certeza que deseja excluir o componente <strong>"${nome}"</strong>? Esta ação é irrevogável e pode falhar se houver notas lançadas para ele.`;
        modalExclusao.style.display = 'flex';
    }

    function fecharModalExclusao() {
        modalExclusao.style.display = 'none';
        G_ITEM_PARA_EXCLUIR = null;
    }

    async function executarExclusao() {
        if (!G_ITEM_PARA_EXCLUIR) return;
        
        const token = getToken();
        const { id, nome } = G_ITEM_PARA_EXCLUIR;

        btnConfirmarExclusao.disabled = true;
        btnConfirmarExclusao.textContent = 'Excluindo...';

        try {
            const response = await fetch(`/api/componentes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `Falha ao excluir ${nome}`);
            }

            alert(`Componente "${nome}" excluído com sucesso.`);
            loadDadosDisciplina();

        } catch (err) {
            alert(`Erro: ${err.message}`);
        } finally {
            btnConfirmarExclusao.disabled = false;
            btnConfirmarExclusao.textContent = 'Sim, excluir';
            fecharModalExclusao();
        }
    }


    async function salvarFormula(e) {
        e.preventDefault();
        const token = getToken();
        
        if (G_COMPONENTES.length < 2) {
            alert('Você precisa cadastrar no minimo 2 componentes (ex p1 e p2) para definir uma fórmula.');
            return;
        }

        const tipoMedia = tipoMediaSelect.value;
        const siglas = G_COMPONENTES.map(c => c.sigla);
        let pesos = [];
        let formulaFinal = '';

        try {
            if (tipoMedia === 'ponderada') {
                const pesoInputs = document.querySelectorAll('.input-peso-componente');
                pesos = Array.from(pesoInputs).map(input => parseFloat(input.value));
                
                if (pesos.some(isNaN) || pesos.some(p => p < 0)) {
                    throw new Error("Todos os pesos devem ser números positivos.");
                }
            }
            
            formulaFinal = generateFormula(siglas, tipoMedia, pesos);

        } catch (error) {
            alert(`Erro ao gerar fórmula: ${error.message}`);
            return;
        }

        try {
            const response = await fetch(`/api/disciplinas/${G_DISCIPLINA_ID}/formula`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ formula: formulaFinal })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falha ao salvar no backend');
            }

            alert('Fórmula salva com sucesso!');
            G_FORMULA_SALVA = formulaFinal; 
            renderFormulaUI();
        } catch (err) {
            alert(`Erro ao salvar fórmula: ${err.message}`);
        }
    }


    btnAddComponete.addEventListener('click', () => abrirModalComponente('criar'));

    listaComponentesUI.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit-componente');
        if (btnEdit) {
            abrirModalComponente('editar', btnEdit.dataset);
            return;
        }

        const btnDelete = e.target.closest('.btn-delete-componente');
        if (btnDelete) {
            abrirModalExclusao(btnDelete.dataset.id, btnDelete.dataset.nome);
            return;
        }
    });

    formComponente.addEventListener('submit', salvarComponente);
    formFormula.addEventListener('submit', salvarFormula);

    tipoMediaSelect.addEventListener('change', renderFormulaUI);

    modalComponente.querySelectorAll('.modal-close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', fecharModalComponente);
    });
    modalExclusao.querySelectorAll('.modal-close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', fecharModalExclusao);
    });

    btnConfirmarExclusao.addEventListener('click', executarExclusao);

    getUrlParams();
    loadDadosDisciplina();
});

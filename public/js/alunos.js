document.addEventListener('DOMContentLoaded', () =>{
    
    // Referências aos modais
    const modalAluno = document.getElementById('modal-aluno');
    const modalCsv = document.getElementById('modal-csv');

    // Botões que abrem os modais
    const btnAddAluno = document.getElementById('add-aluno-btn');
    const btnImportCsv = document.getElementById('import-csv-btn');

    // Elementos da tabela para exclusão em lote
    const btnRemoveSelecionados = document.getElementById('remove-selecionados-btn');
    const selectAllCheckbox = document.getElementById('select-all-alunos');
    const tabelaBody = document.getElementById('alunos-tabela-body'); 
    const emptyMsg = document.getElementById('empty-state-msg'); // Mensagem se não houver alunos

    // Referências aos formulários
    const formsCsv = document.getElementById('form-csv');
    const formAluno = document.getElementById('form-aluno') 

    // Pega o ID da turma pela URL para saber de qual turma é
    const urlParams = new URLSearchParams(window.location.search);
    const turmaId = urlParams.get('turma_id');
    
    // --- INÍCIO DA CORREÇÃO ---
    // Precisamos de TODOS os IDs da URL para construir os links de navegação
    const disciplinaId = urlParams.get('disciplina_id');
    const instituicaoId = urlParams.get('instituicao_id');

    // Encontra o link "Disciplinas" pelo ID que demos a ele no HTML
    const breadcrumbDisciplinas = document.getElementById('breadcrumb-disciplinas');
    if (breadcrumbDisciplinas && instituicaoId) {
        // Define o link corretamente, passando o ID da instituição
        breadcrumbDisciplinas.href = `./disciplinas.html?instituicao_id=${instituicaoId}`;
    }
    // --- FIM DA CORREÇÃO ---

    // Se não tem ID da turma, avisa e desabilita os botões
    if (!turmaId) {
        console.warn('ID da turma não encontrado na URL. A importação e adição não funcionarão');
        if(btnImportCsv) btnImportCsv.disabled = true;
        if(btnAddAluno) btnAddAluno.disabled = true;
    }

    // --- FUNÇÃO PARA PEGAR OS ALUNOS E COLOCAR NA TELA ---
    async function loadAlunos() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Limpa a tabela antes de carregar os dados
        tabelaBody.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'none';

        try {
            // Vai na API buscar a lista de alunos desta turma
            const response = await fetch(`/api/turmas/${turmaId}/alunos`, { 
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falha ao carregar alunos.');
            }

            const alunos = await response.json();

            if (alunos.length === 0) {
                // Se não tiver aluno, mostra o aviso
                if (emptyMsg) emptyMsg.style.display = 'block';
                return;
            }

            // Para cada aluno que voltou da API, a gente cria uma linha na tabela
            alunos.forEach(aluno => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="cell-checkbox">
                        <input type="checkbox" name="alunoSelecionado" value="${aluno.id}">
                    </td>
                    <td data-field="matricula">${aluno.matricula}</td>
                    <td data-field="nome">${aluno.nome}</td>
                    <td class="col-acoes">
                        <div class="table-actions">
                            <button class="btn-table-action btn-edit" 
                                data-id="${aluno.id}"
                                data-matricula="${aluno.matricula}"
                                data-nome="${aluno.nome}">
                                Editar
                            </button>
                            <button class="btn-table-action btn-remove btn-excluir"
                                data-id="${aluno.id}"
                                data-nome="${aluno.nome}"
                                data-tipo="aluno">
                                Remover
                            </button>
                        </div>
                    </td>
                `;
                tabelaBody.appendChild(tr);
            });

            updateBatchDeleteButton(); // Atualiza o contador de seleção
        } catch (err) {
            console.error('Erro ao carregar alunos:', err);
            alert(`Erro ao carregar lista de alunos: ${err.message}`);
        }
    }
    // --- FIM DA FUNÇÃO DE CARREGAMENTO ---


    // ------ ABRIR E FECHAR OS MODAIS ------

    if (btnImportCsv) { // Verifica se o botão existe (boa prática)
        btnImportCsv.addEventListener('click', () => {
            modalCsv.style.display = 'flex';
        });
    }

    // Fecha os modais (botão x ou cancelar)
    document.querySelectorAll('.modal-close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Encontra o modal pai mais próximo e esconde ele
            e.target.closest('.modal-overlay').style.display = 'none';
        });
    });

    // ------ IMPORTAÇÃO CSV ------

    if (formsCsv && turmaId) {
        formsCsv.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fileInput = document.getElementById('csv-file');
            if (!fileInput.files || fileInput.files.length === 0) {
                alert('Opa, seleciona um arquivo antes.');
                return;
            }

            const formData = new FormData();
            formData.append('csvFile', fileInput.files[0]);

            const token = localStorage.getItem('token');
            const submitButton = formsCsv.querySelector('button[type="submit"]');
            submitButton.textContent = 'Importando...';
            submitButton.disabled = true;

            try {
                // Manda o arquivo para o servidor
                const response = await fetch(`/api/turmas/${turmaId}/alunos/import-csv`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message);
                    window.location.reload(); // Recarrega a página pra ver os alunos novos
                } else {
                    alert(` Deu erro: ${result.error}`);
                }
            } catch (err) {
                console.error('Erro no fetch:', err);
                alert('Erro de comunicação ao importar.');
            } finally {
                submitButton.textContent = 'Importar Arquivo';
                submitButton.disabled = false;
            }
        });
    }
    // ------- ADICIONAR E EDITAR ALUNO -------

    // Campos e botões do formulário de aluno
    const modalAlunoTitle = document.getElementById('modal-aluno-title');
    const hiddenAlunoId = document.getElementById('aluno-id-hidden');
    const matriculaInput = document.getElementById('aluno-matricula');
    const nomeInput = document.getElementById('aluno-nome');
    const submitBtnAluno = document.getElementById('modal-aluno-submit-btn');

    // Prepara o modal para criar um aluno
    function abrirModalParaCriar(){
        modalAlunoTitle.textContent = 'Adicionar Novo Aluno';
        submitBtnAluno.textContent = 'Salvar Aluno';
        hiddenAlunoId.value = ''; // Limpa o ID para saber que é uma criação
        if(formAluno) formAluno.reset();
        modalAluno.style.display = 'flex';
        matriculaInput.focus();
    }

    // Prepara o modal para editar um aluno
    function abrirModalParaEditar(id, matricula, nome) {
        modalAlunoTitle.textContent = 'Editar Aluno';
        submitBtnAluno.textContent = 'Atualizar Aluno';
        hiddenAlunoId.value = id // Coloca o ID do aluno que está sendo editado
        matriculaInput.value = matricula; // Preenche a matrícula
        nomeInput.value = nome; // Preenche o nome
        modalAluno.style.display = 'flex';
        matriculaInput.focus();
    }
    
    if(btnAddAluno) btnAddAluno.addEventListener('click', abrirModalParaCriar);

    // --- LÓGICA DE SELEÇÃO E REMOÇÃO MÚLTIPLA ---
    
    // Verifica quantos alunos estão selecionados e atualiza o botão de remoção
    function updateBatchDeleteButton() {
        if (!tabelaBody || !btnRemoveSelecionados) return;
        
        const checkboxes = tabelaBody.querySelectorAll('input[name="alunoSelecionado"]:checked');
        btnRemoveSelecionados.disabled = checkboxes.length === 0;
        btnRemoveSelecionados.textContent = `Remover Selecionados (${checkboxes.length})`;
        
        // Se todos estiverem marcados, marca o "Selecionar Todos"
        if (selectAllCheckbox) {
            const allCheckboxes = tabelaBody.querySelectorAll('input[name="alunoSelecionado"]');
            const allChecked = allCheckboxes.length > 0 && checkboxes.length === allCheckboxes.length;
            if(selectAllCheckbox.checked !== allChecked) {
                 selectAllCheckbox.checked = allChecked; 
            }
        }
    }
    
    // Ao clicar no "Selecionar Todos"
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            const isChecked = selectAllCheckbox.checked;
            if(tabelaBody) {
                tabelaBody.querySelectorAll('input[name="alunoSelecionado"]').forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
            }
            updateBatchDeleteButton();
        });
    }

    // Ao clicar em qualquer checkbox individualmente
    if (tabelaBody) {
        tabelaBody.addEventListener('change', (e) => {
            if (e.target.name === 'alunoSelecionado') {
                updateBatchDeleteButton();
            }
        });
        
         // Chama a função uma vez no início pra acertar o estado do botão
         updateBatchDeleteButton(); 
    }

    // Lógica para remover múltiplos alunos de uma vez
    if (btnRemoveSelecionados) {
        btnRemoveSelecionados.addEventListener('click', async () => {
            if (!tabelaBody) return;
            
            const checkboxes = tabelaBody.querySelectorAll('input[name="alunoSelecionado"]:checked');
            const ids = Array.from(checkboxes).map(cb => cb.value);
            const token = localStorage.getItem('token');

            if (ids.length === 0) {
                alert('Nenhum aluno foi selecionado.');
                return;
            }

            const confirmacao = window.confirm(`Certeza que quer remover ${ids.length} aluno(s)? Essa ação não tem volta.`);

            if (!confirmacao) return;

            btnRemoveSelecionados.textContent = 'Removendo...';
            btnRemoveSelecionados.disabled = true;
            

            try {
                // Chama a API de exclusão em lote
                const response = await fetch('/api/alunos/batch', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ ids })
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message);
                    window.location.reload(); // Recarrega a página para sumir com os alunos removidos
                } else {
                    alert(`Erro na remoção: ${result.error || 'Não foi possível remover. Cheque se não tem notas associadas.'}`);
                }
            } catch (err) {
                console.error('Erro de comunicação:', err);
                alert('Falha ao falar com o servidor para remover os alunos.');
            } finally {
                btnRemoveSelecionados.disabled = false;
                updateBatchDeleteButton(); 
            }
        });
    }

    // Lida com o clique nos botões "Editar" na tabela (usa delegação)
    if (tabelaBody) {
        tabelaBody.addEventListener('click', (e) => {
            const editButton = e.target.closest('.btn-edit');
            if (!editButton) return;

            e.preventDefault();

            const tr = editButton.closest('tr');
            // Pega os dados da linha para preencher o modal
            const id = tr.querySelector('.btn-excluir')?.dataset.id;
            const matricula = tr.querySelector('[data-field="matricula"]')?.textContent;
            const nome = tr.querySelector('[data-field="nome"]')?.textContent;

            if (id && matricula && nome) {
                abrirModalParaEditar(id, matricula.trim(), nome.trim());
            } else {
                alert('Erro: Não foi possível carregar os dados para edição.');
            }
        });
    }

    // Lida com o envio do formulário (Criar ou Editar aluno)
    if (formAluno) {
        formAluno.addEventListener('submit', async(e) => {
            e.preventDefault();

            const id = hiddenAlunoId.value;
            const matricula = matriculaInput.value.trim();
            const nome = nomeInput.value.trim();
            const token = localStorage.getItem('token'); 

            if(!matricula || !nome) {
                alert('Matrícula e Nome são obrigatórios.');
                return;
            }

            const isEditMode = id !== '';
            // Decide se é PUT (editar) ou POST (criar)
            const url = isEditMode ? `/api/alunos/${id}` : '/api/alunos';
            const method = isEditMode ? 'PUT' : 'POST';

            const body = {
                matricula: matricula,
                nome: nome,
                turma_id: turmaId 
            };

            submitBtnAluno.disabled = true;
            submitBtnAluno.textContent = isEditMode ? 'Atualizando...' : 'Salvando...';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(body)
                });

                const result = await response.json();

                if (response.ok) {
                    alert(isEditMode ? 'Aluno atualizado!' : 'Aluno criado!');
                    modalAluno.style.display = 'none';
                    formAluno.reset();
                    window.location.reload(); // Recarrega para mostrar os dados novos
                } else {
                    // Trata o erro de matrícula duplicada (status 409)
                    if(response.status === 409) {
                        alert(`Erro: ${result.error}`);
                    } else {
                        alert(`Erro: ${result.error || 'Não foi possivel salvar o aluno.'}`);
                    }
                }
            } catch (err) {
                console.error('Erro ao salvar aluno', err);
                alert('Erro de comunicação com o servidor.');
            } finally {
                submitBtnAluno.disabled = false;
                submitBtnAluno.textContent = isEditMode ? 'Atualizar Aluno' : 'Salvar Aluno';
            }
        });
    }
    
    // Se tiver o ID da turma e a tabela existir, carrega os alunos quando a página abre
    if (turmaId && tabelaBody) {
        loadAlunos();
    }
});
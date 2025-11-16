document.addEventListener('DOMContentLoaded', () =>{
    
    //referencia aos modais
    const modalAluno = document.getElementById('modal-aluno');
    const modalCsv = document.getElementById('modal-csv');

    //botões que abrem os modais
    const btnAddAluno = document.getElementById('add-aluno-btn');
    const btnImportCsv = document.getElementById('import-csv-btn');

    //formulários
    const formsCsv = document.getElementById('form-csv');
    const formAluno = document.getElementById('form-aluno') // depois da adição da logica de salvar alunos

    // ------ ABRIR E FECHAR OS MODAIS ------

    btnImportCsv.addEventListener('click', () => {
        modalCsv.style.display = 'flex';
    });

    // fechar modais (botão x ou cancelar)
    document.querySelectorAll('.modal-close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            //encontar o modal pai mais proximo e esconder ele
            e.target.closest('.modal-overlay').style.display = 'none';
        });
    });

    // ------ IMPORTAÇÃO CSV ------

    //pegar o ID da turma pela URL
    const urlParams = new URLSearchParams(window.location.search);
    const turmaId = urlParams.get('turma_id');
    
    if (!turmaId) {
        console.warn('ID da turma não encontrado na URL. A importação e adição não funcionarão');
        btnImportCsv.disabled = true;
        btnAddAluno.disabled = true;
    }

    formsCsv.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('csv-file');
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Por favor, selecione um arquivo.');
            return;
        }

        const formData = new FormData();
        formData.append('csvFile', fileInput.files[0]);

        const token = localStorage.getItem('token');
        const submitButton = formsCsv.querySelector('button[type="submit"]');
        submitButton.textContent = 'Importando...';
        submitButton.disabled = true;

        try {
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
                window.location.reload(); //recarregar a pagina para ver os novos alunos
            } else {
                alert(` Erro: ${result.error}`);
            }
        } catch (err) {
            console.error('Erro no fetch:', err);
            alert('Erro de comunicação ao importar.');
        } finally {
            submitButton.textContent = 'Importar Arquivo';
            submitButton.disabled = false;
        }
    });
    // ------- ADICIONAR E EDITAR ALUNO -------

    //Referenciais do formulario de aluno
    const modalAlunoTitle = document.getElementById('modal-aluno-title');
    const hiddenAlunoId = document.getElementById('aluno-id-hidden');
    const matriculaInput = document.getElementById('aluno-matricula');
    const nomeInput = document.getElementById('aluno-nome');
    const submitBtnAluno = document.getElementById('modal-aluno-submit-btn');

    //funcão para abrir o modal em modo "CRIAR"
    function abrirModalParaCriar(){
        modalAlunoTitle.textContent = 'Adicionar Novo Aluno';
        submitBtnAluno.textContent = 'Salvar Aluno';
        hiddenAlunoId.value = ''; // garante que o id está limpo
        formAluno.reset();
        modalAluno.style.display = 'flex';
        matriculaInput.focus();
    }

    // Funçãoi para abrir o modal em modo "EDITAR"
    function abrirModalParaEditar(id, matricula, nome) {
        modalAlunoTitle.textContent = 'Editar Aluno';
        submitBtnAluno.textContent = 'Atualizar Aluno';
        hiddenAlunoId.value = id //definir ID 
        matriculaInput.value = matricula; //preencher os campos
        nomeInput.value = nome;
        modalAluno.style.display = 'flex';
        matriculaInput.focus();
    }
    
    btnAddAluno.addEventListener('click', abrirModalParaCriar);

    //Listener para o clique nos botões "Editar" na tabela 
    //(O 'tabelaBody' já foi pego na lógica de remoção múltipla)
    tabelaBody.addEventListener('click', (e) => {
        const editButton = e.target.closest('.btn-edit');
        if (!editButton) return;

        e.preventDefault();

        const tr = editButton.closest('tr');
        //pegar o ID do botão "Remover" na mesma linha
        const id = tr.querySelector('.btn-excluir')?.dataset.id;
        const matricula = tr.querySelector('[data-fiel="matricula"]')?.textContent;
        const nome = tr.querySelector('[data-fiel="nome"]')?.textContent;

        if (id && matricula && nome) {
            abrirModalParaCriar(id, matricula.trim(), nome.trim());
        } else {
            // tentar pegar op ID do checkbox se o botão excluir não estiver la
            const checkbox = tr.querySelector('input[nome="alunoSelecionado"]');
            if (checkbox && chackbox.value && matricula && nome) {
                abrirModalParaEditar(checkbox.value, matricula.trim(), nome.trim());
            } else {
                alert('Erro: Não foi possível carregar os dados para edição.');
            }
        }
    });

    //Listener para o SUBMIT do formalário (Criar ou Editar)
    //(O 'formAluno' foi pego no topo do seu arquivo)
    formAluno.addEventListener('submit', async(e) => {
        e.preventDefault();

        const id = hiddenAlunoId.value;
        const matricula = matriculaInput.value.trim();
        const nome = nomeInput.value.trim();

        if(!matricula || !nome) {
            alert('Matrícula e Nome são obrigatórios.');
            return;
        }

        const isEditMode = id !== '';
        const url = isEditMode ? 'PUT' : 'POST';

        const body = {
            matricula: matricula,
            nome: nome,
            turma_id: turmaId //  turmaId que pega no URL
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
                alert(isEditMode ? 'Aluno atualizado com sucesso!' : 'Aluno criado com sucesso!');
                modalAluno.style.display = 'none';
                formAluno.reset();
                window.location.reload(); // recarrega a pagina para mostrar os dados atualizados
            } else {
                //trata o erro de matrícula duplicada 
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
    })
});

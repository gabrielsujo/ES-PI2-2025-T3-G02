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
    //abrir modal de aluno
    btnAddAluno.addEventListener('click', () => {
        modalAluno.style.display = 'flex';
    });
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
    //adição de logica para a formula de alunos depois 
    // para criar ou editar aluno 
});

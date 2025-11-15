import { calcularNotaFinal } from '../src/utils/CalculoNotas.ts'; 

const STORAGE_KEY = 'disciplinaConfig'; 

// Simulação dos dados dos alunos.
const SIMULACAO_ALUNOS_NOTAS = [
    { 
        id: 100, 
        matricula: '100', 
        nome: 'Pessoa 1', 
        notas: [{ sigla: 'P1', valor: 10.00 }, { sigla: 'P2', valor: 8.50 }] 
    },
    { 
        id: 101, 
        matricula: '101', 
        nome: 'Pessoa 2', 
        notas: [{ sigla: 'P1', valor: 5.00 }, { sigla: 'P2', valor: 7.00 }] 
    },
    { 
        id: 102, 
        matricula: '102', 
        nome: 'Pessoa 3', 
        notas: [{ sigla: 'P1', valor: null }, { sigla: 'P2', valor: null }] // Notas pendentes
    },
];


const dynamicEditButtonsContainer = document.getElementById('dynamic-edit-buttons');
const notasTableHeaderRow = document.getElementById('notas-table-header-row');
const notasTableBody = document.getElementById('notas-tabela-body');
const activeEditButtons = document.querySelector('.active-edit-buttons');
const editingComponentLabel = document.getElementById('editing-component-label');


let CONFIG_DISCIPLINA = null;
let ESTADO_EDICAO_ATIVO = false;
let COMPONENTE_EDITANDO = null;


// Inicia carregando a config salva e desenhando a tabela.
function loadConfigAndRender() {
    const savedConfig = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!savedConfig || savedConfig.siglasComponentes.length === 0) {
        alert('Erro: Nenhuma configuração encontrada. Configure primeiro.');
        return;
    }
    
    CONFIG_DISCIPLINA = savedConfig;
    
    renderEditButtons(CONFIG_DISCIPLINA.siglasComponentes);
    renderTable(CONFIG_DISCIPLINA.siglasComponentes, CONFIG_DISCIPLINA.formula);
}


// Cria os botões para editar cada componente (P1, P2...).
function renderEditButtons(siglas) {
    dynamicEditButtonsContainer.innerHTML = '';
    siglas.forEach(sigla => {
        const button = document.createElement('button');
        button.className = 'btn-secondary-small btn-edit-component';
        button.dataset.componente = sigla;
        button.textContent = sigla;
        button.addEventListener('click', () => toggleEditMode(sigla));
        dynamicEditButtonsContainer.appendChild(button);
    });
}

// Desenha a tabela com os cabeçalhos de notas e preenche as células.
function renderTable(siglas, formula) {
    const notaFinalHeader = notasTableHeaderRow.querySelector('.col-nota-final');

    // Remove e recria as colunas no cabeçalho.
    notasTableHeaderRow.querySelectorAll('.component-header').forEach(th => th.remove());
    siglas.forEach(sigla => {
        const th = document.createElement('th');
        th.className = 'col-nota component-header';
        th.dataset.componente = sigla;
        th.textContent = sigla;
        notasTableHeaderRow.insertBefore(th, notaFinalHeader);
    });

    // Preenche as células para cada aluno.
    SIMULACAO_ALUNOS_NOTAS.forEach(alunoData => {
        const linha = notasTableBody.querySelector(`tr[data-aluno-id="${alunoData.id}"]`);
        
        if (linha) {
            linha.querySelectorAll('.cell-nota').forEach(cell => cell.remove());
            const notaFinalCell = linha.querySelector('.cell-nota-final');

            siglas.forEach(sigla => {
                const notaAluno = alunoData.notas.find(n => n.sigla === sigla) || { valor: null };
                
                const td = document.createElement('td');
                td.className = 'cell-nota';
                td.dataset.componente = sigla;
                
                // O <span> para visualização, o <input> para edição.
                const span = document.createElement('span');
                span.textContent = formatNote(notaAluno.valor);
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '0';
                input.max = '10';
                input.step = '0.01';
                input.value = notaAluno.valor !== null ? notaAluno.valor.toFixed(2) : '';
                input.style.display = 'none'; 

                td.appendChild(span);
                td.appendChild(input);
                linha.insertBefore(td, notaFinalCell);
            });

            calculateAndDisplayFinalNote(alunoData, formula);
        }
    });
}

// Calcula a nota final usando o módulo e atualiza a célula do aluno.
function calculateAndDisplayFinalNote(alunoData, formula) {
    const notasComponentes = alunoData.notas.map(n => ({ sigla: n.sigla, valor: n.valor }));
    const notaFinalCalculada = calcularNotaFinal(formula, notasComponentes);
    
    const spanFinal = notasTableBody.querySelector(`tr[data-aluno-id="${alunoData.id}"] .cell-nota-final span`);
    
    if (spanFinal) {
        spanFinal.textContent = formatNote(notaFinalCalculada);
        // Destaco se o cálculo estiver pendente (nota null).
        spanFinal.closest('td').style.backgroundColor = (notaFinalCalculada === null) ? '#FEF3C7' : 'initial';
    }
}

// Formata a nota para 2 casas ou retorna '-'.
function formatNote(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '-';
    }
    return parseFloat(value).toFixed(2);
}


// Liga/desliga o modo de edição para o componente selecionado.
function toggleEditMode(componente) {
    if (ESTADO_EDICAO_ATIVO && COMPONENTE_EDITANDO === componente) {
        cancelEditMode(); 
        return;
    }

    cancelEditMode(); 

    ESTADO_EDICAO_ATIVO = true;
    COMPONENTE_EDITANDO = componente;

    // Ajusta a interface.
    editingComponentLabel.querySelector('strong').textContent = componente;
    activeEditButtons.style.display = 'flex';
    dynamicEditButtonsContainer.style.display = 'none';

    // Troca <span> por <input> nas células do componente.
    const cellsToEdit = document.querySelectorAll(`.cell-nota[data-componente="${componente}"]`);
    cellsToEdit.forEach(cell => {
        cell.querySelector('span').style.display = 'none';
        cell.querySelector('input').style.display = 'block';
    });
    
    cellsToEdit[0]?.querySelector('input').focus();
}

// Desliga o modo de edição.
function cancelEditMode() {
    // Volta a mostrar o <span> e esconde o <input>.
    document.querySelectorAll('.cell-nota input[type="number"]').forEach(input => {
        input.style.display = 'none';
        // O span é o elemento anterior ao input
        input.previousElementSibling.style.display = 'inline-block'; 
    });

    ESTADO_EDICAO_ATIVO = false;
    COMPONENTE_EDITANDO = null;

    // Volta a mostrar os botões de edição de componentes.
    activeEditButtons.style.display = 'none';
    dynamicEditButtonsContainer.style.display = 'flex';
}

// Salva as notas digitadas.
function saveNotes() {
    if (!COMPONENTE_EDITANDO || !CONFIG_DISCIPLINA) return;
    
    let notasProcessadas = 0;
    const cellsToSave = document.querySelectorAll(`.cell-nota[data-componente="${COMPONENTE_EDITANDO}"]`);
    
    cellsToSave.forEach(cell => {
        const input = cell.querySelector('input');
        const span = cell.querySelector('span');
        const alunoId = cell.closest('tr').dataset.alunoId;

        const novoValor = input.value !== '' ? parseFloat(input.value) : null;
        let valorParaSalvar = null;

        if (novoValor !== null) {
            // Valida se a nota é válida (entre 0 e 10).
            if (isNaN(novoValor) || novoValor < 0 || novoValor > 10) return; 
            valorParaSalvar = novoValor;
        }

        // Atualiza os dados simulados.
        const alunoData = SIMULACAO_ALUNOS_NOTAS.find(a => a.id.toString() === alunoId);
        if (alunoData) {
            let nota = alunoData.notas.find(n => n.sigla === COMPONENTE_EDITANDO);
            if (nota) nota.valor = valorParaSalvar;
            else alunoData.notas.push({ sigla: COMPONENTE_EDITANDO, valor: valorParaSalvar });
            
            // Atualiza a tela e recalcula.
            span.textContent = formatNote(valorParaSalvar);
            input.value = valorParaSalvar !== null ? valorParaSalvar.toFixed(2) : '';
            calculateAndDisplayFinalNote(alunoData, CONFIG_DISCIPLINA.formula);
            notasProcessadas++;
        }
    });

    alert(`Notas de ${COMPONENTE_EDITANDO} salvas. ${notasProcessadas} notas atualizadas.`);
    cancelEditMode(); 
}


// Inicia tudo.
document.addEventListener('DOMContentLoaded', loadConfigAndRender);

// Botões de controle.
document.getElementById('save-notes-btn').addEventListener('click', saveNotes);
document.getElementById('cancel-edit-btn').addEventListener('click', cancelEditMode);

// Pressionar ENTER salva.
notasTableBody.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && ESTADO_EDICAO_ATIVO) {
        event.preventDefault(); 
        saveNotes();
    }
});

// Clicar na célula coloca o foco no campo de input.
notasTableBody.addEventListener('click', (event) => {
    const cell = event.target.closest('.cell-nota');
    if (cell && ESTADO_EDICAO_ATIVO && cell.dataset.componente === COMPONENTE_EDITANDO) {
        const input = cell.querySelector('input');
        if (input && input.style.display === 'block') {
            input.focus();
        }
    }
});

import { calcularNotaFinal } from './calculo_front.js';

let CONFIG_DISCIPLINA = null;
let ESTADO_EDICAO_ATIVO = false;
let COMPONENTE_EDITANDO = null;
let COMPONENTES_MAP = new Map();
let ALUNOS_NOTAS_REAIS = [];

const dynamicEditButtonsContainer = document.getElementById('dynamic-edit-buttons');
const notasTableHeaderRow = document.getElementById('notas-table-header-row');
const notasTableBody = document.getElementById('notas-tabela-body');
const activeEditButtons = document.querySelector('.active-edit-buttons');
const editingComponentLabel = document.getElementById('editing-component-label');
const btnExportCsv = document.getElementById('export-csv-btn');
const breadcrumbDisciplinas = document.getElementById('breadcrumb-disciplinas');

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        turmaId: params.get('turma_id'),
        disciplinaId: params.get('disciplina_id'),
        instituicaoId: params.get('instituicao_id')
    };
}


function mergeStudentNotes(alunos, notas, siglas) {
    const notasPorAluno = new Map();
    notas.forEach(nota => {
        if (!notasPorAluno.has(nota.aluno_id)) {
            notasPorAluno.set(nota.aluno_id, []);
        }
        let sigla;
        for (const [s, id] of COMPONENTES_MAP.entries()) {
            if (id === nota.componente_id) {
                sigla = s;
                break;
            }
        }
        if (sigla) {
            notasPorAluno.get(nota.aluno_id).push({ sigla, valor: nota.valor });
        }
    });

    return alunos.map(aluno => {
        const alunoNotas = notasPorAluno.get(aluno.id) || [];
        
        const notasCompletas = siglas.map(sigla => {
            const notaExistente = alunoNotas.find(n => n.sigla === sigla);
            const valor = (notaExistente && notaExistente.valor !== null) ? parseFloat(notaExistente.valor) : null;
            return { sigla, valor };
        });
        
        return {
            id: aluno.id,
            matricula: aluno.matricula,
            nome: aluno.nome,
            notas: notasCompletas
        };
    });
}

async function loadConfigAndRender() {
    const params = getUrlParams();
    const { turmaId, disciplinaId, instituicaoId } = params;
    const token = localStorage.getItem('token');
    
    if (breadcrumbDisciplinas && instituicaoId) {
        breadcrumbDisciplinas.href = `./disciplinas.html?instituicao_id=${instituicaoId}`;
    } else if (breadcrumbDisciplinas) {
        breadcrumbDisciplinas.href = './dashboard.html';
    }
    
    if (!disciplinaId || !turmaId || !token) {
        alert('Erro de navegação: IDs da turma/disciplina ou token de acesso faltando. Verifique o URL.');
        return;
    }

    try {
        const compResponse = await fetch(`/api/disciplinas/${disciplinaId}/componentes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!compResponse.ok) {
            const errorData = await compResponse.json();
            alert(`Erro (Componentes): ${errorData.error || compResponse.statusText}. Por favor, configure os componentes da disciplina.`);
            return;
        }

        const { componentes, formula } = await compResponse.json();
        const siglasComponentes = componentes.map(c => c.sigla);
            
        CONFIG_DISCIPLINA = {
            siglasComponentes: siglasComponentes,
            formula: formula || '',
        };

        componentes.forEach(c => {
            COMPONENTES_MAP.set(c.sigla, c.id);
        });
        
        const [alunosResponse, notasResponse] = await Promise.all([
            fetch(`/api/turmas/${turmaId}/alunos`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`/api/turmas/${turmaId}/notas`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (!alunosResponse.ok || !notasResponse.ok) {
             alert('Erro ao carregar alunos e/ou notas. Verifique a autorização.');
             return;
        }

        const alunos = await alunosResponse.json();
        const notas = await notasResponse.json();
        
        ALUNOS_NOTAS_REAIS = mergeStudentNotes(alunos, notas, CONFIG_DISCIPLINA.siglasComponentes);
        
        renderEditButtons(CONFIG_DISCIPLINA.siglasComponentes);
        renderTable(CONFIG_DISCIPLINA.siglasComponentes, CONFIG_DISCIPLINA.formula);

    } catch (error) {
        console.error('Erro geral no carregamento:', error);
        alert('Erro ao carregar os dados da turma.');
    }
}


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

function renderTable(siglas, formula) {
    const notaFinalHeader = notasTableHeaderRow.querySelector('.col-nota-final');

    notasTableHeaderRow.querySelectorAll('.component-header').forEach(th => th.remove());
    siglas.forEach(sigla => {
        const th = document.createElement('th');
        th.className = 'col-nota component-header';
        th.dataset.componente = sigla;
        th.textContent = sigla;
        notasTableHeaderRow.insertBefore(th, notaFinalHeader);
    });

    notasTableBody.innerHTML = ''; 
    
    if (ALUNOS_NOTAS_REAIS.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${siglas.length + 3}" style="text-align: center; color: var(--text-secondary); padding: 2rem;">Nenhum aluno cadastrado nesta turma.</td>`;
        notasTableBody.appendChild(tr);
        return;
    }

    ALUNOS_NOTAS_REAIS.forEach(alunoData => {
        const linha = document.createElement('tr');
        linha.dataset.alunoId = alunoData.id;
        linha.innerHTML = `
            <td>${alunoData.matricula}</td>
            <td>${alunoData.nome}</td>
        `;
        
        const notaFinalCell = document.createElement('td');
        notaFinalCell.className = 'cell-nota-final';
        notaFinalCell.innerHTML = `<span data-aluno-id="${alunoData.id}">-</span>`;

        siglas.forEach(sigla => {
            const notaAluno = alunoData.notas.find(n => n.sigla === sigla) || { valor: null };
            
            const td = document.createElement('td');
            td.className = 'cell-nota';
            td.dataset.componente = sigla;
            
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
            linha.appendChild(td);
        });
        
        linha.appendChild(notaFinalCell);
        notasTableBody.appendChild(linha);
        
        calculateAndDisplayFinalNote(alunoData, formula);
    });
}

function calculateAndDisplayFinalNote(alunoData, formula) {
    const notasComponentes = alunoData.notas.map(n => ({ sigla: n.sigla, valor: n.valor }));
    const notaFinalCalculada = calcularNotaFinal(formula, notasComponentes);
    
    const spanFinal = notasTableBody.querySelector(`tr[data-aluno-id="${alunoData.id}"] .cell-nota-final span`);
    
    if (spanFinal) {
        spanFinal.textContent = formatNote(notaFinalCalculada);
        spanFinal.closest('td').style.backgroundColor = (notaFinalCalculada === null) ? '#FEF3C7' : 'initial';
    }
}

function formatNote(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '-';
    }
    return parseFloat(value).toFixed(2);
}


function toggleEditMode(componente) {
    if (ESTADO_EDICAO_ATIVO && COMPONENTE_EDITANDO === componente) {
        cancelEditMode(); 
        return;
    }

    cancelEditMode(); 

    ESTADO_EDICAO_ATIVO = true;
    COMPONENTE_EDITANDO = componente;

    editingComponentLabel.querySelector('strong').textContent = componente;
    activeEditButtons.classList.add('is-visible-flex'); 
    activeEditButtons.classList.remove('is-hidden');
    dynamicEditButtonsContainer.classList.add('is-hidden');
    dynamicEditButtonsContainer.classList.remove('is-visible-flex');

    const cellsToEdit = document.querySelectorAll(`.cell-nota[data-componente="${componente}"]`);
    cellsToEdit.forEach(cell => {
        cell.querySelector('span').style.display = 'none';
        cell.querySelector('input').style.display = 'block';
    });
    
    cellsToEdit[0]?.querySelector('input').focus();
}

function cancelEditMode() {
    document.querySelectorAll('.cell-nota input[type="number"]').forEach(input => {
        input.style.display = 'none';
        input.previousElementSibling.style.display = 'inline-block'; 
    });

    ESTADO_EDICAO_ATIVO = false;
    COMPONENTE_EDITANDO = null;

    activeEditButtons.classList.add('is-hidden'); 
    activeEditButtons.classList.remove('is-visible-flex');
    dynamicEditButtonsContainer.classList.add('is-visible-flex');
    dynamicEditButtonsContainer.classList.remove('is-hidden');
}


async function saveNotes() {
    if (!COMPONENTE_EDITANDO || !CONFIG_DISCIPLINA) return;
    
    const params = getUrlParams();
    const { turmaId } = params; 
    
    const componenteSigla = COMPONENTE_EDITANDO;
    const componenteId = COMPONENTES_MAP.get(componenteSigla); 
    
    if (componenteId === undefined || !turmaId) {
        alert(`Erro: ID da turma ou ID do componente (${componenteSigla}) não encontrado.`);
        cancelEditMode();
        return;
    }
    
    const notasParaEnviar = [];
    let notasProcessadas = 0;
    
    const cellsToSave = document.querySelectorAll(`.cell-nota[data-componente="${componenteSigla}"]`);
    
    cellsToSave.forEach(cell => {
        const input = cell.querySelector('input');
        const span = cell.querySelector('span');
        const alunoId = cell.closest('tr').dataset.alunoId;

        const novoValor = input.value !== '' ? parseFloat(input.value) : null;
        let valorParaSalvar = null;

        if (novoValor !== null) {
            if (isNaN(novoValor) || novoValor < 0 || novoValor > 10) return; 
            valorParaSalvar = novoValor;
        }

        const alunoData = ALUNOS_NOTAS_REAIS.find(a => a.id.toString() === alunoId);
        if (alunoData) {
            let nota = alunoData.notas.find(n => n.sigla === componenteSigla);
            if (nota) nota.valor = valorParaSalvar;
            else alunoData.notas.push({ sigla: componenteSigla, valor: valorParaSalvar });
            
            notasParaEnviar.push({
                aluno_id: parseInt(alunoId, 10), 
                componente_id: componenteId, 
                valor: valorParaSalvar
            });
            
            span.textContent = formatNote(valorParaSalvar);
            input.value = valorParaSalvar !== null ? valorParaSalvar.toFixed(2) : '';
            calculateAndDisplayFinalNote(alunoData, CONFIG_DISCIPLINA.formula);
            notasProcessadas++;
        }
    });

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/turmas/${turmaId}/notas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                turma_id: turmaId,
                notas: notasParaEnviar
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Notas de ${componenteSigla} salvas com sucesso! ${notasProcessadas} notas atualizadas.`);
        } else {
            alert(`Erro ao salvar notas na API: ${result.error || 'Erro desconhecido.'}`);
        }

    } catch (error) {
        console.error('Falha na comunicação com o servidor:', error);
        alert('Falha ao se conectar com o servidor para salvar as notas.');
    } finally {
        cancelEditMode(); 
    }
}

async function exportarCSV() {
    const params = getUrlParams();
    const { turmaId } = params;
    const token = localStorage.getItem('token');

    if (!turmaId || !token) {
        alert('Erro: ID da turma ou token não encontrado.');
        return;
    }

    btnExportCsv.textContent = 'A gerar...';
    btnExportCsv.disabled = true;

    try {
        const response = await fetch(`/api/turmas/${turmaId}/export-csv`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao gerar o CSV.');
        }

        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'notas.csv';
        if (contentDisposition) {
            let filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].trim().replace(/"/g, '');
            }
        }

        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (err) {
        console.error('Erro ao exportar CSV:', err);
        alert(`Não foi possível exportar: ${err.message}`);
    } finally {
        btnExportCsv.textContent = 'Exportar Notas (CSV)';
        btnExportCsv.disabled = false;
    }
}


document.addEventListener('DOMContentLoaded', loadConfigAndRender);

document.getElementById('save-notes-btn').addEventListener('click', saveNotes);
document.getElementById('cancel-edit-btn').addEventListener('click', cancelEditMode);
btnExportCsv.addEventListener('click', exportarCSV);

notasTableBody.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && ESTADO_EDICAO_ATIVO) {
        event.preventDefault(); 
        saveNotes();
    }
});

notasTableBody.addEventListener('click', (event) => {
    const cell = event.target.closest('.cell-nota');
    if (cell && ESTADO_EDICAO_ATIVO && cell.dataset.componente === COMPONENTE_EDITANDO) {
        const input = cell.querySelector('input');
        if (input && input.style.display === 'block') {
            input.focus();
        }
    }
});

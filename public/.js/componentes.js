import { generateFormula } from './GerarFormula.ts';

// --- ELEMENTOS DOM ---
const form = document.getElementById('form-formula-config');
const numProvasInput = document.getElementById('num-provas');
const tipoMediaSelect = document.getElementById('tipo-media');
const pesosArea = document.getElementById('pesos-area');
const pesosInputsContainer = document.getElementById('pesos-inputs-container');
const formulaDisplay = document.getElementById('formula-display');
const componentesDisplay = document.getElementById('componentes-ativos-display');


// A sigla básica para os componentes (P1, P2, P3...)
const SIGLA_BASE = 'P'; 
// Chave no localStorage para salvar a configuração
const STORAGE_KEY = 'disciplinaConfig'; 



// FUNÇÕES DE MANIPULAÇÃO DO DOM
  // Exibe ou oculta os campos de peso com base no tipo de média.
  // Se for 'ponderada', gera os inputs de peso necessários.
 
function handleTipoMediaChange() {
    const tipoMedia = tipoMediaSelect.value;
    const numProvas = parseInt(numProvasInput.value, 10);

    if (tipoMedia === 'ponderada') {
        pesosArea.style.display = 'block';
        generatePesosInputs(numProvas);
    } else {
        pesosArea.style.display = 'none';
        // Remove os inputs de peso existentes ao mudar para simples
        pesosInputsContainer.innerHTML = ''; 
    }
}


 // Gera dinamicamente os inputs de peso para cada componente (Px).
 
function generatePesosInputs(count) {
    pesosInputsContainer.innerHTML = ''; // Limpa os inputs anteriores

    const newInputs = [];
    for (let i = 1; i <= count; i++) {
        const sigla = `${SIGLA_BASE}${i}`;
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group input-peso';

        inputGroup.innerHTML = `
            <label for="peso-${sigla}">Peso para ${sigla}</label>
            <input 
                type="number" 
                id="peso-${sigla}" 
                name="peso-${sigla}" 
                min="1" 
                value="10" 
                required 
                class="input-peso-componente"
            >
        `;
        newInputs.push(inputGroup);
    }
    newInputs.forEach(input => pesosInputsContainer.appendChild(input));
}



// LÓGICA DE FORMULA E ARMAZENAMENTO

 // Calcula a fórmula e atualiza a interface.

function updateFormulaDisplay() {
    const numProvas = parseInt(numProvasInput.value, 10);
    const tipoMedia = tipoMediaSelect.value;
    
    // 1. Gera as siglas dos componentes (P1, P2, P3...)
    const siglas = Array.from({ length: numProvas }, (_, i) => `${SIGLA_BASE}${i + 1}`);

    // 2. Coleta os pesos, se for média ponderada
    let pesos = [];
    if (tipoMedia === 'ponderada') {
        // Coleta todos os inputs de peso criados dinamicamente
        const pesoElements = document.querySelectorAll('.input-peso-componente');
        pesos = Array.from(pesoElements).map(input => parseInt(input.value, 10) || 0);

        // Se o número de pesos não bater com o número de provas, recria os inputs
        if (pesos.length !== numProvas) {
             generatePesosInputs(numProvas);
             // Tenta coletar novamente com os novos inputs (se for a primeira vez)
             pesos = Array.from(document.querySelectorAll('.input-peso-componente')).map(input => parseInt(input.value, 10) || 0);
        }
    }

    try {
        // 3. Chama a função do seu GerarFormula.ts
        const formula = generateFormula(siglas, tipoMedia, pesos);

        // 4. Atualiza a interface
        formulaDisplay.textContent = formula || 'Nenhuma fórmula configurada.';
        componentesDisplay.textContent = siglas.join(', ') || 'Nenhum componente.';

    } catch (error) {
        // Trata erros da função generateFormula (ex: soma dos pesos <= 0)
        formulaDisplay.textContent = `Erro: ${error.message}`;
        console.error(error);
    }
}


 // Carrega a configuração salva ao iniciar a página.
 
function loadConfig() {
    const savedConfig = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (savedConfig) {
        numProvasInput.value = savedConfig.numProvas;
        tipoMediaSelect.value = savedConfig.tipoMedia;
        
        if (savedConfig.tipoMedia === 'ponderada') {
            generatePesosInputs(savedConfig.numProvas);
            
            // Popula os valores dos pesos salvos
            savedConfig.pesos.forEach((peso, index) => {
                const sigla = `${SIGLA_BASE}${index + 1}`;
                const input = document.getElementById(`peso-${sigla}`);
                if (input) {
                    input.value = peso;
                }
            });
            pesosArea.style.display = 'block';
        } else {
            pesosArea.style.display = 'none';
        }

        // Atualiza a exibição da fórmula
        updateFormulaDisplay();
    } else {
        // Se não houver config, inicializa com a configuração padrão do HTML (2 provas, simples)
        handleTipoMediaChange();
        updateFormulaDisplay();
    }
}


// Atualiza a fórmula ao alterar o número de provas ou o tipo de média
numProvasInput.addEventListener('input', () => {
    // Garante que o número de provas é no mínimo 1
    if (parseInt(numProvasInput.value, 10) < 1) {
        numProvasInput.value = 1;
    }
    // Reajusta os inputs de peso e a fórmula
    handleTipoMediaChange();
    updateFormulaDisplay();
});

tipoMediaSelect.addEventListener('change', () => {
    handleTipoMediaChange();
    updateFormulaDisplay();
});

// Atualiza a fórmula ao alterar qualquer input de peso 
pesosInputsContainer.addEventListener('input', (event) => {
    if (event.target.classList.contains('input-peso-componente')) {
        updateFormulaDisplay();
    }
});


// Listener principal para o formulário de configuração
form.addEventListener('submit', (event) => {
    event.preventDefault();

    const numProvas = parseInt(numProvasInput.value, 10);
    const tipoMedia = tipoMediaSelect.value;
    const siglas = Array.from({ length: numProvas }, (_, i) => `${SIGLA_BASE}${i + 1}`);

    let pesos = [];
    if (tipoMedia === 'ponderada') {
        const pesoElements = document.querySelectorAll('.input-peso-componente');
        // Converte NodeList para Array e mapeia os valores
        pesos = Array.from(pesoElements).map(input => parseInt(input.value, 10) || 0);

        const totalPesos = pesos.reduce((sum, current) => sum + current, 0);
        if (totalPesos <= 0) {
             alert('Erro: A soma dos pesos deve ser maior que zero para Média Ponderada.');
             return;
        }
    }
    
    // Chama a função GerarFormula para ter a fórmula final para salvar
    let formulaFinal;
    try {
        formulaFinal = generateFormula(siglas, tipoMedia, pesos);
    } catch (error) {
         alert('Erro ao gerar fórmula: ' + error.message);
         return;
    }


    // 5. SALVA A CONFIGURAÇÃO NO LOCAL STORAGE
    const configToSave = {
        numProvas: numProvas,
        tipoMedia: tipoMedia,
        siglasComponentes: siglas,
        pesos: pesos,
        formula: formulaFinal
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));

    alert('Configuração de fórmula e componentes salva com sucesso!');
    console.log('Configuração salva:', configToSave);
});


document.addEventListener('DOMContentLoaded', loadConfig);

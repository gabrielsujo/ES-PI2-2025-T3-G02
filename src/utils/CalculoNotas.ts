import { evaluate } from 'mathjs';

// Interface para garantir a tipagem dos dados de nota
export interface ComponenteNota {
    sigla: string; // Ex: "P1", "N1"
    valor: number | null; // A nota do aluno
}

// FUNÇÃO DE VALIDAÇÃO (Usada na rota PUT /disciplinas/:id/media)
// Verifica se todos os componentes cadastrados estão utilizados na fórmula.

export function validarComponentesNaFormula(formula: string, siglasComponentes: string[]): string[] {
    const siglasFaltando: string[] = [];
    const formulaUpper = formula.toUpperCase();

    for (const sigla of siglasComponentes) {
        const regex = new RegExp(`\\b${sigla.toUpperCase()}\\b`); 
        if (!regex.test(formulaUpper)) {
            siglasFaltando.push(sigla);
        }
    }
    return siglasFaltando;
}


// FUNÇÃO DE CÁLCULO (Usada na rota GET /turmas/:id/notas)
// Calcula a nota final de um aluno com base na fórmula da disciplina e nas notas lançadas.
 
export function calcularNotaFinal(formula: string, notasComponentes: ComponenteNota[]): number | null {
    if (!formula) {
        return null; 
    }

    const scope: { [key: string]: number } = {};

    // 1. Constrói o 'scope' (variáveis) para o mathjs 
    for (const componente of notasComponentes) {
        
        //  Se a nota for nula/indefinida, o cálculo é IMPOSSÍVEL/PENDENTE
        if (componente.valor === null || componente.valor === undefined || typeof componente.valor !== 'number' || !isFinite(componente.valor)) {
            // Retorna null (Cálculo Pendente), pois a nota é obrigatória e está faltando.
            return null; 
        }

        // Se a nota existe e é válida:
        // Limita a nota individual entre 0 e 10 antes de passá-la para o cálculo
        const valorLimitado = Math.max(0, Math.min(10, componente.valor));
        scope[componente.sigla.toUpperCase()] = valorLimitado;
    }
    
    try {
        // Avalia a expressão de forma segura
        let resultado = evaluate(formula, scope);

        if (typeof resultado === 'number' && isFinite(resultado)) {
            //  Nota Máxima de 10
            let notaFinal = Math.min(resultado, 10); 
            
            //  Arredonda para duas casas decimais
            return Math.round(notaFinal * 100) / 100;
        }

        return null; // Retorna null se a avaliação falhar 
    } catch (error) {
        // Captura erros de sintaxe matemática da fórmula
        console.error("Erro ao calcular nota final (Sintaxe inválida):", error);
        return null;
    }
}

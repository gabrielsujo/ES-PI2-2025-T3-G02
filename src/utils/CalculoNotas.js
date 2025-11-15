import { evaluate } from 'mathjs';

export function validarComponentesNaFormula(formula, siglasComponentes) {
    const siglasFaltando = [];
    // Garante que a fórmula está em letras maiúsculas para comparação
    const formulaUpper = formula.toUpperCase();

    for (const sigla of siglasComponentes) {
        // Cria uma expressão regular para procurar a sigla como uma palavra completa (\b)
        const regex = new RegExp(`\\b${sigla.toUpperCase()}\\b`); 
        if (!regex.test(formulaUpper)) {
            siglasFaltando.push(sigla);
        }
    }
    return siglasFaltando;
}


 // Calcula a nota final de um aluno usando a biblioteca Math.js.
 
export function calcularNotaFinal(formula, notasComponentes) {
    if (!formula) {
        return null; 
    }

    const scope = {};

    //  Constrói o 'scope' (variáveis) para o mathjs 
    for (const componente of notasComponentes) {
        
        //  Se a nota for inválida ou nula, o cálculo é IMPOSSÍVEL/PENDENTE
        if (componente.valor === null || componente.valor === undefined || typeof componente.valor !== 'number' || !isFinite(componente.valor)) {
            // Retorna null (Cálculo Pendente), pois uma nota obrigatória está faltando.
            return null; 
        }

        //  Limita a nota individual entre 0 e 10 antes de passá-la para o cálculo
        const valorLimitado = Math.max(0, Math.min(10, componente.valor));
        scope[componente.sigla.toUpperCase()] = valorLimitado;
    }
    
    try {
        // Avalia a expressão de forma segura
        let resultado = evaluate(formula, scope);

        if (typeof resultado === 'number' && isFinite(resultado)) {
            //  Nota Máxima de 10
            let notaFinal = Math.min(resultado, 10); 
            
            //  Arredonda para duas casas decimais
            return Math.round(notaFinal * 100) / 100;
        }

        return null; // Retorna null se a avaliação falhar 
    } catch (error) {
        // Captura erros de sintaxe matemática da fórmula
        console.error("Erro ao calcular nota final (Sintaxe inválida):", error);
        return null;
    }
}

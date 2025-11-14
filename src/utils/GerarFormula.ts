export function generateFormula(
    siglasComponentes: string[], 
    tipoMedia: 'simples' | 'ponderada', 
    pesos?: number[]
): string {
    if (siglasComponentes.length === 0) {
        return '';
    }

    if (tipoMedia === 'simples') {
        // Gera a expressão para média simples 
        const soma = siglasComponentes.join(' + ');
        const divisor = siglasComponentes.length;
        return `(${soma}) / ${divisor}`;
    } 
    
    if (tipoMedia === 'ponderada') {
        if (!pesos || pesos.length !== siglasComponentes.length) {
            throw new Error("Média ponderada requer um peso numérico para cada componente.");
        }

        // Soma total dos pesos
        const totalPesos = pesos.reduce((sum, current) => sum + current, 0);
        
        if (totalPesos <= 0) {
             throw new Error("A soma dos pesos deve ser maior que zero.");
        }

        // Gera a expressão ponderada
        const ponderada = siglasComponentes.map((sigla, index) => {
            // Normaliza o peso (Ex: 40/100 = 0.4)
            const pesoNormalizado = pesos[index] / totalPesos;
            // Arredonda o peso normalizado para evitar muitas casas decimais
            const pesoArredondado = Math.round(pesoNormalizado * 1000) / 1000; 

            // Ex: (P1 * 0.4)
            return `(${sigla} * ${pesoArredondado})`;
        }).join(' + ');

        return ponderada;
    }

    throw new Error("Tipo de média inválido.");
}

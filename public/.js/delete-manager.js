document.addEventListener('DOMContentLoaded', () => {
    // 1. Referências aos elementos do DOM
    const modalExclusao = document.getElementById('modal-confirmar-exclusao');
    const btnConfirmar = document.getElementById('btn-confirmar-exclusao-sim');
    const modalMsg = document.getElementById('modal-exclusao-msg');

    // Variável para armazenar o contexto da exclusão (ID, Tipo e Nome do item)
    let itemParaExcluir = null;

    

    function abrirModal(item) {
        // Define a mensagem dinâmica no corpo do modal
        const msg = `Tem certeza que deseja excluir a ${item.tipo} <strong>"${item.nome}"</strong>? Esta ação é irrevogável.`;
        modalMsg.innerHTML = msg;

        // Armazena o item para uso no clique de confirmação
        itemParaExcluir = item; 
        
        modalExclusao.style.display = 'flex'; 
    }

    function fecharModal() {
        modalExclusao.style.display = 'none';
        itemParaExcluir = null; 
    }

    // Mapeia o tipo de item para o endpoint correto da API
    function getApiRoute(tipo, id) {
        switch (tipo) {
            case 'instituicao':
                return `/api/instituicoes/${id}`;
            case 'disciplina':
                return `/api/disciplinas/${id}`;
            case 'turma':
                return `/api/turmas/${id}`;
            case 'aluno':
                return `/api/alunos/${id}`;
            default:
               
                throw new Error(`Tipo de exclusão inválido: ${tipo}`);
        }
    }
    
    // Função principal que executa a chamada DELETE na API
    async function executeDelete(item, isModalConfirm = false) {
        if (!item) return;

        // Se a confirmação veio do modal, desabilita o botão para feedback
        if (isModalConfirm) {
            btnConfirmar.disabled = true;
            btnConfirmar.textContent = 'Excluindo...';
        }

        try {
            const url = getApiRoute(item.tipo, item.id);
            const token = localStorage.getItem('token'); 

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                alert(`${item.tipo} excluída com sucesso!`);
                window.location.reload(); 
            } else {
                const errorData = await response.json();
                
                // Trata o erro de dependência do backend
                alert(`Não foi possível excluir. ${errorData.error || 'Verifique as regras de dependência (turmas, alunos, etc.).'}`);
            }
        } catch (error) {
            console.error('Erro de rede ou na API:', error);
            alert('Erro ao se comunicar com o servidor.');
        } finally {
            if (isModalConfirm) {
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = 'Sim, excluir';
                fecharModal();
            }
        }
    }

    

    // Handler principal para todos os botões de exclusão
    document.body.addEventListener('click', (e) => {
        // Usa .closest() para garantir que foi pego o botão principal.
        const targetButton = e.target.closest('.btn-excluir');

        if (targetButton) {
            e.preventDefault();

            const item = {
                id: targetButton.getAttribute('data-id'),
                nome: targetButton.getAttribute('data-nome'),
                tipo: targetButton.getAttribute('data-tipo'),
            };
            
            // LÓGICA DE FILTRO: SÓ ABRE O MODAL PARA 'turma'
            if (item.tipo === 'turma') {
                abrirModal(item);
            } else {
                // Para os outros tipos, usa uma confirmação simples
                const isConfirmed = window.confirm(`Tem certeza que deseja excluir a ${item.tipo} "${item.nome}"? Esta ação é irrevogável.`);
                
                if (isConfirmed) {
                    executeDelete(item);
                }
            }
        }
        
        // Handler para fechar o modal ('Cancelar')
        if (e.target.classList.contains('modal-close-btn') || e.target.classList.contains('btn-cancel')) {
            fecharModal();
        }
    });

    // Handler para o botão "Sim, excluir" (exclusão da TURMA)
    btnConfirmar.addEventListener('click', () => {
        if (itemParaExcluir && itemParaExcluir.tipo === 'turma') {
            executeDelete(itemParaExcluir, true); 
        } else {
            fecharModal();
        }
    });
});

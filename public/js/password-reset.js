document.addEventListener('DOMContentLoaded', () => {

    const formRecuperar = document.getElementById('recuperar-form');
    const formResetar = document.getElementById('reset-form');

    if (formRecuperar) {
        formRecuperar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const submitButton = formRecuperar.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';

            try {
                const response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('Solicitação recebida. Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.');
                    formRecuperar.reset();
                } else {
                     alert(`Erro: ${data.error || 'Não foi possível processar a solicitação.'}`);
                }

            } catch (err) {
                console.error('Erro de rede:', err);
                alert('Falha na comunicação com o servidor.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Enviar link';
            }
        });
    }

    if (formResetar) {
        const tokenInput = document.getElementById('reset-token');
        
        try {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');

            if (!token) {
                alert('Token de redefinição não encontrado. Por favor, solicite um novo link.');
                window.location.href = 'recuperar-senha.html';
                return;
            }
            tokenInput.value = token;

        } catch (err) {
             console.error("Erro ao ler token da URL");
        }


        formResetar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const token = tokenInput.value;
            const novaSenha = document.getElementById('nova-senha').value;
            const confirmarSenha = document.getElementById('confirmar-nova-senha').value;

            if (novaSenha !== confirmarSenha) {
                alert('As senhas não coincidem.');
                return;
            }

            if (!token) {
                alert('Erro: Token ausente.');
                return;
            }
            
            const submitButton = formResetar.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Salvando...';

            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token, novaSenha: novaSenha })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Senha redefinida com sucesso! Você será redirecionado para o login.');
                    window.location.href = 'login.html';
                } else {
                    alert(`Erro: ${data.error || 'Não foi possível redefinir a senha.'}`);
                }

            } catch (err) {
                console.error('Erro de rede:', err);
                alert('Falha na comunicação com o servidor.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Salvar Nova Senha';
            }
        });
    }
});
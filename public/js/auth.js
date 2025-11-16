
function registrarUsuario(event) {
    
    event.preventDefault(); 

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const telefone = document.getElementById('telefone').value;
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmar-senha').value; 
            
    if (senha !== confirmarSenha) {
        alert('As senhas digitadas não coincidem. Por favor, verifique.');
        return;
    }

    const dadosRegistro = {
        nome: nome,
        email: email,
        telefone: telefone,
        senha: senha
    };

    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosRegistro)
    })
    .then(response => {
        return response.json().then(data => ({ 
            ok: response.ok, 
            data: data 
        }));
    })
    .then(result => {
        if (result.ok) { 
            alert('Cadastro realizado com sucesso! Faça o login.');
            window.location.href = 'login.html'; 
        } else {
            alert(`Erro no cadastro: ${result.data.error || result.data.message}`);
        }
    })
    .catch(error => {
        console.error('Erro de comunicação:', error);
        alert('Falha na comunicação com o servidor. Tente novamente.');
    });
}


document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email, senha: senha })
                });

                const data = await response.json();

                if (response.ok) {
                    alert(data.message);
                    
                    localStorage.setItem('token', data.token); 
                    
                    window.location.href = 'dashboard.html'; 
                } else {
                    alert(`Erro no login: ${data.error}`);
                }

            } catch (err) {
                console.error('Erro de comunicação:', err);
                alert('Falha na comunicação com o servidor. Tente novamente.');
            }
        });
    }
});
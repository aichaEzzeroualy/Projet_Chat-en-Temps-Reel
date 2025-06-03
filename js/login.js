// Vérifie si on est sur la page login ou chat
if (document.getElementById('loginFormElement')) {
    // ----- Partie Login -----
    document.getElementById('loginFormElement').addEventListener('submit', function(event) {
        event.preventDefault();

        let isValid = true;
        const email = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const erremail = document.getElementById("erruser");
        const errpass = document.getElementById("errpass");
        const errServer = document.getElementById("ErreurServer");
        
        // Clear previous errors
        erremail.innerHTML = '';
        errpass.innerHTML = '';
        errServer.innerHTML = '';
        
        // Remove error class from form groups
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });

        // Email validation with improved error messages
        if(email === '') {
            erremail.innerHTML = '<i class="fas fa-exclamation-circle"></i> Email est requis';
            document.getElementById('loginUsername').parentElement.classList.add('error');
            isValid = false;
        } else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            erremail.innerHTML = '<i class="fas fa-exclamation-circle"></i> Veuillez entrer un email valide';
            document.getElementById('loginUsername').parentElement.classList.add('error');
            isValid = false;
        }

        // Password validation with improved error messages
        if(password === '') {
            errpass.innerHTML = '<i class="fas fa-exclamation-circle"></i> Mot de passe est requis';
            document.getElementById('loginPassword').parentElement.classList.add('error');
            isValid = false;
        } else if(password.length < 6) {
            errpass.innerHTML = '<i class="fas fa-exclamation-circle"></i> Le mot de passe doit contenir au moins 6 caractères';
            document.getElementById('loginPassword').parentElement.classList.add('error');
            isValid = false;
        }

        // Add subtle shake animation to invalid fields
        document.querySelectorAll('.form-group.error input').forEach(input => {
            input.style.animation = 'shake 0.5s';
            setTimeout(() => {
                input.style.animation = '';
            }, 500);
        });

        if (isValid) {
            // Show loading indicator
            const submitBtn = document.querySelector('.btn-auth');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
            submitBtn.disabled = true;
            
            fetch('http://localhost:8080/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success message before redirect
                    errServer.innerHTML = '<i class="fas fa-check-circle" style="color: #4cc9f0;"></i> <span style="color: #4cc9f0;">Connexion réussie! Redirection...</span>';
                    errServer.style.backgroundColor = 'rgba(76, 201, 240, 0.08)';
                    errServer.style.borderLeft = '3px solid #4cc9f0';
                    
                    sessionStorage.setItem('currentUser', data.username);
                    sessionStorage.setItem('userEmail', email);
                    
                    // Smooth transition to next page
                    setTimeout(() => {
                        document.body.style.opacity = '0';
                        setTimeout(() => {
                            window.location.href = 'chat.html';
                        }, 500);
                    }, 1000);
                } else {
                    // Reset button
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    
                    // Show error with icon
                    errServer.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + data.message;
                    errServer.style.backgroundColor = 'rgba(247, 37, 133, 0.08)';
                    errServer.style.borderLeft = '3px solid var(--danger-color)';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
                // Show network error
                errServer.innerHTML = '<i class="fas fa-wifi"></i> Erreur de connexion au serveur. Veuillez réessayer.';
            });
        }
    });
    
    // Add keyup validation for better UX
    document.getElementById('loginUsername').addEventListener('keyup', function() {
        const email = this.value;
        const erremail = document.getElementById("erruser");
        
        if(email !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            erremail.innerHTML = '';
            this.parentElement.classList.remove('error');
        }
    });
    
    document.getElementById('loginPassword').addEventListener('keyup', function() {
        const password = this.value;
        const errpass = document.getElementById("errpass");
        
        if(password !== '' && password.length >= 6) {
            errpass.innerHTML = '';
            this.parentElement.classList.remove('error');
        }
    });
}

// ----- Partie Chat -----
if (document.getElementById('messages')) {
    const socket = io('http://localhost:3000');

    const currentUser = sessionStorage.getItem('currentUser') || `Utilisateur-${Math.floor(Math.random() * 100)}`;
    socket.emit('identify', currentUser); // Optionnel selon serveur

    const messages = document.getElementById('messages');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('sendBtn');

    function addMessage(text) {
        const li = document.createElement('li');
        li.textContent = text;
        messages.appendChild(li);
    }

    socket.on('message', ({ username, text }) => {
        addMessage(`${username} : ${text}`);
    });

    socket.on('user-connected', username => {
        addMessage(`🔵 ${username} s'est connecté`);
    });

    socket.on('user-disconnected', username => {
        addMessage(`⚪️ ${username} s'est déconnecté`);
    });

    sendBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if (text !== '') {
            socket.emit('message', text);
            input.value = '';
        }
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}
`;
document.head.appendChild(style);

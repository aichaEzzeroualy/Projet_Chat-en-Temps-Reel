document.addEventListener("DOMContentLoaded", ()=>{
    const registerForm = document.getElementById('registerFormElement');
    const registerUsername = document.getElementById('registerUsername');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');
    const registerConfirmPassword = document.getElementById('registerConfirmPassword');
    const errUser = document.getElementById('erruser');
    const errEmail = document.getElementById('erremail');
    const errPass = document.getElementById('errpass');
    const errConfirmPass = document.getElementById('errconfipass');
    const errServer = document.getElementById('ErreurServer');

    registerForm.addEventListener("submit", (event)=>{
        let isValid = true;
        

        let username = registerUsername.value;
        let password = registerPassword.value;
        let confirmPassword = registerConfirmPassword.value;
        let email = registerEmail.value;
        let reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Clear the prevouis erreur 
        errUser.textContent = '';
        errEmail.textContent = '';
        errPass.textContent = '';
        errConfirmPass.textContent = '';
        errServer.textContent = '';

        // username validation
        if(username === ''){
            errUser.textContent = "le nom d'utilisateur est requis";
            isValid = false;
        }
        // email validation 
        if(email === ''){
            errEmail.textContent = "L'email est requis";
        }
        else if(reg.test(email) === false){
            errEmail.textContent = "L'email est incorrect";
            isValid = false;
        }
        // password and comfiramtion password validation
        if(password === ''){
            errPass.textContent = "mot de passe est requis";
            isValid = false;
        }
        else{
            // password lenght should be bigger then 6 character 
            if(password.length < 6){
                errPass.textContent = "Le mot de passe doit contenir au moins 6 caractères";
                isValid = false;
            }
        }
        // Confirm password validation
        if(confirmPassword !== password){
            errConfirmPass.textContent = "Les mots de passe ne correspondent pas";
            isValid = false;
        }

        if(isValid){
            event.preventDefault();
            fetch('http://localhost:8080/register',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password})    
            })
            .then(response => {
               return response.json();
            })
            .then(data => {
                if(data.success === true && data.type === 200){
                    // stay 500 ms then redirection to login page
                    let registerElement = document.getElementById("registerForm");
                    registerElement.innerHTML = '';
                    let succesElement = document.createElement("div");
                    succesElement.textContent = data.message;
                    succesElement.classList += "sucessElementEngister";
                    registerElement.append(succesElement);
                    setTimeout(()=>{
                        window.location.href = 'login.html';
                    }, 2000);
                }
                else{
                    if (data.type === 400 && data.success === false) {
                        errServer.textContent = data.message;
                        setTimeout(()=>{
                            window.location.reload();
                        }, 2000);
                    } else if (data.type === 500, data.success === false) {
                        errServer.textContent = data.message;
                        setTimeout(()=>{
                            window.location.reload();
                        }, 2000);
                    } else {
                        errServer.textContent = "Une erreur inattendue s'est produite.";
                    }
                }
            })
        }   
    });  
    
});
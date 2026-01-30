// Lógica principal de la aplicación bancaria

// Manejo del formulario de login
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Verificar que la función login esté disponible
        if (typeof login === 'undefined') {
            alert('Error del sistema: Función de login no disponible. Recargue la página.');
            console.error('❌ Función login no definida');
            return;
        }
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log('Intento de login:', { username, password });
        console.log('Función login disponible:', typeof login);
        console.log('hybridStorage disponible:', typeof hybridStorage);
        
        try {
            // Deshabilitar botón durante el proceso
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Verificando...';
            
            const loginResult = await login(username, password);
            console.log('Resultado del login:', loginResult);
            
            if (loginResult) {
                console.log('Login exitoso, redirigiendo...');
                submitButton.textContent = 'Redirigiendo...';
                // Redirigir según usuario
                if (username === 'admin' && password === 'admin00') {
                    window.location.href = 'dashboardadmin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } else {
                console.log('Login fallido');
                // Mostrar error
                showAlert('error', 'Credenciales incorrectas. Verifique su usuario y contraseña.');
                
                // Rehabilitar botón
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        } catch (error) {
            console.error('Error durante el login:', error);
            showAlert('error', 'Error de conexión. Intente nuevamente.');
            
            // Rehabilitar botón
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Iniciar Sesión';
        }
    });
}

// Función para mostrar alertas
function showAlert(type, message) {
    // Remover alertas existentes
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertClass = type === 'error' ? 'alert-danger' : 'alert-success';
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Insertar después del formulario de login si existe
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.insertAdjacentHTML('afterend', alertHtml);
    } else {
        // Insertar al principio del container si estamos en dashboard
        const container = document.querySelector('.container');
        if (container) {
            container.insertAdjacentHTML('afterbegin', alertHtml);
        }
    }
}

// Función para mostrar notificaciones tipo toast
function showNotification(title, message, type = 'info') {
    // Crear elemento de notificación
    const notificationHtml = `
        <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'primary'} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}</strong><br>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    // Crear contenedor de toasts si no existe
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Agregar toast y mostrarlo
    toastContainer.insertAdjacentHTML('beforeend', notificationHtml);
    const toastElement = toastContainer.lastElementChild;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Remover del DOM cuando se oculte
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Verificar si el usuario está logueado (solo para páginas que lo requieren)
if (window.location.pathname.includes('dashboard.html')) {
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
    }
}

// Prevenir acceso al login si ya está logueado
if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
    if (isLoggedIn()) {
        window.location.href = 'dashboard.html';
    }

}

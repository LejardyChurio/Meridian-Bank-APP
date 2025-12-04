/**
 * Password Recovery System - Meridian Bank
 * Manejo completo del sistema de recuperación de contraseñas
 */

class PasswordRecovery {
    constructor() {
        this.hybridStorage = new HybridStorage();
        this.initializeEventListeners();
    }

    /**
     * Inicializa los event listeners según la página actual
     */
    initializeEventListeners() {
        // Detectar la página actual y configurar eventos correspondientes
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'recuperar-password.html':
                this.initRecoveryForm();
                break;
            case 'nueva-password.html':
                this.initNewPasswordForm();
                break;
        }
    }

    /**
     * Inicializa el formulario de recuperación (recuperar-password.html)
     */
    initRecoveryForm() {
        const recoveryForm = document.getElementById('recoveryForm');
        const documentoInput = document.getElementById('documento');
        
        if (recoveryForm) {
            // Auto-formatear el campo documento
            this.setupDocumentFormatting(documentoInput);
            
            // Manejar envío del formulario
            recoveryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRecoverySubmit();
            });
        }
    }

    /**
     * Inicializa el formulario de nueva contraseña (nueva-password.html)
     */
    initNewPasswordForm() {
        const newPasswordForm = document.getElementById('newPasswordForm');
        
        if (newPasswordForm) {
            // Manejar envío del formulario
            newPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNewPasswordSubmit();
            });
        }
    }

    /**
     * Configura el formateo automático del documento
     */
    setupDocumentFormatting(input) {
        if (!input) return;

        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, ''); // Solo números
            
            if (value.length >= 2) {
                value = value.substring(0, 2) + '.' + value.substring(2);
            }
            if (value.length >= 6) {
                value = value.substring(0, 6) + '.' + value.substring(6, 9);
            }
            
            e.target.value = value;
        });
    }

    /**
     * Maneja el envío del formulario de recuperación
     */
    async handleRecoverySubmit() {
        const usuario = document.getElementById('usuario').value.trim();
        const documento = document.getElementById('documento').value.trim();
        const telefono = document.getElementById('telefono').value.trim();

        // Mostrar indicador de carga
        this.showLoading();
        this.hideMessages();

        try {
            // Verificar los datos del usuario
            const isValid = await this.verifyUserData(usuario, documento, telefono);
            
            if (isValid) {
                // Guardar el usuario verificado en sessionStorage para la siguiente página
                sessionStorage.setItem('password-recovery-user', usuario);
                
                this.showSuccess('Datos verificados correctamente. Redirigiendo...');
                
                // Redireccionar después de 2 segundos
                setTimeout(() => {
                    window.location.href = 'nueva-password.html';
                }, 2000);
            } else {
                this.showError('Los datos ingresados no coinciden con ningún usuario registrado.');
            }
        } catch (error) {
            console.error('Error en la verificación:', error);
            this.showError('Error al verificar los datos. Por favor intente nuevamente.');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Verifica los datos del usuario contra la base de datos
     */
    async verifyUserData(usuario, documento, telefono) {
        try {
            // Obtener todos los clientes
            const clientes = await this.hybridStorage.getAllClients();
            
            // Buscar usuario por email o usuario
            const usuarioEncontrado = clientes.find(cliente => {
                const emailMatch = cliente.email && cliente.email.toLowerCase() === usuario.toLowerCase();
                const userMatch = cliente.usuario && cliente.usuario.toLowerCase() === usuario.toLowerCase();
                return emailMatch || userMatch;
            });

            if (!usuarioEncontrado) {
                console.log('Usuario no encontrado:', usuario);
                return false;
            }

            // Verificar documento y teléfono (normalizar documento removiendo puntos y espacios)
            const documentoNormalizado = documento.replace(/[.\s-]/g, '');
            const documentoRegistradoNormalizado = usuarioEncontrado.documento.replace(/[.\s-]/g, '');
            const documentoMatch = documentoRegistradoNormalizado === documentoNormalizado;
            const telefonoMatch = usuarioEncontrado.telefono === telefono;

            console.log('Verificación de datos:', {
                usuario: usuario,
                documentoIngresado: documento,
                documentoNormalizado: documentoNormalizado,
                documentoRegistrado: usuarioEncontrado.documento,
                documentoRegistradoNormalizado: documentoRegistradoNormalizado,
                documentoMatch,
                telefonoIngresado: telefono,
                telefonoRegistrado: usuarioEncontrado.telefono,
                telefonoMatch
            });

            return documentoMatch && telefonoMatch;

        } catch (error) {
            console.error('Error al verificar datos del usuario:', error);
            throw error;
        }
    }

    /**
     * Maneja el envío del formulario de nueva contraseña
     */
    async handleNewPasswordSubmit() {
        const nuevaPassword = document.getElementById('nuevaPassword').value;
        const confirmarPassword = document.getElementById('confirmarPassword').value;
        const usuario = sessionStorage.getItem('password-recovery-user');

        // Validar que las contraseñas coincidan
        if (nuevaPassword !== confirmarPassword) {
            this.showError('Las contraseñas no coinciden.');
            return;
        }

        // Validar longitud mínima
        if (nuevaPassword.length < 6) {
            this.showError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        // Mostrar indicador de carga
        this.showLoading();
        this.hideMessages();

        try {
            // Actualizar la contraseña del usuario
            const success = await this.updateUserPassword(usuario, nuevaPassword);
            
            if (success) {
                this.showSuccess('Contraseña actualizada exitosamente. Redirigiendo al login...');
                
                // Limpiar sessionStorage
                sessionStorage.removeItem('password-recovery-user');
                
                // Redireccionar al login después de 3 segundos
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            } else {
                this.showError('Error al actualizar la contraseña. Por favor intente nuevamente.');
            }
        } catch (error) {
            console.error('Error al actualizar contraseña:', error);
            this.showError('Error al actualizar la contraseña. Por favor intente nuevamente.');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Actualiza la contraseña del usuario en la base de datos
     */
    async updateUserPassword(usuario, nuevaPassword) {
        try {
            // Obtener todos los clientes
            const clientes = await this.hybridStorage.getAllClients();
            
            // Buscar el usuario
            const clienteIndex = clientes.findIndex(cliente => {
                const emailMatch = cliente.email && cliente.email.toLowerCase() === usuario.toLowerCase();
                const userMatch = cliente.usuario && cliente.usuario.toLowerCase() === usuario.toLowerCase();
                return emailMatch || userMatch;
            });

            if (clienteIndex === -1) {
                console.error('Usuario no encontrado para actualizar contraseña:', usuario);
                return false;
            }

            // Actualizar la contraseña
            clientes[clienteIndex].password = nuevaPassword;

            // Guardar en localStorage
            localStorage.setItem('clientes', JSON.stringify(clientes));

            // Actualizar en Supabase
            if (this.hybridStorage.supabase) {
                const clienteActualizado = clientes[clienteIndex];
                const supabaseData = this.hybridStorage.convertToSupabaseFormat(clienteActualizado);
                
                const { error } = await this.hybridStorage.supabase
                    .from('clientes')
                    .update({ password: nuevaPassword })
                    .eq('email', clienteActualizado.email);

                if (error) {
                    console.error('Error al actualizar en Supabase:', error);
                    // Continuar aunque falle Supabase, localStorage ya tiene el dato actualizado
                }
            }

            console.log('Contraseña actualizada exitosamente para:', usuario);
            return true;

        } catch (error) {
            console.error('Error al actualizar contraseña del usuario:', error);
            return false;
        }
    }

    /**
     * Muestra el indicador de carga
     */
    showLoading() {
        const loading = document.getElementById('loadingIndicator');
        if (loading) loading.style.display = 'block';
    }

    /**
     * Oculta el indicador de carga
     */
    hideLoading() {
        const loading = document.getElementById('loadingIndicator');
        if (loading) loading.style.display = 'none';
    }

    /**
     * Muestra mensaje de error
     */
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    /**
     * Muestra mensaje de éxito
     */
    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        const successText = document.getElementById('successText');
        
        if (successDiv && successText) {
            successText.textContent = message;
            successDiv.style.display = 'block';
        }
    }

    /**
     * Oculta todos los mensajes
     */
    hideMessages() {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';
    }
}

// Inicializar el sistema cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si estamos en una página de recuperación de contraseña
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'recuperar-password.html' || currentPage === 'nueva-password.html') {
        window.passwordRecovery = new PasswordRecovery();
    }
});

// Exportar para uso en otros scripts si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PasswordRecovery;
}

/**
 * Generador de Números de Cuenta Bancarios Únicos
 * Formato: 0100 + 16 dígitos aleatorios = 20 dígitos totales
 * Ejemplo: 01001234567890123456
 */

class AccountNumberGenerator {
    static PREFIX = "0100";
    static TOTAL_LENGTH = 20;
    static RANDOM_LENGTH = AccountNumberGenerator.TOTAL_LENGTH - AccountNumberGenerator.PREFIX.length;
    static generatedAccounts = new Set(); // Cache para evitar duplicados en sesión

    /**
     * Genera un número de cuenta único de 20 dígitos
     * @returns {string} Número de cuenta único
     */
    static generateAccountNumber() {
        let accountNumber;
        let attempts = 0;
        const maxAttempts = 1000; // Prevenir bucle infinito

        do {
            const randomPart = this.generateRandomDigits(this.RANDOM_LENGTH);
            accountNumber = this.PREFIX + randomPart;
            attempts++;
            
            if (attempts >= maxAttempts) {
                throw new Error('No se pudo generar un número de cuenta único después de ' + maxAttempts + ' intentos');
            }
        } while (this.isAccountNumberExists(accountNumber));

        // Agregar al cache de cuentas generadas en esta sesión
        this.generatedAccounts.add(accountNumber);
        
        console.log(`✅ Número de cuenta generado: ${this.formatAccountNumber(accountNumber)} (Intento: ${attempts})`);
        return accountNumber;
    }

    /**
     * Genera dígitos aleatorios seguros
     * @param {number} length Cantidad de dígitos a generar
     * @returns {string} Dígitos aleatorios
     */
    static generateRandomDigits(length) {
        let result = '';
        for (let i = 0; i < length; i++) {
            // Usar crypto.getRandomValues para mayor seguridad si está disponible
            if (window.crypto && window.crypto.getRandomValues) {
                const array = new Uint8Array(1);
                window.crypto.getRandomValues(array);
                result += (array[0] % 10).toString();
            } else {
                // Fallback a Math.random
                result += Math.floor(Math.random() * 10).toString();
            }
        }
        return result;
    }

    /**
     * Verifica si el número de cuenta ya existe
     * @param {string} accountNumber Número de cuenta a verificar
     * @returns {boolean} True si existe, false si no
     */
    static isAccountNumberExists(accountNumber) {
        // Verificar en cache de sesión
        if (this.generatedAccounts.has(accountNumber)) {
            return true;
        }

        // Verificar en localStorage
        const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase')) || {};
        for (const client of Object.values(clientsDatabase)) {
            if (client.numeroCuenta === accountNumber || client.accountNumber === accountNumber) {
                this.generatedAccounts.add(accountNumber); // Agregar al cache
                return true;
            }
        }

        // Verificar en sistema híbrido si está disponible
        if (window.hybridStorage) {
            try {
                const allClients = hybridStorage.getAllClients() || {};
                for (const client of Object.values(allClients)) {
                    const clientAccountNumber = client.clientData?.account?.accountNumber;
                    if (clientAccountNumber === accountNumber) {
                        this.generatedAccounts.add(accountNumber); // Agregar al cache
                        return true;
                    }
                }
            } catch (error) {
                console.warn('Error verificando cuentas en sistema híbrido:', error);
            }
        }

        return false;
    }

    /**
     * Formatea el número de cuenta para visualización
     * @param {string} accountNumber Número de cuenta sin formato
     * @returns {string} Número de cuenta formateado
     */
    static formatAccountNumber(accountNumber) {
        if (!accountNumber || accountNumber.length !== this.TOTAL_LENGTH) {
            return accountNumber;
        }
        
        // Formato: 0100-1234-5678-9012-3456
        return accountNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4-$5');
    }

    /**
     * Valida el formato del número de cuenta
     * @param {string} accountNumber Número de cuenta a validar
     * @returns {boolean} True si es válido, false si no
     */
    static validateAccountNumber(accountNumber) {
        if (!accountNumber || typeof accountNumber !== 'string') {
            return false;
        }

        // Remover guiones y espacios para validación
        const cleanNumber = accountNumber.replace(/[-\s]/g, '');
        
        // Verificar longitud
        if (cleanNumber.length !== this.TOTAL_LENGTH) {
            return false;
        }

        // Verificar que solo contenga dígitos
        if (!/^\d+$/.test(cleanNumber)) {
            return false;
        }

        // Verificar prefijo
        if (!cleanNumber.startsWith(this.PREFIX)) {
            return false;
        }

        return true;
    }

    /**
     * Migra cuentas existentes al nuevo formato (para uso administrativo)
     * @returns {Object} Resultado de la migración
     */
    static migrateExistingAccounts() {
        const results = {
            migrated: 0,
            errors: 0,
            details: []
        };

        try {
            const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase')) || {};
            
            for (const [clientId, client] of Object.entries(clientsDatabase)) {
                try {
                    // Si la cuenta no tiene el formato nuevo, migrarla
                    if (!this.validateAccountNumber(client.numeroCuenta)) {
                        const oldAccountNumber = client.numeroCuenta;
                        const newAccountNumber = this.generateAccountNumber();
                        
                        client.numeroCuenta = newAccountNumber;
                        client.accountNumber = newAccountNumber; // Agregar campo adicional
                        
                        results.migrated++;
                        results.details.push({
                            clientId,
                            oldAccount: oldAccountNumber,
                            newAccount: newAccountNumber,
                            status: 'success'
                        });

                        console.log(`✅ Cuenta migrada: ${oldAccountNumber} → ${this.formatAccountNumber(newAccountNumber)}`);
                    } else {
                        results.details.push({
                            clientId,
                            account: client.numeroCuenta,
                            status: 'already_valid'
                        });
                    }
                } catch (error) {
                    results.errors++;
                    results.details.push({
                        clientId,
                        error: error.message,
                        status: 'error'
                    });
                }
            }

            // Guardar cambios
            localStorage.setItem('clientsDatabase', JSON.stringify(clientsDatabase));
            
        } catch (error) {
            results.errors++;
            results.details.push({
                error: 'Error general de migración: ' + error.message,
                status: 'critical_error'
            });
        }

        return results;
    }

    /**
     * Obtiene estadísticas de las cuentas generadas
     * @returns {Object} Estadísticas
     */
    static getAccountStatistics() {
        const stats = {
            totalGenerated: this.generatedAccounts.size,
            generatedInSession: Array.from(this.generatedAccounts),
            totalInDatabase: 0,
            validAccounts: 0,
            invalidAccounts: 0
        };

        try {
            const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase')) || {};
            stats.totalInDatabase = Object.keys(clientsDatabase).length;
            
            for (const client of Object.values(clientsDatabase)) {
                if (this.validateAccountNumber(client.numeroCuenta)) {
                    stats.validAccounts++;
                } else {
                    stats.invalidAccounts++;
                }
            }
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
        }

        return stats;
    }
}

// Exponer la clase globalmente
window.AccountNumberGenerator = AccountNumberGenerator;

// Función de conveniencia para generar número de cuenta
window.generateBankAccount = () => AccountNumberGenerator.generateAccountNumber();

// Función de conveniencia para formatear número de cuenta
window.formatBankAccount = (accountNumber) => AccountNumberGenerator.formatAccountNumber(accountNumber);

console.log('🏦 Generador de Números de Cuenta Bancarios iniciado');
console.log('📋 Formato: 0100 + 16 dígitos aleatorios = 20 dígitos totales');
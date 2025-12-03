// ===================================================
// SISTEMA HÍBRIDO: localStorage + Supabase
// Integración con auth.js existente de Meridian Banco
// ===================================================

// Configuración Supabase
const SUPABASE_URL = 'https://kvbgtjbxycqaqcymbdyk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cj6W2dC47fry7sjzlFHjVg_7GQGlEFi';

// Cliente Supabase usando fetch (sin librerías externas)
class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.headers = {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        };
    }

    // Obtener datos de una tabla
    async select(table, query = '*', filters = {}) {
        try {
            let endpoint = `${this.url}/rest/v1/${table}?select=${query}`;
            
            // Agregar filtros
            Object.entries(filters).forEach(([key, value]) => {
                endpoint += `&${key}=eq.${value}`;
            });

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error en select:', error);
            throw error;
        }
    }

    // Insertar datos en una tabla
    async insert(table, data) {
        try {
            const response = await fetch(`${this.url}/rest/v1/${table}`, {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error en insert:', error);
            throw error;
        }
    }

    // Actualizar datos en una tabla
    async update(table, data, filters = {}) {
        try {
            let endpoint = `${this.url}/rest/v1/${table}?`;
            
            Object.entries(filters).forEach(([key, value]) => {
                endpoint += `${key}=eq.${value}&`;
            });

            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    ...this.headers,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error en update:', error);
            throw error;
        }
    }
}

// Inicializar cliente Supabase
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);

// ===================================================
// ADAPTADOR PARA auth.js
// ===================================================

// Sistema híbrido de persistencia
class HybridStorage {
    constructor() {
    this.useSupabase = true; // Activar Supabase por defecto
    this.fallbackToLocal = true; // Usar localStorage como fallback
    this.supabaseUrl = SUPABASE_URL;
    this.supabaseKey = SUPABASE_KEY;
    this.supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);
}

    // Guardar cliente (híbrido: Supabase PRIMERO + localStorage)
    async saveClient(username, clientData) {
        let supabaseSuccess = false;
        
        // SIEMPRE intentar guardar en Supabase PRIMERO (principal)
        if (this.useSupabase) {
            try {
                await this.saveToSupabase(username, clientData);
                console.log(`☁️ Cliente ${username} guardado en Supabase (principal)`);
                supabaseSuccess = true;
            } catch (error) {
                console.warn(`⚠️ Error guardando en Supabase: ${error.message}`);
            }
        }

        // Guardar en localStorage como respaldo
        this.saveToLocalStorage(username, clientData);
        
        if (supabaseSuccess) {
            console.log(`✅ Cliente ${username} guardado en Supabase + localStorage`);
        } else {
            console.log(`📱 Cliente ${username} guardado solo en localStorage (fallback)`);
        }

        return true;
    }

    // Cargar cliente (híbrido: Supabase PRIMERO, localStorage como fallback)
    async loadClient(username) {
        let clientData = null;
        
        // Intentar cargar desde Supabase PRIMERO (principal)
        if (this.useSupabase) {
            try {
                clientData = await this.loadFromSupabase(username);
                if (clientData) {
                    // Actualizar localStorage con datos más recientes de Supabase
                    this.saveToLocalStorage(username, clientData);
                    console.log(`☁️ Cliente ${username} cargado desde Supabase (principal)`);
                    return clientData;
                }
            } catch (error) {
                console.warn(`⚠️ Error cargando desde Supabase: ${error.message}`);
                console.log(`📱 Intentando cargar desde localStorage (fallback)`);
            }
        }

        // Si Supabase falló o no está disponible, usar localStorage como fallback
        clientData = this.loadFromLocalStorage(username);
        
        if (clientData) {
            console.log(`📱 Cliente ${username} cargado desde localStorage (fallback)`);
            return clientData;
        }

        return null;
    }

    // Guardar en localStorage (método actual)
    saveToLocalStorage(username, clientData) {
        try {
            const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
            clientsDatabase[username] = clientData;
            localStorage.setItem('clientsDatabase', JSON.stringify(clientsDatabase));
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
        }
    }

    // Cargar desde localStorage (método actual)
    loadFromLocalStorage(username) {
        try {
            const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
            return clientsDatabase[username] || null;
        } catch (error) {
            console.error('Error cargando desde localStorage:', error);
            return null;
        }
    }

    // Guardar en Supabase
    async saveToSupabase(username, clientData) {
        // Convertir formato localStorage a Supabase
        const supabaseData = this.convertToSupabaseFormat(username, clientData);
        
        // Verificar si el cliente ya existe
        const existing = await supabase.select('clients', 'id', { username: username });
        
        if (existing.length > 0) {
            // Actualizar cliente existente
            await supabase.update('clients', supabaseData, { username: username });
        } else {
            // Insertar nuevo cliente
            await supabase.insert('clients', supabaseData);
        }

        // Guardar tarjeta de crédito si existe
        if (clientData.clientData && clientData.clientData.creditCard) {
            await this.saveCreditCardToSupabase(username, clientData.clientData.creditCard);
        }

        // Guardar transacciones si existen
        if (clientData.clientData && clientData.clientData.transactions && clientData.clientData.transactions.length > 0) {
            await this.saveTransactionsToSupabase(username, clientData.clientData.transactions);
        }
    }

    // Cargar desde Supabase
    async loadFromSupabase(username) {
        const clients = await supabase.select('clients', '*', { username: username });
        
        if (clients.length === 0) {
            return null;
        }

        const supabaseClient = clients[0];
        
        // Convertir formato Supabase a localStorage
        return this.convertFromSupabaseFormat(supabaseClient);
    }

    // Convertir de localStorage a Supabase
    convertToSupabaseFormat(username, localData) {
        const clientData = localData.clientData;
        const [nombres, ...apellidosArray] = clientData.name.split(' ');
        const apellidos = apellidosArray.join(' ');

        // Obtener datos del registro (directamente del localData si están disponibles)
        let documentNumber = localData.documento ? localData.documento.replace(/\./g, '') : 'N/A';
        let documentType = localData.tipoDocumento || (clientData.account.accountType === 'Ahorros' ? 'V' : 'J');

        return {
            username: username,
            password_hash: localData.password,
            document_type: documentType,
            document_number: documentNumber, // Número de cédula/RIF sin puntos
            account_number: clientData.account.accountNumber, // Número de cuenta bancaria
            nombres: nombres,
            apellidos: apellidos,
            email: clientData.email,
            telefono: clientData.phone,
            ciudad: localData.ciudad || 'N/A', // Agregar ciudad
            saldo_cuenta: clientData.account.balance,
            fecha_registro: localData.fechaRegistro || new Date().toISOString(),
            estado: localData.estado || 'activo'
        };
    }

    // Convertir de Supabase a localStorage
    convertFromSupabaseFormat(supabaseData) {
        return {
            password: supabaseData.password_hash,
            usuario: supabaseData.username,
            documento: supabaseData.document_number, // Número de documento
            tipoDocumento: supabaseData.document_type, // Tipo de documento
            nombres: supabaseData.nombres,
            apellidos: supabaseData.apellidos || '',
            email: supabaseData.email,
            telefono: supabaseData.telefono,
            ciudad: supabaseData.ciudad || 'N/A',
            numeroCuenta: supabaseData.account_number, // Número de cuenta
            saldoCuenta: parseFloat(supabaseData.saldo_cuenta),
            fechaRegistro: supabaseData.fecha_registro || new Date().toISOString(),
            estado: supabaseData.estado || 'activo',
            clientData: {
                id: `CLI_${supabaseData.username}`,
                name: `${supabaseData.nombres} ${supabaseData.apellidos || ''}`,
                email: supabaseData.email,
                phone: supabaseData.telefono,
                account: {
                    accountId: `ACC_${supabaseData.username}_001`,
                    accountNumber: supabaseData.account_number, // Usar account_number para la cuenta
                    accountType: supabaseData.document_type === 'V' ? 'Ahorros' : 'Corriente',
                    balance: parseFloat(supabaseData.saldo_cuenta),
                    currency: 'VES'
                },
                creditCard: null, // Se cargará separadamente si existe
                transactions: []
            }
        };
    }

    // Guardar tarjeta de crédito en Supabase
    async saveCreditCardToSupabase(username, creditCard) {
        try {
            // Obtener ID del cliente
            const clients = await supabase.select('clients', 'id', { username: username });
            if (clients.length === 0) return;

            const clientId = clients[0].id;
            
            const cardData = {
                client_id: clientId,
                card_id: creditCard.cardId,
                card_number: creditCard.cardNumber,
                card_type: creditCard.cardType,
                holder_name: creditCard.holderName,
                expiry_date: creditCard.expiryDate,
                cvv: creditCard.cvv,
                credit_limit: creditCard.creditLimit,
                current_balance: creditCard.currentBalance,
                available_credit: creditCard.availableCredit,
                status: creditCard.status,
                account_id: creditCard.accountId
            };

            // Verificar si la tarjeta ya existe
            const existing = await supabase.select('credit_cards', 'id', { card_id: creditCard.cardId });
            
            if (existing.length > 0) {
                await supabase.update('credit_cards', cardData, { card_id: creditCard.cardId });
            } else {
                await supabase.insert('credit_cards', cardData);
            }
        } catch (error) {
            console.warn('Error guardando tarjeta en Supabase:', error);
        }
    }

    // Guardar transacciones en Supabase
    async saveTransactionsToSupabase(username, transactions) {
        try {
            // Obtener ID del cliente
            const clients = await supabase.select('clients', 'id', { username: username });
            if (clients.length === 0) return;

            const clientId = clients[0].id;

            // Procesar cada transacción
            for (const transaction of transactions) {
                const transactionData = {
                    client_id: clientId,
                    transaction_id: transaction.id,
                    date: transaction.date,
                    description: transaction.description,
                    amount: transaction.amount,
                    transaction_type: transaction.type,
                    reference: transaction.reference,
                    account_id: transaction.accountId,
                    auth_code: transaction.authCode || null,
                    status: 'completed'
                };

                // Verificar si la transacción ya existe
                const existing = await supabase.select('transactions', 'id', { transaction_id: transaction.id });
                
                if (existing.length === 0) {
                    // Insertar solo si no existe
                    await supabase.insert('transactions', transactionData);
                }
            }
            
            console.log(`📊 ${transactions.length} transacciones procesadas para ${username}`);
        } catch (error) {
            console.warn('Error guardando transacciones en Supabase:', error);
        }
    }
}

// ================== FUNCIONES DE MIGRACIÓN Y VERIFICACIÓN ==================

// Función para migración masiva de localStorage a Supabase
async function migrateAllDataToSupabase() {
    console.log('🔄 Iniciando migración masiva de localStorage a Supabase...');
    
    try {
        // 1. Migrar clientes desde clientsDatabase
        const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
        let migratedClients = 0;
        let failedClients = 0;
        
        for (const [username, clientInfo] of Object.entries(clientsDatabase)) {
            try {
                // Determinar estructura de datos
                let clientData;
                
                if (clientInfo.clientData) {
                    // Usuario de prueba - usar estructura existente
                    clientData = clientInfo.clientData;
                } else if (clientInfo.usuario) {
                    // Nuevo registro - convertir formato
                    clientData = {
                        id: clientInfo.id,
                        name: `${clientInfo.nombres} ${clientInfo.apellidos}`,
                        email: clientInfo.email,
                        phone: clientInfo.telefono,
                        account: {
                            accountId: clientInfo.id + '_001',
                            accountNumber: clientInfo.documento,
                            accountType: clientInfo.tipoDocumento === 'V' ? 'Ahorros' : 'Corriente',
                            balance: clientInfo.saldoCuenta || 0,
                            currency: 'VES'
                        },
                        creditCard: clientInfo.creditCard || null,
                        transactions: clientInfo.transactions || []
                    };
                }
                
                if (clientData) {
                    await hybridStorage.saveClient(username, clientData);
                    migratedClients++;
                    console.log(`✅ Cliente migrado: ${username}`);
                }
                
            } catch (error) {
                console.warn(`⚠️ Error migrando cliente ${username}:`, error);
                failedClients++;
            }
        }
        
        // 2. Migrar datos persistentes individuales
        let migratedPersistent = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Buscar claves que parecen datos de cliente persistentes
            if (key && key.startsWith('client_data_persistent_')) {
                try {
                    const username = key.replace('client_data_persistent_', '');
                    const data = JSON.parse(localStorage.getItem(key));
                    
                    if (data && typeof data === 'object') {
                        await hybridStorage.saveClient(username, data);
                        migratedPersistent++;
                        console.log(`✅ Datos persistentes migrados: ${username}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Error migrando datos persistentes ${key}:`, error);
                }
            }
        }
        
        const summary = {
            clientsDatabase: { migrated: migratedClients, failed: failedClients },
            persistentData: { migrated: migratedPersistent },
            total: migratedClients + migratedPersistent
        };
        
        console.log('🎯 Migración completada:', summary);
        
        return {
            success: true,
            summary: summary,
            message: `✅ Migración exitosa: ${summary.total} registros migrados a Supabase`
        };
        
    } catch (error) {
        console.error('❌ Error durante la migración masiva:', error);
        return {
            success: false,
            error: error.message,
            message: '❌ Error durante la migración masiva'
        };
    }
}

// Función para verificar sincronización completa
async function verifyDataSynchronization() {
    console.log('🔍 Verificando sincronización entre localStorage y Supabase...');
    
    try {
        const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
        const localUsers = Object.keys(clientsDatabase);
        
        const verificationResults = [];
        
        for (const username of localUsers) {
            try {
                // Cargar desde sistema híbrido (Supabase primero)
                const hybridData = await hybridStorage.loadClient(username);
                
                const result = {
                    username: username,
                    inLocalStorage: true,
                    inSupabase: !!hybridData,
                    status: hybridData ? '✅ SINCRONIZADO' : '⚠️ SOLO LOCAL'
                };
                
                verificationResults.push(result);
                console.log(`${result.status} - ${username}`);
                
            } catch (error) {
                verificationResults.push({
                    username: username,
                    inLocalStorage: true,
                    inSupabase: false,
                    status: '❌ ERROR',
                    error: error.message
                });
            }
        }
        
        const synchronized = verificationResults.filter(r => r.inSupabase).length;
        const total = verificationResults.length;
        
        console.log(`📊 Sincronización: ${synchronized}/${total} usuarios sincronizados`);
        
        return {
            success: true,
            results: verificationResults,
            summary: { synchronized, total, percentage: total > 0 ? Math.round((synchronized/total)*100) : 100 }
        };
        
    } catch (error) {
        console.error('❌ Error verificando sincronización:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ================== FIN FUNCIONES DE MIGRACIÓN ==================

// Crear instancia global del almacenamiento híbrido
const hybridStorage = new HybridStorage();

// ===================================================
// FUNCIONES PARA INTEGRAR CON auth.js
// ===================================================

// Sobrescribir función de guardado persistente
async function saveClientDataToPersistentStorage(username, clientData) {
    return await hybridStorage.saveClient(username, clientData);
}

// Sobrescribir función de carga persistente
async function loadClientDataFromPersistentStorage(username) {
    return await hybridStorage.loadClient(username);
}

// Función para migrar todos los datos de localStorage a Supabase
async function migrateAllDataToSupabase() {
    console.log('🔄 Iniciando migración completa a Supabase...');
    
    try {
        const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
        const usernames = Object.keys(clientsDatabase);
        
        console.log(`📊 Encontrados ${usernames.length} usuarios para migrar`);
        
        let migrated = 0;
        let errors = 0;
        
        for (const username of usernames) {
            try {
                await hybridStorage.saveToSupabase(username, clientsDatabase[username]);
                migrated++;
                console.log(`✅ Migrado: ${username}`);
            } catch (error) {
                errors++;
                console.error(`❌ Error migrando ${username}:`, error);
            }
        }
        
        console.log(`🎉 Migración completada: ${migrated} exitosos, ${errors} errores`);
        return { migrated, errors, total: usernames.length };
        
    } catch (error) {
        console.error('❌ Error en migración:', error);
        throw error;
    }
}

// Función de estado del sistema híbrido
function getHybridSystemStatus() {
    return {
        supabaseEnabled: hybridStorage.useSupabase,
        fallbackEnabled: hybridStorage.fallbackToLocal,
        localStorageSize: localStorage.getItem('clientsDatabase')?.length || 0,
        supabaseUrl: SUPABASE_URL
    };
}

// Función específica para guardar una transacción individual
async function saveTransactionToSupabase(username, transaction) {
    if (!hybridStorage.useSupabase) return;
    
    try {
        // Obtener ID del cliente
        const clients = await supabase.select('clients', 'id', { username: username });
        if (clients.length === 0) {
            console.warn(`⚠️ Cliente ${username} no encontrado en Supabase para guardar transacción`);
            return;
        }

        const clientId = clients[0].id;
        
        const transactionData = {
            client_id: clientId,
            transaction_id: transaction.id,
            date: transaction.date,
            description: transaction.description,
            amount: transaction.amount,
            transaction_type: transaction.type,
            reference: transaction.reference,
            account_id: transaction.accountId,
            auth_code: transaction.authCode || null,
            status: 'completed'
        };

        // Verificar si la transacción ya existe
        const existing = await supabase.select('transactions', 'id', { transaction_id: transaction.id });
        
        if (existing.length === 0) {
            await supabase.insert('transactions', transactionData);
            console.log(`💳 Transacción ${transaction.id} guardada en Supabase para ${username}`);
        } else {
            console.log(`ℹ️ Transacción ${transaction.id} ya existe en Supabase`);
        }
    } catch (error) {
        console.warn(`⚠️ Error guardando transacción en Supabase: ${error.message}`);
    }
}

// Función específica para actualizar tarjetas de crédito
async function updateCreditCardInSupabase(username, creditCard) {
    if (!hybridStorage.useSupabase) return;
    
    try {
        await hybridStorage.saveCreditCardToSupabase(username, creditCard);
        console.log(`💳 Tarjeta de crédito actualizada en Supabase para ${username}`);
    } catch (error) {
        console.warn(`⚠️ Error actualizando tarjeta en Supabase: ${error.message}`);
    }
}

// Exponer funciones globalmente para debugging y administración
window.hybridStorage = hybridStorage;
window.migrateAllDataToSupabase = migrateAllDataToSupabase;
window.verifyDataSynchronization = verifyDataSynchronization;
window.getHybridSystemStatus = getHybridSystemStatus;
window.updateCreditCardInSupabase = updateCreditCardInSupabase;
window.saveTransactionToSupabase = saveTransactionToSupabase;

console.log('🔄 Sistema híbrido localStorage + Supabase inicializado');

console.log('📊 Estado:', getHybridSystemStatus());

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
        // Mostrar el saldo que se va a guardar para depuración
        let saldo = null;
        if (clientData.account && typeof clientData.account.balance !== 'undefined') {
            saldo = clientData.account.balance;
        } else if (clientData.clientData && clientData.clientData.account && typeof clientData.clientData.account.balance !== 'undefined') {
            saldo = clientData.clientData.account.balance;
        }
        console.log(`🟡 [LOG] Saldo a guardar para ${username}:`, saldo);

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
        const existing = await supabase.select('clients', '*', { username: username });
        if (existing.length > 0) {
            // Solo actualizar saldo_cuenta y campos permitidos, NO document_number ni otros sensibles
            const updateFields = {
                saldo_cuenta: supabaseData.saldo_cuenta,
                // Puedes agregar otros campos que sí quieras actualizar aquí
                // updated_at: new Date().toISOString()
            };
            await supabase.update('clients', updateFields, { username: username });
        } else {
            // Insertar nuevo cliente (incluye document_number si es la primera vez)
            await supabase.insert('clients', supabaseData);
                // Generar API key solo para persona jurídica
                if (supabaseData.document_type === 'J') {
                    const apiKey = crypto.randomUUID();
                    await supabase.insert('api_keys', {
                        key: apiKey,
                        commerce_id: supabaseData.username,
                        status: 'active',
                        created_at: new Date().toISOString()
                    });
                    console.log('✅ API key generada y guardada para comercio:', apiKey);
                }
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
        const clientData = this.convertFromSupabaseFormat(supabaseClient);

        // CARGAR TARJETA DE CRÉDITO DESDE TABLA SEPARADA
        try {
            const creditCards = await supabase.select('credit_cards', '*', { client_id: supabaseClient.id });
            if (creditCards && creditCards.length > 0) {
                const cardData = creditCards[0];
                clientData.clientData.creditCard = {
                    cardId: cardData.card_id,
                    cardNumber: cardData.card_number,
                    cardType: cardData.card_type,
                    holderName: cardData.holder_name,
                    expiryDate: cardData.expiry_date,
                    cvv: cardData.cvv,
                    creditLimit: parseFloat(cardData.credit_limit),
                    currentBalance: parseFloat(cardData.current_balance),
                    availableCredit: parseFloat(cardData.available_credit),
                    status: cardData.status
                };
                console.log('✅ Tarjeta de crédito cargada desde Supabase:', clientData.clientData.creditCard);
            } else {
                console.log('ℹ️ No se encontró tarjeta de crédito para el usuario:', username);
            }
        } catch (cardError) {
            console.warn('⚠️ Error cargando tarjeta de crédito:', cardError);
        }

        // CARGAR TRANSACCIONES DESDE TABLA SEPARADA
        try {
                const transactions = await supabase.select('transactions', '*', { client_id: supabaseClient.id });
                // Ordenar por fecha y hora de creación descendente y tomar los 10 más recientes
                transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                const last10 = transactions.slice(0, 10);
                if (last10.length > 0) {
                    clientData.clientData.transactions = last10.map(tx => ({
                        id: tx.transaction_id,
                        date: tx.date,
                        description: tx.description,
                        amount: parseFloat(tx.amount),
                        type: tx.transaction_type,
                        reference: tx.reference,
                        accountId: tx.account_id,
                        authCode: tx.auth_code,
                        status: tx.status,
                        displayTime: tx.date
                    }));
                    console.log(`✅ ${last10.length} transacciones cargadas desde Supabase para ${username}`);
                } else {
                    clientData.clientData.transactions = [];
                    console.log('ℹ️ No se encontraron transacciones para el usuario:', username);
                }
        } catch (txError) {
            clientData.clientData.transactions = [];
            console.warn('⚠️ Error cargando transacciones:', txError);
        }

        return clientData;
    }

    // Convertir de localStorage a Supabase (acepta ambos formatos: anidado y directo)
    convertToSupabaseFormat(username, localData) {
        // Detectar si los datos están anidados (con clientData) o directos
        let data = localData.clientData ? localData.clientData : localData;
        // Para los campos fuera de clientData
        let password = localData.password || localData.password_hash || '';
        let tipoDocumento = localData.tipoDocumento || localData.document_type || 'V';
        let documento = localData.documento || localData.document_number || '';

        // Nombre y apellidos
        let nameString = data.name || data.nombres || '';
        let [nombres, ...apellidosArray] = nameString.split(' ');
        let apellidos = apellidosArray.join(' ');

        // Email y teléfono
        let email = data.email || localData.email || '';
        let telefono = data.phone || localData.telefono || '';

        // Cuenta
        let account = data.account || localData.account || {};
        let accountNumber = account.accountNumber || account.account_number || '';
        let balance = account.balance || 0;

        return {
            username: username,
            password_hash: password,
            document_type: tipoDocumento,
            document_number: documento ? String(documento).replace(/\./g, '') : 'N/A',
            account_number: accountNumber,
            nombres: nombres,
            apellidos: apellidos,
            email: email,
            telefono: telefono,
            saldo_cuenta: balance,
            bank_code: 'BANCO_2',
            bank_name: 'Meridian Banco',
            status: 'active',
            comercio_codigo: (localData.comercio_codigo || data.comercio_codigo || '').toUpperCase()
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
            // Obtener ID del cliente desde la tabla clients (no clientes)
            const clients = await supabase.select('clients', 'id', { username: username });
            if (clients.length === 0) {
                console.warn('Cliente no encontrado en Supabase para guardar tarjeta:', username);
                return;
            }

            const clientId = clients[0].id;
            
            const cardData = {
                client_id: clientId,
                card_id: creditCard.cardId,
                card_number: creditCard.cardNumber,
                card_type: creditCard.cardType || 'standard',
                holder_name: creditCard.holderName || username,
                expiry_date: creditCard.expirationDate || creditCard.expiryDate,
                cvv: creditCard.cvv,
                credit_limit: parseFloat(creditCard.creditLimit),
                current_balance: parseFloat(creditCard.currentBalance),
                available_credit: parseFloat(creditCard.availableCredit),
                status: creditCard.status || 'active'
            };

            console.log('💾 Datos de tarjeta a insertar:', cardData);

            // Verificar si la tarjeta ya existe
            const existing = await supabase.select('credit_cards', 'id', { card_id: creditCard.cardId });
            
            if (existing.length > 0) {
                console.log('🔄 Actualizando tarjeta existente');
                await supabase.update('credit_cards', cardData, { card_id: creditCard.cardId });
            } else {
                console.log('➕ Insertando nueva tarjeta');
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

    // Función para obtener todos los clientes (requerida por account-generator)
    getAllClients() {
        try {
            const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
            return Object.values(clientsDatabase);
        } catch (error) {
            console.warn('Error obteniendo clientes:', error);
            return [];
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

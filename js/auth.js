// ===================================================
// AUTH.JS SIMPLIFICADO PARA DIAGNÓSTICO
// Solo funciones esenciales de login
// ===================================================

console.log('🚀 Iniciando carga de auth.js simplificado...');

// Variables globales básicas
let clientsDatabase = {};

// Función para inicializar base de datos básica
function initializeBasicDatabase() {
    clientsDatabase = {
        'cliente1': {
            password: '1234',
            clientData: {
                id: 'CLI_001',
                name: 'María García',
                email: 'maria.garcia@email.com',
                phone: '+58424-123-4567',
                account: {
                    accountId: 'ACC_001',
                    accountNumber: '01004138052681019772', // Formato de 20 dígitos
                    accountType: 'Ahorros',
                    balance: 45000.00,
                    currency: 'VES'
                },
                creditCard: null,
                transactions: []
            }
        },
        'cliente2': {
            password: '5678',
            clientData: {
                id: 'CLI_002',
                name: 'Carlos Rodríguez',
                email: 'carlos.rodriguez@email.com',
                phone: '+58426-987-6543',
                account: {
                    accountId: 'ACC_002',
                    accountNumber: '01000239888004108758', // Formato de 20 dígitos
                    accountType: 'Corriente',
                    balance: 32500.00,
                    currency: 'VES'
                },
                creditCard: null,
                transactions: []
            }
        },
        'cliente3': {
            password: '9999',
            clientData: {
                id: 'CLI_003',
                name: 'Ana Martínez',
                email: 'ana.martinez@email.com',
                phone: '+58414-555-7890',
                account: {
                    accountId: 'ACC_003',
                    accountNumber: '01000170319323893377', // Formato de 20 dígitos
                    accountType: 'Ahorros',
                    balance: 67500.00,
                    currency: 'VES'
                },
                creditCard: null,
                transactions: []
            }
        },
        // Mantener compatibilidad con usuarios migrados
        'maria.garcia': {
            password: '1234',
            clientData: {
                id: 'CLI_001',
                name: 'María García',
                email: 'maria.garcia@email.com',
                phone: '+58424-123-4567',
                account: {
                    accountId: 'ACC_001',
                    accountNumber: '01004138052681019772',
                    accountType: 'Ahorros',
                    balance: 45000.00,
                    currency: 'VES'
                },
                creditCard: null,
                transactions: []
            }
        },
        'carlos.rodriguez': {
            password: '5678',
            clientData: {
                id: 'CLI_002',
                name: 'Carlos Rodríguez',
                email: 'carlos.rodriguez@email.com',
                phone: '+58426-987-6543',
                account: {
                    accountId: 'ACC_002',
                    accountNumber: '01000239888004108758',
                    accountType: 'Corriente',
                    balance: 32500.00,
                    currency: 'VES'
                },
                creditCard: null,
                transactions: []
            }
        },
        'ana.martinez': {
            password: '9999',
            clientData: {
                id: 'CLI_003',
                name: 'Ana Martínez',
                email: 'ana.martinez@email.com',
                phone: '+58414-555-7890',
                account: {
                    accountId: 'ACC_003',
                    accountNumber: '01000170319323893377',
                    accountType: 'Ahorros',
                    balance: 67500.00,
                    currency: 'VES'
                },
                creditCard: null,
                transactions: []
            }
        }
    };
    console.log('✅ Base de datos básica inicializada');
}

// Función de login con integración Supabase
async function login(username, password) {
    console.log('=== INICIO LOGIN CON SUPABASE ===');
    console.log('Usuario:', username, 'Password:', password);
    
    try {
        // PASO 1: Intentar login con Supabase (prioridad)
        if (window.hybridStorage) {
            console.log('🔄 Intentando login con Supabase...');
            try {
                const supabaseClient = await hybridStorage.loadFromSupabase(username);
                if (supabaseClient && supabaseClient.password === password) {
                    console.log('✅ Login exitoso desde Supabase');
                    
                    // Guardar sesión
                    sessionStorage.setItem('currentUser', username);
                    sessionStorage.setItem('clientData', JSON.stringify(supabaseClient.clientData));
                    
                    // Actualizar localStorage para cache
                    hybridStorage.saveToLocalStorage(username, supabaseClient);
                    
                    return true;
                }
                console.log('⚠️ Usuario encontrado en Supabase pero contraseña incorrecta');
            } catch (error) {
                console.log('⚠️ Error consultando Supabase, usando fallback localStorage:', error.message);
            }
        }
        
        // PASO 2: Fallback a localStorage
        console.log('🔄 Intentando login con localStorage...');
        
        // Inicializar base de datos local si no existe
        if (!clientsDatabase || Object.keys(clientsDatabase).length === 0) {
            initializeBasicDatabase();
        }
        
        // Buscar usuario en localStorage
        const client = clientsDatabase[username];
        
        if (!client) {
            console.log('❌ Usuario no encontrado en localStorage');
            return false;
        }
        
        // Verificar contraseña
        if (String(client.password) !== String(password)) {
            console.log('❌ Contraseña incorrecta en localStorage');
            return false;
        }
        
        console.log('✅ Login exitoso desde localStorage');
        
        // Guardar sesión
        sessionStorage.setItem('currentUser', username);
        sessionStorage.setItem('clientData', JSON.stringify(client.clientData));
        
        return true;
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        return false;
    }
}

// Funciones auxiliares
function logout() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('clientData');
    window.location.href = 'index.html';
}

function isLoggedIn() {
    return sessionStorage.getItem('currentUser') !== null;
}

function getCurrentClient() {
    const clientData = sessionStorage.getItem('clientData');
    return clientData ? JSON.parse(clientData) : null;
}

// EXPOSICIÓN GLOBAL INMEDIATA
console.log('📤 Exponiendo funciones globalmente...');
window.login = login;
window.logout = logout;
window.isLoggedIn = isLoggedIn;
window.getCurrentClient = getCurrentClient;

console.log('✅ Funciones expuestas:', {
    login: typeof window.login,
    logout: typeof window.logout,
    isLoggedIn: typeof window.isLoggedIn,
    getCurrentClient: typeof window.getCurrentClient
});

// Inicializar automáticamente
initializeBasicDatabase();

// =================== FUNCIONES BANCARIAS ADICIONALES ===================

// Función para solicitar tarjeta de crédito
async function requestCreditCard() {
    const clientData = getCurrentClient();
    
    if (!clientData) {
        return { success: false, message: 'No hay sesión activa' };
    }
    
    // VALIDACIÓN: Verificar que realmente no tenga tarjeta activa
    if (clientData.creditCard && 
        clientData.creditCard.status === 'active' && 
        clientData.creditCard.cardNumber) {
        return { success: false, message: 'Ya tienes una tarjeta de crédito activa' };
    }
    
    // Generar nueva tarjeta
    const newCard = {
        cardId: `CARD_${Date.now()}`,
        cardNumber: await generateCardNumber(),
        expirationDate: generateExpirationDate(),
        cvv: generateCVV(),
        creditLimit: 50000.00,
        currentBalance: 0.00,
        availableCredit: 50000.00,
        status: 'active',
        holderName: clientData.name || clientData.usuario || 'TITULAR',
        cardType: 'standard'
    };
    
    clientData.creditCard = newCard;
    
    // Actualizar sesión
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    // Guardar en sistema híbrido
    const currentUser = sessionStorage.getItem('currentUser');
    try {
        console.log('💾 Guardando tarjeta en sistema híbrido...');
        const hybridStorage = new HybridStorage();
        
        // Actualizar datos completos del cliente
        try {
            await hybridStorage.saveClient(currentUser, clientData);
        } catch (saveClientError) {
            console.warn('⚠️ Error guardando cliente completo (continuando):', saveClientError);
        }
        
        // Guardar específicamente la tarjeta de crédito
        await hybridStorage.saveCreditCardToSupabase(currentUser, newCard);
        
        console.log('✅ Tarjeta guardada exitosamente en Supabase');
    } catch (error) {
        console.error('❌ Error guardando tarjeta en sistema híbrido:', error);
        // No lanzar error ya que la tarjeta se creó localmente
    }
    
    return { success: true, card: newCard };
}

// Función para usar tarjeta de crédito
async function useCreditCard(amount, description, cardNumber = null) {
    if (!cardNumber) {
        const clientData = getCurrentClient();
        
        if (!clientData || !clientData.creditCard) {
            return { success: false, message: 'No tienes tarjeta de crédito activa' };
        }
        
        return processLocalCardPurchase(clientData, amount, description);
    } else {
        // Tarjeta externa - procesamiento simplificado
        return { 
            success: true, 
            message: 'Transacción autorizada',
            authCode: 'AUTH' + Date.now(),
            bankName: 'Meridian Banco'
        };
    }
}

// Procesar compra local
function processLocalCardPurchase(clientData, amount, description) {
    const card = clientData.creditCard;
    
    if (card.status !== 'active') {
        return { success: false, message: 'Tu tarjeta de crédito no está activa' };
    }
    
    if (card.availableCredit < amount) {
        return { 
            success: false, 
            message: `Monto superior al límite. Disponible: ${formatCurrency(card.availableCredit)}` 
        };
    }
    
    // Procesar transacción
    card.currentBalance += amount;
    card.availableCredit -= amount;
    
    // Agregar transacción
    const newTransaction = {
        id: `TXN_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: description || 'Compra con tarjeta de crédito',
        amount: -amount,
        type: 'Tarjeta de Crédito',
        reference: `TDC-${Date.now()}`,
        accountId: clientData.account.accountId
    };
    
    clientData.transactions.unshift(newTransaction);
    
    // Actualizar sesión
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    return { success: true, transaction: newTransaction, updatedCard: card };
}

// Función para pagar tarjeta de crédito
async function payCreditCard(amount) {
    const clientData = getCurrentClient();
    
    if (!clientData || !clientData.creditCard) {
        return { success: false, message: 'No tienes tarjeta de crédito activa' };
    }
    
    const card = clientData.creditCard;
    
    if (amount <= 0) {
        return { success: false, message: 'El monto del pago debe ser mayor a 0' };
    }
    
    if (amount > card.currentBalance) {
        return { 
            success: false, 
            message: `No puedes pagar más de lo que debes. Saldo actual: ${formatCurrency(card.currentBalance)}` 
        };
    }
    
    // Procesar pago
    card.currentBalance -= amount;
    card.availableCredit += amount;
    
    // Agregar transacción
    const newTransaction = {
        id: `TXN_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: 'Pago de tarjeta de crédito',
        amount: amount,
        type: 'Pago Tarjeta',
        reference: `PAY-${Date.now()}`,
        accountId: clientData.account.accountId
    };
    
    clientData.transactions.unshift(newTransaction);
    
    // Actualizar sesión
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    return { success: true, transaction: newTransaction };
}

// Funciones auxiliares
//function generateCardNumber() {
//    return '4567-1234-5678-' + String(Math.floor(Math.random() * 9000) + 1000);

async function generateCardNumber() {
    let cardNumber;
    let exists = true;
    while (exists) {
        cardNumber = '4567-1234-5678-' + String(Math.floor(Math.random() * 9000) + 1000);
        // Consultar en Supabase si ya existe
        const result = await supabase.select('credit_cards', 'id', { card_number: cardNumber });
        exists = result.length > 0;
    }
    return cardNumber;
}

function generateExpirationDate() {
    const now = new Date();
    const expDate = new Date(now.getFullYear() + 2, now.getMonth());
    return String(expDate.getMonth() + 1).padStart(2, '0') + '/' + String(expDate.getFullYear()).slice(-2);
}

function generateCVV() {
    return String(Math.floor(Math.random() * 900) + 100);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'VES'
    }).format(amount);
}

// Funciones dummy para compatibilidad
async function saveCreditCardHybrid(username, clientData) {
    console.log('💾 saveCreditCardHybrid llamada (versión simplificada)');
}

async function saveTransactionHybrid(username, transaction) {
    console.log('💾 saveTransactionHybrid llamada (versión simplificada)');
}

// Exponer funciones adicionales
window.requestCreditCard = requestCreditCard;
window.useCreditCard = useCreditCard;
window.payCreditCard = payCreditCard;
window.formatCurrency = formatCurrency;

console.log('🎯 Auth.js simplificado cargado completamente');


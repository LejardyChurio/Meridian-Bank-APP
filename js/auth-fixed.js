// Sistema de autenticación y gestión de datos del banco

// Configuración del sistema bancario
const STANDARD_CREDIT_LIMIT = 100000; // Bs. 100,000 - Límite estándar para todas las tarjetas

// Configuración de enrutamiento interbancario (CONTRATO COMUNICACIONAL)
const BANK_ROUTING = {
    'BANCO_2': {
        name: 'Meridian Banco',
        code: '0102',
        prefixes: ['4532'], // Nuestras tarjetas
        url: 'local' // Este banco (no requiere API)
    },
    'BANCO_1': {
        name: 'Banco Uno',
        code: '0105', 
        prefixes: ['5555'],
        url: 'http://localhost:3002'
    },
    'BANCO_5': {
        name: 'Banco Cinco',
        code: '0134',
        prefixes: ['4444'],
        url: 'http://localhost:3003'
    }
};

// Códigos de error estándar del contrato comunicacional
const STANDARD_ERROR_CODES = {
    CLIENT_NOT_FOUND: {
        code: "IERROR_1001",
        message: "Error: No se encontró ningún cliente afiliado con el código identificador provisto."
    },
    CARD_ERROR: {
        code: "IERROR_1002", 
        message: "Error: {descripción específica del banco emisor}"
    },
    CARD_INACTIVE: {
        code: "IERROR_1003",
        message: "Error: Su tarjeta se encuentra inoperativa, por favor diríjase a su banco."
    },
    CREDIT_LIMIT_EXCEEDED: {
        code: "IERROR_1004",
        message: "Error: Usted ha sobrepasado su límite de crédito."
    },
    CARD_NOT_FOUND: {
        code: "IERROR_1005",
        message: "Error: No se encontró ninguna tarjeta con los datos provistos."
    }
};

// Base de datos simulada de clientes - Será migrada a localStorage si existe
let clientsDatabase = {
    'cliente1': {
        id: 'cliente1',
        tipoDocumento: 'V',
        documento: '12345678',
        password: '1234',
        nombres: 'Juan Carlos',
        apellidos: 'Pérez García',
        email: 'juan.perez@email.com',
        telefono: '0414-123-4567',
        ciudad: 'Caracas',
        usuario: 'cliente1',
        saldoCuenta: 125000,
        fechaRegistro: '2024-01-15T10:30:00.000Z',
        estado: 'activo',
        clientData: {
            id: 'CLI_001',
            name: 'Juan Carlos Pérez García',
            email: 'juan.perez@email.com',
            phone: '+58-414-123-4567',
            // Cada cliente tiene UNA cuenta principal
            account: {
                accountId: 'ACC_001_001',
                accountNumber: '1234567890',
                accountType: 'Ahorros',
                balance: 25000.50,
                currency: 'VES'
            },
            // Máximo UNA tarjeta de crédito asociada a la cuenta
            creditCard: {
                cardId: 'CC_001_001',
                cardNumber: '4532123456789012',
                cardType: 'standard',
                holderName: 'JUAN CARLOS PEREZ',
                expiryDate: '12/28',
                cvv: '123',
                creditLimit: 100000.00,
                currentBalance: 15000.75,
                availableCredit: 85000.25,
                status: 'active',
                accountId: 'ACC_001_001'
            },
            transactions: [
                {
                    id: 'TXN_001',
                    date: '2025-11-10',
                    description: 'Compra con tarjeta de crédito',
                    amount: -1500.50,
                    type: 'Tarjeta de Crédito',
                    reference: 'TDC-001',
                    accountId: 'ACC_001_001'
                },
                {
                    id: 'TXN_002',
                    date: '2025-11-09',
                    description: 'Depósito en efectivo',
                    amount: 5000.00,
                    type: 'Crédito',
                    reference: 'DEP-001',
                    accountId: 'ACC_001_001'
                },
                {
                    id: 'TXN_003',
                    date: '2025-11-08',
                    description: 'Pago de tarjeta de crédito',
                    amount: -2000.25,
                    type: 'Pago TDC',
                    reference: 'PAY-001',
                    accountId: 'ACC_001_001'
                }
            ]
        }
    },
    'cliente2': {
        password: '5678',
        clientData: {
            id: 'CLI_002',
            name: 'María Elena Rodríguez',
            email: 'maria.rodriguez@email.com',
            phone: '+58-426-9876543',
            // Cada cliente tiene UNA cuenta principal
            account: {
                accountId: 'ACC_002_001',
                accountNumber: '2345678901',
                accountType: 'Corriente',
                balance: 42000.80,
                currency: 'VES'
            },
            // Cliente con tarjeta de crédito ya activa
            creditCard: {
                cardId: 'CC_002_001',
                cardNumber: '4532234567890123',
                cardType: 'standard',
                holderName: 'MARIA ELENA RODRIGUEZ',
                expiryDate: '08/29',
                cvv: '456',
                creditLimit: 100000.00,
                currentBalance: 25000.40,
                availableCredit: 75000.60,
                status: 'active',
                accountId: 'ACC_002_001'
            },
            transactions: [
                {
                    id: 'TXN_004',
                    date: '2025-11-10',
                    description: 'Compra con tarjeta de crédito',
                    amount: -890.75,
                    type: 'Tarjeta de Crédito',
                    reference: 'TDC-002',
                    accountId: 'ACC_002_001'
                },
                {
                    id: 'TXN_005',
                    date: '2025-11-09',
                    description: 'Transferencia recibida',
                    amount: 3000.00,
                    type: 'Crédito',
                    reference: 'TRF-001',
                    accountId: 'ACC_002_001'
                }
            ]
        }
    },
    'cliente3': {
        password: '9012',
        clientData: {
            id: 'CLI_003',
            name: 'Carlos Alberto Gómez',
            email: 'carlos.gomez@email.com',
            phone: '+58-412-5555555',
            // Cada cliente tiene UNA cuenta principal
            account: {
                accountId: 'ACC_003_001',
                accountNumber: '3456789012',
                accountType: 'Ahorros',
                balance: 8900.25,
                currency: 'VES'
            },
            // Cliente SIN tarjeta de crédito (puede solicitar una)
            creditCard: null,
            transactions: [
                {
                    id: 'TXN_006',
                    date: '2025-11-10',
                    description: 'Pago servicios públicos',
                    amount: -1200.50,
                    type: 'Débito',
                    reference: 'SRV-001',
                    accountId: 'ACC_003_001'
                },
                {
                    id: 'TXN_007',
                    date: '2025-11-09',
                    description: 'Salario depositado',
                    amount: 2500.75,
                    type: 'Crédito',
                    reference: 'SAL-001',
                    accountId: 'ACC_003_001'
                }
            ]
        }
    }
};

// Función para obtener la base de datos por defecto
function getDefaultClientsDatabase() {
    // Retornar una copia profunda de la base de datos original
    return JSON.parse(JSON.stringify(clientsDatabase));
}

// Funciones de persistencia
function saveClientDataToPersistentStorage(username, clientData) {
    // Guardar en localStorage para persistencia entre sesiones
    const persistentKey = `bankData_${username}`;
    localStorage.setItem(persistentKey, JSON.stringify(clientData));
}

function loadClientDataFromPersistentStorage(username) {
    const persistentKey = `bankData_${username}`;
    const savedData = localStorage.getItem(persistentKey);
    
    if (savedData) {
        try {
            return JSON.parse(savedData);
        } catch (error) {
            console.error('Error parsing saved data for user:', username, error);
        }
    }
    
    // Si no hay datos guardados, devolver datos originales de la base
    return clientsDatabase[username] ? JSON.parse(JSON.stringify(clientsDatabase[username].clientData)) : null;
}

function updatePersistentData() {
    const currentUser = sessionStorage.getItem('currentUser');
    const clientData = getCurrentClient();
    
    if (currentUser && clientData) {
        saveClientDataToPersistentStorage(currentUser, clientData);
    }
}

// Función para inicializar la base de datos PRESERVANDO usuarios de prueba
function initializeClientsDatabaseIfNeeded() {
    console.log('🔄 Inicializando base de datos...');
    
    // PASO 1: Preservar usuarios de prueba originales
    const originalTestUsers = {
        'cliente1': clientsDatabase['cliente1'],
        'cliente2': clientsDatabase['cliente2'], 
        'cliente3': clientsDatabase['cliente3']
    };
    
    console.log('🔐 Usuarios de prueba originales:', Object.keys(originalTestUsers));
    
    // PASO 2: Cargar datos existentes de localStorage
    const savedClients = localStorage.getItem('clientsDatabase');
    let existingClients = {};
    
    if (savedClients) {
        try {
            existingClients = JSON.parse(savedClients);
            console.log('💾 Datos cargados de localStorage:', Object.keys(existingClients));
        } catch (error) {
            console.error('❌ Error al cargar localStorage:', error);
            existingClients = {};
        }
    }
    
    // PASO 3: Combinar SIEMPRE poniendo usuarios de prueba primero
    clientsDatabase = {
        ...existingClients,    // Usuarios registrados
        ...originalTestUsers   // Usuarios de prueba (tienen prioridad)
    };
    
    console.log('✅ Base de datos final:', Object.keys(clientsDatabase));
    
    // PASO 4: Guardar en localStorage
    localStorage.setItem('clientsDatabase', JSON.stringify(clientsDatabase));
    
    console.log('🏁 Inicialización completada');
}

// Inicializar automáticamente cuando se carga el archivo
document.addEventListener('DOMContentLoaded', function() {
    initializeClientsDatabaseIfNeeded();
    console.log('🔄 Base de datos inicializada al cargar la página');
});

initializeClientsDatabaseIfNeeded();

// Funciones de autenticación
async function login(username, password) {
    console.log('=== INICIO LOGIN ===');
    console.log('Usuario:', username, 'Password:', password);

    // PASO 1: Intentar cargar usuario desde sistema híbrido (Supabase PRIMERO)
    let clientData = null;
    
    // Usar sistema híbrido para cargar usuario (Supabase primero, localStorage fallback)
    if (typeof hybridStorage !== 'undefined') {
        try {
            clientData = await hybridStorage.loadClient(username);
            console.log('🔍 Cliente cargado desde sistema híbrido:', clientData ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
        } catch (error) {
            console.warn('⚠️ Error en sistema híbrido:', error);
        }
    }
    
    // PASO 2: Si no se encontró en híbrido, buscar en base local (fallback)
    if (!clientData) {
        console.log('📱 Buscando en base de datos local...');
        initializeClientsDatabaseIfNeeded();
        
        let client = null;
        let foundBy = '';
        
        // Buscar por key directa (usuarios de prueba)
        if (clientsDatabase[username]) {
            client = clientsDatabase[username];
            foundBy = 'key';
            console.log('✅ Usuario encontrado por KEY:', username);
        }
        // Buscar por campo usuario (nuevos registros)
        else {
            client = Object.values(clientsDatabase).find(c => c.usuario === username);
            if (client) {
                foundBy = 'field';
                console.log('✅ Usuario encontrado por CAMPO usuario:', username);
            }
        }
        
        if (!client) {
            console.log('❌ Usuario NO encontrado en ningún lado');
            console.log('Disponibles en localStorage:', Object.keys(clientsDatabase));
            console.log('=== FIN LOGIN FALLIDO ===');
            return false;
        }
        
        // Verificar contraseña para usuarios locales
        console.log('🔍 Password en BD local:', client.password, '(tipo:', typeof client.password, ')');
        console.log('🔍 Password input:', password, '(tipo:', typeof password, ')');
        
        if (String(client.password) !== String(password)) {
            console.log('❌ Contraseña incorrecta');
            console.log('=== FIN LOGIN FALLIDO ===');
            return false;
        }
        
        // Convertir datos locales al formato estándar
        if (client.clientData) {
            clientData = client.clientData;
            console.log('📋 Usando datos de usuario de prueba local');
        } else {
            clientData = {
                id: client.id,
                name: `${client.nombres} ${client.apellidos}`,
                email: client.email,
                phone: client.telefono,
                account: {
                    accountId: client.id + '_001',
                    accountNumber: client.documento,
                    accountType: client.tipoDocumento === 'V' ? 'Ahorros' : 'Corriente',
                    balance: client.saldoCuenta,
                    currency: 'VES'
                },
                creditCard: client.creditCard || null,
                transactions: client.transactions || []
            };
            console.log('📋 Convirtiendo datos de nuevo registro local');
        }
    }
    
    if (!clientData) {
        console.log('❌ No se pudieron obtener datos del cliente');
        console.log('=== FIN LOGIN FALLIDO ===');
        return false;
    }

    console.log('✅ Credenciales CORRECTAS - Login exitoso');
    
    console.log('🎯 Datos cargados:', {
        user: username,
        accountBalance: clientData.account ? clientData.account.balance : 'N/A',
        creditBalance: clientData.creditCard ? clientData.creditCard.currentBalance : 'NO CARD'
    });
    
    // PASO 3: Guardar sesión
    sessionStorage.setItem('currentUser', username);
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    console.log('✅ Sesión guardada exitosamente');
    console.log('=== FIN LOGIN EXITOSO ===');
    return true;
}

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

// =================== EXPOSICIÓN GLOBAL DE FUNCIONES ===================
// Exponer funciones principales inmediatamente para asegurar disponibilidad
console.log('📤 Exponiendo funciones globales...');

// Función login ya es async, la exponemos directamente
window.login = login;
window.logout = logout;
window.isLoggedIn = isLoggedIn;
window.getCurrentClient = getCurrentClient;

// También exponer funciones bancarias importantes
window.useCreditCard = typeof useCreditCard !== 'undefined' ? useCreditCard : null;
window.requestCreditCard = typeof requestCreditCard !== 'undefined' ? requestCreditCard : null;
window.payCreditCard = typeof payCreditCard !== 'undefined' ? payCreditCard : null;

console.log('✅ Funciones principales expuestas:', {
    login: typeof window.login,
    logout: typeof window.logout,
    isLoggedIn: typeof window.isLoggedIn,
    getCurrentClient: typeof window.getCurrentClient,
    useCreditCard: typeof window.useCreditCard
});

// Verificar disponibilidad de dependencias
console.log('🔍 Verificando dependencias:', {
    hybridStorage: typeof hybridStorage,
    SupabaseClient: typeof SupabaseClient,
    clientsDatabase: typeof clientsDatabase
});

// =================== FIN EXPOSICIÓN ===================

// Función para generar número de tarjeta aleatorio
function generateCardNumber() {
    const prefix = '4532'; // Visa
    let number = prefix;
    
    for (let i = 0; i < 12; i++) {
        number += Math.floor(Math.random() * 10);
    }
    
    // Formatear con guiones
    return number.replace(/(.{4})/g, '$1-').slice(0, -1);
}

// Función para generar CVV aleatorio
function generateCVV() {
    return Math.floor(Math.random() * 900 + 100).toString();
}

// Función para generar fecha de expiración (2 años desde hoy)
function generateExpiryDate() {
    const now = new Date();
    const expiry = new Date(now.getFullYear() + 2, now.getMonth());
    const month = (expiry.getMonth() + 1).toString().padStart(2, '0');
    const year = expiry.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
}

// Función para solicitar nueva tarjeta
function requestCreditCard() {
    let currentUser = sessionStorage.getItem('currentUser');
    const clientData = getCurrentClient();
    
    if (!currentUser || !clientData) {
        return { success: false, message: 'Error de autenticación' };
    }
    
    // Verificar si ya tiene una tarjeta de crédito
    if (clientData.creditCard !== null) {
        return { success: false, message: 'Ya tienes una tarjeta de crédito activa. Solo puedes tener una tarjeta por cuenta.' };
    }
    
    // Límite de crédito estándar para todas las tarjetas
    const requiredBalance = STANDARD_CREDIT_LIMIT * 0.05; // 5% = Bs. 5,000
    if (clientData.account.balance < requiredBalance) {
        return { 
            success: false, 
            message: `Saldo insuficiente. Necesitas al menos ${formatCurrency(requiredBalance)} en tu cuenta como respaldo para la tarjeta de crédito.` 
        };
    }
    
    // Generar nueva tarjeta estándar (único modelo disponible)
    const newCard = {
        cardId: `CC_${clientData.id.split('_')[1]}_${Date.now()}`,
        cardNumber: generateCardNumber(),
        cardType: 'standard', // Único tipo de tarjeta disponible
        holderName: clientData.name.toUpperCase(),
        expiryDate: generateExpiryDate(),
        cvv: generateCVV(),
        creditLimit: STANDARD_CREDIT_LIMIT,
        currentBalance: 0,
        availableCredit: STANDARD_CREDIT_LIMIT,
        status: 'pending', // Se activará después de "aprobación"
        accountId: clientData.account.accountId
    };
    
    // Asignar la tarjeta al cliente (reemplazar null con la nueva tarjeta)
    clientData.creditCard = newCard;
    
    // Actualizar datos en sessionStorage
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    // Guardar en sistema híbrido (localStorage + Supabase)
    saveCreditCardHybrid(currentUser, clientData);
    
    // Simular activación después de 3 segundos
    setTimeout(() => {
        const updatedClientData = getCurrentClient();
        if (updatedClientData && updatedClientData.creditCard && updatedClientData.creditCard.cardId === newCard.cardId) {
            updatedClientData.creditCard.status = 'active';
            sessionStorage.setItem('clientData', JSON.stringify(updatedClientData));
            
            // Guardar estado activo en sistema híbrido
            saveCreditCardHybrid(currentUser, updatedClientData);
            
            // Actualizar la vista si está disponible
            if (typeof loadCreditCard === 'function') {
                loadCreditCard(updatedClientData.creditCard);
            }
            
            // Mostrar notificación
            if (typeof showNotification === 'function') {
                showNotification('¡Tarjeta activada!', 'Su nueva tarjeta de crédito ha sido aprobada y activada.', 'success');
            }
        }
    }, 3000);
    
    return { success: true, card: newCard };
}

// Función para simular uso de tarjeta de crédito
function useCreditCard(amount, description, cardNumber = null) {
    // Si no se proporciona cardNumber, usar la tarjeta del cliente actual
    if (!cardNumber) {
        const clientData = getCurrentClient();
        
        if (!clientData || !clientData.creditCard) {
            return { success: false, message: 'No tienes tarjeta de crédito activa' };
        }
        
        return processLocalCardPurchase(clientData, amount, description);
    } else {
        // Tarjeta externa - enrutar al banco correspondiente
        return processInterbankPurchase(cardNumber, amount, description);
    }
}

// Procesar compra con tarjeta local (de nuestro banco)
function processLocalCardPurchase(clientData, amount, description) {
    const card = clientData.creditCard;
    
    // Verificar si la tarjeta está activa
    if (card.status !== 'active') {
        return { success: false, message: 'Tu tarjeta de crédito no está activa' };
    }
    
    // Verificar si tiene crédito disponible
    if (card.availableCredit < amount) {
        return { 
            success: false, 
            message: `Monto superior al límite establecido. Límite total: ${formatCurrency(card.creditLimit)}, Disponible: ${formatCurrency(card.availableCredit)}, Solicitado: ${formatCurrency(amount)}` 
        };
    }
    
    // Procesar la transacción con cálculos precisos
    const amountInCents = Math.round(amount * 100);
    const currentBalanceInCents = Math.round(card.currentBalance * 100);
    const availableCreditInCents = Math.round(card.availableCredit * 100);
    
    const newCurrentBalanceInCents = currentBalanceInCents + amountInCents;
    const newAvailableCreditInCents = availableCreditInCents - amountInCents;
    
    card.currentBalance = newCurrentBalanceInCents / 100;
    card.availableCredit = newAvailableCreditInCents / 100;
    
    // Agregar transacción al historial
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
    
    // Actualizar datos en sessionStorage
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    // Guardar en sistema híbrido (localStorage + Supabase)
    let currentUser = sessionStorage.getItem('currentUser');
    saveCreditCardHybrid(currentUser, clientData);
    
    // Guardar transacción individual en Supabase
    saveTransactionHybrid(currentUser, newTransaction);
    
    return { success: true, transaction: newTransaction, updatedCard: card };
}

// Detectar banco por prefijo de tarjeta
function detectBankByCardNumber(cardNumber) {
    const cleanCardNumber = cardNumber.replace(/[\s-]/g, '');
    
    for (const bankKey in BANK_ROUTING) {
        const bank = BANK_ROUTING[bankKey];
        for (const prefix of bank.prefixes) {
            if (cleanCardNumber.startsWith(prefix)) {
                return { bankKey, ...bank };
            }
        }
    }
    
    return null; // Banco no reconocido
}

// Procesar compra con tarjeta de otro banco
async function processInterbankPurchase(cardNumber, amount, description) {
    const targetBank = detectBankByCardNumber(cardNumber);
    
    if (!targetBank) {
        return { 
            success: false, 
            message: 'Tarjeta no reconocida. El número de tarjeta no corresponde a ningún banco del sistema.' 
        };
    }
    
    if (targetBank.bankKey === 'OUR_BANK') {
        // Es de nuestro banco - procesar como transacción local desde POS
        return await processOwnBankCardFromPOS(cardNumber, amount, description);
    }
    
    // Simular llamada a API del banco externo
    return await simulateInterbankAPI(targetBank, cardNumber, amount, description);
}

// Procesar tarjeta de nuestro banco desde POS (punto de venta)
async function processOwnBankCardFromPOS(cardNumber, amount, description) {
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Buscar la tarjeta en nuestra base de datos
    let clientsDatabase;
    
    try {
        // Intentar obtener de localStorage primero
        const storedData = localStorage.getItem('clientsDatabase');
        if (storedData) {
            clientsDatabase = JSON.parse(storedData);
        } else {
            // Si no existe en localStorage, usar la base de datos por defecto
            clientsDatabase = getDefaultClientsDatabase();
            // Guardar en localStorage para próximas consultas
            localStorage.setItem('clientsDatabase', JSON.stringify(clientsDatabase));
        }
    } catch (error) {
        console.error('Error accessing clientsDatabase:', error);
        return { 
            success: false, 
            message: 'Error del sistema. Intente nuevamente.',
            bankName: 'Meridian Banco'
        };
    }
    
    if (!clientsDatabase || typeof clientsDatabase !== 'object') {
        return { 
            success: false, 
            message: 'Error del sistema bancario. Base de datos no disponible.',
            bankName: 'Meridian Banco'
        };
    }
    
    // Buscar cliente por número de tarjeta
    let cardOwner = null;
    let clientKey = null;
    
    // Formatear el número de tarjeta para comparación
    const formattedCardNumber = cardNumber.replace(/[\s-]/g, '').replace(/(.{4})/g, '$1-').slice(0, -1);
    
    for (const [key, client] of Object.entries(clientsDatabase)) {
        if (client.clientData && client.clientData.creditCard && 
            client.clientData.creditCard.cardNumber === formattedCardNumber) {
            cardOwner = client.clientData;
            clientKey = key;
            break;
        }
    }
    
    if (!cardOwner || !cardOwner.creditCard) {
        return { 
            success: false, 
            message: 'Tarjeta no encontrada en nuestro sistema',
            bankName: 'Meridian Banco'
        };
    }
    
    // Verificar estado de la tarjeta
    if (cardOwner.creditCard.status !== 'active') {
        return { 
            success: false, 
            message: 'Tarjeta inactiva o bloqueada',
            bankName: 'Meridian Banco'
        };
    }
    
    // Verificar límite disponible
    if (cardOwner.creditCard.availableCredit < amount) {
        return { 
            success: false, 
            message: `Límite insuficiente. Disponible: ${formatCurrency(cardOwner.creditCard.availableCredit)}`,
            bankName: 'Meridian Banco'
        };
    }
    
    // Procesar transacción (autorización únicamente - la liquidación se hace después)
    const authCode = 'AUTH' + Date.now().toString().slice(-6);
    
    return { 
        success: true, 
        message: 'Transacción autorizada',
        authCode: authCode,
        bankName: 'Meridian Banco',
        availableCredit: cardOwner.creditCard.availableCredit - amount
    };
}

// Simular comunicación con APIs de otros bancos
async function simulateInterbankAPI(bank, cardNumber, amount, description) {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Por ahora simular diferentes respuestas según el banco
    switch (bank.bankKey) {
        case 'BANCO_UNO':
            return simulateBancoUnoResponse(cardNumber, amount);
            
        case 'BANCO_CINCO':
            return simulateBancoCincoResponse(cardNumber, amount);
            
        default:
            return { 
                success: false, 
                message: `Banco ${bank.name} temporalmente fuera de servicio` 
            };
    }
}

// Simular respuestas de Banco Uno
function simulateBancoUnoResponse(cardNumber, amount) {
    const lastDigits = cardNumber.slice(-4);
    
    // Simular diferentes escenarios según los últimos dígitos
    if (lastDigits === '0000') {
        return { success: false, message: 'Tarjeta bloqueada (Banco Uno)' };
    }
    
    if (amount > 50000) {
        return { 
            success: false, 
            message: 'Monto superior al límite diario (Banco Uno)' 
        };
    }
    
    // Simular autorización exitosa
    return {
        success: true,
        message: `Transacción autorizada por Banco Uno`,
        authCode: `UNO${Date.now()}`,
        bankName: 'Banco Uno'
    };
}

// Simular respuestas de Banco Cinco
function simulateBancoCincoResponse(cardNumber, amount) {
    const lastDigits = cardNumber.slice(-4);
    
    // Simular diferentes escenarios
    if (lastDigits === '1111') {
        return { success: false, message: 'Fondos insuficientes (Banco Cinco)' };
    }
    
    if (amount > 75000) {
        return { 
            success: false, 
            message: 'Monto superior al límite autorizado (Banco Cinco)' 
        };
    }
    
    return {
        success: true,
        message: `Transacción autorizada por Banco Cinco`,
        authCode: `CINCO${Date.now()}`,
        bankName: 'Banco Cinco'
    };
}

// Función para pagar tarjeta de crédito
function payCreditCard(amount) {
    const clientData = getCurrentClient();
    
    if (!clientData || !clientData.creditCard) {
        return { success: false, message: 'No tienes tarjeta de crédito activa' };
    }
    
    if (clientData.account.balance < amount) {
        return { success: false, message: 'Saldo insuficiente en la cuenta' };
    }
    
    if (amount > clientData.creditCard.currentBalance) {
        return { 
            success: false, 
            message: `No puedes pagar más de lo que debes. Deuda actual: ${formatCurrency(clientData.creditCard.currentBalance)}` 
        };
    }
    
    // Procesar el pago con cálculos precisos
    // Convertir a centavos para evitar errores de punto flotante
    const amountInCents = Math.round(amount * 100);
    const accountBalanceInCents = Math.round(clientData.account.balance * 100);
    const currentBalanceInCents = Math.round(clientData.creditCard.currentBalance * 100);
    const availableCreditInCents = Math.round(clientData.creditCard.availableCredit * 100);
    
    // Realizar operaciones en centavos
    const newAccountBalanceInCents = accountBalanceInCents - amountInCents;
    const newCurrentBalanceInCents = currentBalanceInCents - amountInCents;
    const newAvailableCreditInCents = availableCreditInCents + amountInCents;
    
    // Convertir de vuelta a bolívares
    clientData.account.balance = newAccountBalanceInCents / 100;
    clientData.creditCard.currentBalance = newCurrentBalanceInCents / 100;
    clientData.creditCard.availableCredit = newAvailableCreditInCents / 100;
    
    // Agregar transacción al historial
    const newTransaction = {
        id: `TXN_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: 'Pago de tarjeta de crédito',
        amount: -amount, // Negativo porque sale de la cuenta
        type: 'Pago TDC',
        reference: `PAY-${Date.now()}`,
        accountId: clientData.account.accountId
    };
    
    clientData.transactions.unshift(newTransaction);
    
    // Actualizar datos en sessionStorage
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    // Guardar en sistema híbrido (localStorage + Supabase)
    let currentUser = sessionStorage.getItem('currentUser');
    saveCreditCardHybrid(currentUser, clientData);
    
    // Guardar transacción individual en Supabase
    saveTransactionHybrid(currentUser, newTransaction);
    
    // Debug: Verificar que los datos se guardaron correctamente
    let currentUser = sessionStorage.getItem('currentUser');
    const verificationKey = `bankData_${currentUser}`;
    const savedData = localStorage.getItem(verificationKey);
    console.log('Datos guardados después del pago:', {
        user: currentUser,
        newAccountBalance: clientData.account.balance,
        newCreditBalance: clientData.creditCard.currentBalance,
        savedInLocalStorage: savedData ? 'SÍ' : 'NO',
        timestamp: new Date().toISOString()
    });
    
    return { success: true, transaction: newTransaction };
}

// Función para formatear moneda
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2
    }).format(amount);
}

// Función para formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Función de debug para verificar persistencia
function debugPersistence(username) {
    const key = `bankData_${username}`;
    const data = localStorage.getItem(key);
    const sessionData = sessionStorage.getItem('clientData');
    
    console.log('=== DEBUG PERSISTENCE ===');
    console.log('Usuario:', username);
    console.log('localStorage key:', key);
    console.log('Hay datos en localStorage:', data ? 'SÍ' : 'NO');
    console.log('Hay datos en sessionStorage:', sessionData ? 'SÍ' : 'NO');
    
    if (data) {
        try {
            const parsed = JSON.parse(data);
            console.log('Datos en localStorage:', {
                balance: parsed.account.balance,
                creditBalance: parsed.creditCard ? parsed.creditCard.currentBalance : 'NO CARD',
                availableCredit: parsed.creditCard ? parsed.creditCard.availableCredit : 'NO CARD'
            });
        } catch (e) {
            console.log('Error parsing localStorage data:', e);
        }
    }
    
    if (sessionData) {
        try {
            const parsed = JSON.parse(sessionData);
            console.log('Datos en sessionStorage:', {
                balance: parsed.account.balance,
                creditBalance: parsed.creditCard ? parsed.creditCard.currentBalance : 'NO CARD',
                availableCredit: parsed.creditCard ? parsed.creditCard.availableCredit : 'NO CARD'
            });
        } catch (e) {
            console.log('Error parsing sessionStorage data:', e);
        }
    }
    console.log('========================');
}

// Función para guardar tarjetas de crédito en sistema híbrido
async function saveCreditCardHybrid(username, clientData) {
    try {
        // Guardar en localStorage (compatibilidad y velocidad)
        updatePersistentData();
        
        // Guardar en Supabase si está disponible
        if (typeof hybridStorage !== 'undefined') {
            await hybridStorage.saveClient(username, {
                password: clientData.password || 'temp', // Temporal si no tenemos la contraseña
                usuario: username,
                clientData: clientData
            });
            console.log(`✅ Tarjeta de crédito guardada en sistema híbrido para ${username}`);
        } else {
            console.log('⚠️ Sistema híbrido no disponible, guardado solo en localStorage');
        }
    } catch (error) {
        console.error('❌ Error guardando tarjeta en sistema híbrido:', error);
        // Fallback: asegurar que al menos esté en localStorage
        updatePersistentData();
    }
}

// Función para guardar transacciones individuales en Supabase
async function saveTransactionHybrid(username, transaction) {
    try {
        // Guardar en Supabase si está disponible
        if (typeof saveTransactionToSupabase !== 'undefined') {
            await saveTransactionToSupabase(username, transaction);
        } else {
            console.log('⚠️ Función de transacciones no disponible');
        }
    } catch (error) {
        console.error('❌ Error guardando transacción en sistema híbrido:', error);
    }
}

// Exponer función de debug
window.debugPersistence = debugPersistence;
console.log('🔧 Función de debug expuesta');

console.log('🎯 Archivo auth.js cargado completamente');

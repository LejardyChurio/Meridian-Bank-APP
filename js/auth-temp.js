// Sistema de autenticaciÃ³n y gestiÃ³n de datos del banco

// ConfiguraciÃ³n del sistema bancario
const STANDARD_CREDIT_LIMIT = 100000; // Bs. 100,000 - LÃ­mite estÃ¡ndar para todas las tarjetas

// ConfiguraciÃ³n de enrutamiento interbancario (CONTRATO COMUNICACIONAL)
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

// CÃ³digos de error estÃ¡ndar del contrato comunicacional
const STANDARD_ERROR_CODES = {
    CLIENT_NOT_FOUND: {
        code: "IERROR_1001",
        message: "Error: No se encontrÃ³ ningÃºn cliente afiliado con el cÃ³digo identificador provisto."
    },
    CARD_ERROR: {
        code: "IERROR_1002", 
        message: "Error: {descripciÃ³n especÃ­fica del banco emisor}"
    },
    CARD_INACTIVE: {
        code: "IERROR_1003",
        message: "Error: Su tarjeta se encuentra inoperativa, por favor dirÃ­jase a su banco."
    },
    CREDIT_LIMIT_EXCEEDED: {
        code: "IERROR_1004",
        message: "Error: Usted ha sobrepasado su lÃ­mite de crÃ©dito."
    },
    CARD_NOT_FOUND: {
        code: "IERROR_1005",
        message: "Error: No se encontrÃ³ ninguna tarjeta con los datos provistos."
    }
};

// Base de datos simulada de clientes - SerÃ¡ migrada a localStorage si existe
let clientsDatabase = {
    'cliente1': {
        id: 'cliente1',
        tipoDocumento: 'V',
        documento: '12345678',
        password: '1234',
        nombres: 'Juan Carlos',
        apellidos: 'PÃ©rez GarcÃ­a',
        email: 'juan.perez@email.com',
        telefono: '0414-123-4567',
        ciudad: 'Caracas',
        usuario: 'cliente1',
        saldoCuenta: 125000,
        fechaRegistro: '2024-01-15T10:30:00.000Z',
        estado: 'activo',
        clientData: {
            id: 'CLI_001',
            name: 'Juan Carlos PÃ©rez GarcÃ­a',
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
            // MÃ¡ximo UNA tarjeta de crÃ©dito asociada a la cuenta
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
                    description: 'Compra con tarjeta de crÃ©dito',
                    amount: -1500.50,
                    type: 'Tarjeta de CrÃ©dito',
                    reference: 'TDC-001',
                    accountId: 'ACC_001_001'
                },
                {
                    id: 'TXN_002',
                    date: '2025-11-09',
                    description: 'DepÃ³sito en efectivo',
                    amount: 5000.00,
                    type: 'CrÃ©dito',
                    reference: 'DEP-001',
                    accountId: 'ACC_001_001'
                },
                {
                    id: 'TXN_003',
                    date: '2025-11-08',
                    description: 'Pago de tarjeta de crÃ©dito',
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
            name: 'MarÃ­a Elena RodrÃ­guez',
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
            // Cliente con tarjeta de crÃ©dito ya activa
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
                    description: 'Compra con tarjeta de crÃ©dito',
                    amount: -890.75,
                    type: 'Tarjeta de CrÃ©dito',
                    reference: 'TDC-002',
                    accountId: 'ACC_002_001'
                },
                {
                    id: 'TXN_005',
                    date: '2025-11-09',
                    description: 'Transferencia recibida',
                    amount: 3000.00,
                    type: 'CrÃ©dito',
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
            name: 'Carlos Alberto GÃ³mez',
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
            // Cliente SIN tarjeta de crÃ©dito (puede solicitar una)
            creditCard: null,
            transactions: [
                {
                    id: 'TXN_006',
                    date: '2025-11-10',
                    description: 'Pago servicios pÃºblicos',
                    amount: -1200.50,
                    type: 'DÃ©bito',
                    reference: 'SRV-001',
                    accountId: 'ACC_003_001'
                },
                {
                    id: 'TXN_007',
                    date: '2025-11-09',
                    description: 'Salario depositado',
                    amount: 2500.75,
                    type: 'CrÃ©dito',
                    reference: 'SAL-001',
                    accountId: 'ACC_003_001'
                }
            ]
        }
    }
};

// FunciÃ³n para obtener la base de datos por defecto
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

// FunciÃ³n para inicializar la base de datos PRESERVANDO usuarios de prueba
function initializeClientsDatabaseIfNeeded() {
    console.log('ðŸ”„ Inicializando base de datos...');
    
    // PASO 1: Preservar usuarios de prueba originales
    const originalTestUsers = {
        'cliente1': clientsDatabase['cliente1'],
        'cliente2': clientsDatabase['cliente2'], 
        'cliente3': clientsDatabase['cliente3']
    };
    
    console.log('ðŸ” Usuarios de prueba originales:', Object.keys(originalTestUsers));
    
    // PASO 2: Cargar datos existentes de localStorage
    const savedClients = localStorage.getItem('clientsDatabase');
    let existingClients = {};
    
    if (savedClients) {
        try {
            existingClients = JSON.parse(savedClients);
            console.log('ðŸ’¾ Datos cargados de localStorage:', Object.keys(existingClients));
        } catch (error) {
            console.error('âŒ Error al cargar localStorage:', error);
            existingClients = {};
        }
    }
    
    // PASO 3: Combinar SIEMPRE poniendo usuarios de prueba primero
    clientsDatabase = {
        ...existingClients,    // Usuarios registrados
        ...originalTestUsers   // Usuarios de prueba (tienen prioridad)
    };
    
    console.log('âœ… Base de datos final:', Object.keys(clientsDatabase));
    
    // PASO 4: Guardar en localStorage
    localStorage.setItem('clientsDatabase', JSON.stringify(clientsDatabase));
    
    console.log('ðŸ InicializaciÃ³n completada');
}

// Inicializar automÃ¡ticamente cuando se carga el archivo
document.addEventListener('DOMContentLoaded', function() {
    initializeClientsDatabaseIfNeeded();
    console.log('ðŸ”„ Base de datos inicializada al cargar la pÃ¡gina');
});

initializeClientsDatabaseIfNeeded();

// Funciones de autenticaciÃ³n
async function login(username, password) {
    console.log('=== INICIO LOGIN ===');
    console.log('Usuario:', username, 'Password:', password);

    // PASO 1: Intentar cargar usuario desde sistema hÃ­brido (Supabase PRIMERO)
    let clientData = null;
    
    // Usar sistema hÃ­brido para cargar usuario (Supabase primero, localStorage fallback)
    if (typeof hybridStorage !== 'undefined') {
        try {
            clientData = await hybridStorage.loadClient(username);
            console.log('ðŸ” Cliente cargado desde sistema hÃ­brido:', clientData ? 'âœ… ENCONTRADO' : 'âŒ NO ENCONTRADO');
        } catch (error) {
            console.warn('âš ï¸ Error en sistema hÃ­brido:', error);
        }
    }
    
    // PASO 2: Si no se encontrÃ³ en hÃ­brido, buscar en base local (fallback)
    if (!clientData) {
        console.log('ðŸ“± Buscando en base de datos local...');
        initializeClientsDatabaseIfNeeded();
        
        let client = null;
        let foundBy = '';
        
        // Buscar por key directa (usuarios de prueba)
        if (clientsDatabase[username]) {
            client = clientsDatabase[username];
            foundBy = 'key';
            console.log('âœ… Usuario encontrado por KEY:', username);
        }
        // Buscar por campo usuario (nuevos registros)
        else {
            client = Object.values(clientsDatabase).find(c => c.usuario === username);
            if (client) {
                foundBy = 'field';
                console.log('âœ… Usuario encontrado por CAMPO usuario:', username);
            }
        }
        
        if (!client) {
            console.log('âŒ Usuario NO encontrado en ningÃºn lado');
            console.log('Disponibles en localStorage:', Object.keys(clientsDatabase));
            console.log('=== FIN LOGIN FALLIDO ===');
            return false;
        }
        
        // Verificar contraseÃ±a para usuarios locales
        console.log('ðŸ” Password en BD local:', client.password, '(tipo:', typeof client.password, ')');
        console.log('ðŸ” Password input:', password, '(tipo:', typeof password, ')');
        
        if (String(client.password) !== String(password)) {
            console.log('âŒ ContraseÃ±a incorrecta');
            console.log('=== FIN LOGIN FALLIDO ===');
            return false;
        }
        
        // Convertir datos locales al formato estÃ¡ndar
        if (client.clientData) {
            clientData = client.clientData;
            console.log('ðŸ“‹ Usando datos de usuario de prueba local');
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
            console.log('ðŸ“‹ Convirtiendo datos de nuevo registro local');
        }
    }
    
    if (!clientData) {
        console.log('âŒ No se pudieron obtener datos del cliente');
        console.log('=== FIN LOGIN FALLIDO ===');
        return false;
    }

    console.log('âœ… Credenciales CORRECTAS - Login exitoso');
    
    console.log('ðŸŽ¯ Datos cargados:', {
        user: username,
        accountBalance: clientData.account ? clientData.account.balance : 'N/A',
        creditBalance: clientData.creditCard ? clientData.creditCard.currentBalance : 'NO CARD'
    });
    
    // PASO 3: Guardar sesiÃ³n
    sessionStorage.setItem('currentUser', username);
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    console.log('âœ… SesiÃ³n guardada exitosamente');
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

// =================== EXPOSICIÃ“N GLOBAL DE FUNCIONES ===================
// Exponer funciones principales inmediatamente para asegurar disponibilidad
console.log('ðŸ“¤ Exponiendo funciones globales...');

// FunciÃ³n login ya es async, la exponemos directamente
window.login = login;
window.logout = logout;
window.isLoggedIn = isLoggedIn;
window.getCurrentClient = getCurrentClient;

// TambiÃ©n exponer funciones bancarias importantes
window.useCreditCard = typeof useCreditCard !== 'undefined' ? useCreditCard : null;
window.requestCreditCard = typeof requestCreditCard !== 'undefined' ? requestCreditCard : null;
window.payCreditCard = typeof payCreditCard !== 'undefined' ? payCreditCard : null;

console.log('âœ… Funciones principales expuestas:', {
    login: typeof window.login,
    logout: typeof window.logout,
    isLoggedIn: typeof window.isLoggedIn,
    getCurrentClient: typeof window.getCurrentClient,
    useCreditCard: typeof window.useCreditCard
});

// Verificar disponibilidad de dependencias
console.log('ðŸ” Verificando dependencias:', {
    hybridStorage: typeof hybridStorage,
    SupabaseClient: typeof SupabaseClient,
    clientsDatabase: typeof clientsDatabase
});

// =================== FIN EXPOSICIÃ“N ===================

// FunciÃ³n para generar nÃºmero de tarjeta aleatorio
function generateCardNumber() {
    const prefix = '4532'; // Visa
    let number = prefix;
    
    for (let i = 0; i < 12; i++) {
        number += Math.floor(Math.random() * 10);
    }
    
    // Formatear con guiones
    return number.replace(/(.{4})/g, '$1-').slice(0, -1);
}

// FunciÃ³n para generar CVV aleatorio
function generateCVV() {
    return Math.floor(Math.random() * 900 + 100).toString();
}

// FunciÃ³n para generar fecha de expiraciÃ³n (2 aÃ±os desde hoy)
function generateExpiryDate() {
    const now = new Date();
    const expiry = new Date(now.getFullYear() + 2, now.getMonth());
    const month = (expiry.getMonth() + 1).toString().padStart(2, '0');
    const year = expiry.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
}

// FunciÃ³n para solicitar nueva tarjeta
function requestCreditCard() {
    const currentUser = sessionStorage.getItem('currentUser');
    const clientData = getCurrentClient();
    
    if (!currentUser || !clientData) {
        return { success: false, message: 'Error de autenticaciÃ³n' };
    }
    
    // Verificar si ya tiene una tarjeta de crÃ©dito
    if (clientData.creditCard !== null) {
        return { success: false, message: 'Ya tienes una tarjeta de crÃ©dito activa. Solo puedes tener una tarjeta por cuenta.' };
    }
    
    // LÃ­mite de crÃ©dito estÃ¡ndar para todas las tarjetas
    const requiredBalance = STANDARD_CREDIT_LIMIT * 0.05; // 5% = Bs. 5,000
    if (clientData.account.balance < requiredBalance) {
        return { 
            success: false, 
            message: `Saldo insuficiente. Necesitas al menos ${formatCurrency(requiredBalance)} en tu cuenta como respaldo para la tarjeta de crÃ©dito.` 
        };
    }
    
    // Generar nueva tarjeta estÃ¡ndar (Ãºnico modelo disponible)
    const newCard = {
        cardId: `CC_${clientData.id.split('_')[1]}_${Date.now()}`,
        cardNumber: generateCardNumber(),
        cardType: 'standard', // Ãšnico tipo de tarjeta disponible
        holderName: clientData.name.toUpperCase(),
        expiryDate: generateExpiryDate(),
        cvv: generateCVV(),
        creditLimit: STANDARD_CREDIT_LIMIT,
        currentBalance: 0,
        availableCredit: STANDARD_CREDIT_LIMIT,
        status: 'pending', // Se activarÃ¡ despuÃ©s de "aprobaciÃ³n"
        accountId: clientData.account.accountId
    };
    
    // Asignar la tarjeta al cliente (reemplazar null con la nueva tarjeta)
    clientData.creditCard = newCard;
    
    // Actualizar datos en sessionStorage
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    // Guardar en sistema hÃ­brido (localStorage + Supabase)
    saveCreditCardHybrid(currentUser, clientData);
    
    // Simular activaciÃ³n despuÃ©s de 3 segundos
    setTimeout(() => {
        const updatedClientData = getCurrentClient();
        if (updatedClientData && updatedClientData.creditCard && updatedClientData.creditCard.cardId === newCard.cardId) {
            updatedClientData.creditCard.status = 'active';
            sessionStorage.setItem('clientData', JSON.stringify(updatedClientData));
            
            // Guardar estado activo en sistema hÃ­brido
            saveCreditCardHybrid(currentUser, updatedClientData);
            
            // Actualizar la vista si estÃ¡ disponible
            if (typeof loadCreditCard === 'function') {
                loadCreditCard(updatedClientData.creditCard);
            }
            
            // Mostrar notificaciÃ³n
            if (typeof showNotification === 'function') {
                showNotification('Â¡Tarjeta activada!', 'Su nueva tarjeta de crÃ©dito ha sido aprobada y activada.', 'success');
            }
        }
    }, 3000);
    
    return { success: true, card: newCard };
}

// FunciÃ³n para simular uso de tarjeta de crÃ©dito
function useCreditCard(amount, description, cardNumber = null) {
    // Si no se proporciona cardNumber, usar la tarjeta del cliente actual
    if (!cardNumber) {
        const clientData = getCurrentClient();
        
        if (!clientData || !clientData.creditCard) {
            return { success: false, message: 'No tienes tarjeta de crÃ©dito activa' };
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
    
    // Verificar si la tarjeta estÃ¡ activa
    if (card.status !== 'active') {
        return { success: false, message: 'Tu tarjeta de crÃ©dito no estÃ¡ activa' };
    }
    
    // Verificar si tiene crÃ©dito disponible
    if (card.availableCredit < amount) {
        return { 
            success: false, 
            message: `Monto superior al lÃ­mite establecido. LÃ­mite total: ${formatCurrency(card.creditLimit)}, Disponible: ${formatCurrency(card.availableCredit)}, Solicitado: ${formatCurrency(amount)}` 
        };
    }
    
    // Procesar la transacciÃ³n con cÃ¡lculos precisos
    const amountInCents = Math.round(amount * 100);
    const currentBalanceInCents = Math.round(card.currentBalance * 100);
    const availableCreditInCents = Math.round(card.availableCredit * 100);
    
    const newCurrentBalanceInCents = currentBalanceInCents + amountInCents;
    const newAvailableCreditInCents = availableCreditInCents - amountInCents;
    
    card.currentBalance = newCurrentBalanceInCents / 100;
    card.availableCredit = newAvailableCreditInCents / 100;
    
    // Agregar transacciÃ³n al historial
    const newTransaction = {
        id: `TXN_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: description || 'Compra con tarjeta de crÃ©dito',
        amount: -amount,
        type: 'Tarjeta de CrÃ©dito',
        reference: `TDC-${Date.now()}`,
        accountId: clientData.account.accountId
    };
    
    clientData.transactions.unshift(newTransaction);
    
    // Actualizar datos en sessionStorage
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    // Guardar en sistema hÃ­brido (localStorage + Supabase)
    const currentUser = sessionStorage.getItem('currentUser');
    saveCreditCardHybrid(currentUser, clientData);
    
    // Guardar transacciÃ³n individual en Supabase
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
            message: 'Tarjeta no reconocida. El nÃºmero de tarjeta no corresponde a ningÃºn banco del sistema.' 
        };
    }
    
    if (targetBank.bankKey === 'OUR_BANK') {
        // Es de nuestro banco - procesar como transacciÃ³n local desde POS
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
            // Guardar en localStorage para prÃ³ximas consultas
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
    
    // Buscar cliente por nÃºmero de tarjeta
    let cardOwner = null;
    let clientKey = null;
    
    // Formatear el nÃºmero de tarjeta para comparaciÃ³n
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
    
    // Verificar lÃ­mite disponible
    if (cardOwner.creditCard.availableCredit < amount) {
        return { 
            success: false, 
            message: `LÃ­mite insuficiente. Disponible: ${formatCurrency(cardOwner.creditCard.availableCredit)}`,
            bankName: 'Meridian Banco'
        };
    }
    
    // Procesar transacciÃ³n (autorizaciÃ³n Ãºnicamente - la liquidaciÃ³n se hace despuÃ©s)
    const authCode = 'AUTH' + Date.now().toString().slice(-6);
    
    return { 
        success: true, 
        message: 'TransacciÃ³n autorizada',
        authCode: authCode,
        bankName: 'Meridian Banco',
        availableCredit: cardOwner.creditCard.availableCredit - amount
    };
}

// Simular comunicaciÃ³n con APIs de otros bancos
async function simulateInterbankAPI(bank, cardNumber, amount, description) {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Por ahora simular diferentes respuestas segÃºn el banco
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
    
    // Simular diferentes escenarios segÃºn los Ãºltimos dÃ­gitos
    if (lastDigits === '0000') {
        return { success: false, message: 'Tarjeta bloqueada (Banco Uno)' };
    }
    
    if (amount > 50000) {
        return { 
            success: false, 
            message: 'Monto superior al lÃ­mite diario (Banco Uno)' 
        };
    }
    
    // Simular autorizaciÃ³n exitosa
    return {
        success: true,
        message: `TransacciÃ³n autorizada por Banco Uno`,
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
            message: 'Monto superior al lÃ­mite autorizado (Banco Cinco)' 
        };
    }
    
    return {
        success: true,
        message: `TransacciÃ³n autorizada por Banco Cinco`,
        authCode: `CINCO${Date.now()}`,
        bankName: 'Banco Cinco'
    };
}

// FunciÃ³n para pagar tarjeta de crÃ©dito
function payCreditCard(amount) {
    const clientData = getCurrentClient();
    
    if (!clientData || !clientData.creditCard) {
        return { success: false, message: 'No tienes tarjeta de crÃ©dito activa' };
    }
    
    if (clientData.account.balance < amount) {
        return { success: false, message: 'Saldo insuficiente en la cuenta' };
    }
    
    if (amount > clientData.creditCard.currentBalance) {
        return { 
            success: false, 
            message: `No puedes pagar mÃ¡s de lo que debes. Deuda actual: ${formatCurrency(clientData.creditCard.currentBalance)}` 
        };
    }
    
    // Procesar el pago con cÃ¡lculos precisos
    // Convertir a centavos para evitar errores de punto flotante
    const amountInCents = Math.round(amount * 100);
    const accountBalanceInCents = Math.round(clientData.account.balance * 100);
    const currentBalanceInCents = Math.round(clientData.creditCard.currentBalance * 100);
    const availableCreditInCents = Math.round(clientData.creditCard.availableCredit * 100);
    
    // Realizar operaciones en centavos
    const newAccountBalanceInCents = accountBalanceInCents - amountInCents;
    const newCurrentBalanceInCents = currentBalanceInCents - amountInCents;
    const newAvailableCreditInCents = availableCreditInCents + amountInCents;
    
    // Convertir de vuelta a bolÃ­vares
    clientData.account.balance = newAccountBalanceInCents / 100;
    clientData.creditCard.currentBalance = newCurrentBalanceInCents / 100;
    clientData.creditCard.availableCredit = newAvailableCreditInCents / 100;
    
    // Agregar transacciÃ³n al historial
    const newTransaction = {
        id: `TXN_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: 'Pago de tarjeta de crÃ©dito',
        amount: -amount, // Negativo porque sale de la cuenta
        type: 'Pago TDC',
        reference: `PAY-${Date.now()}`,
        accountId: clientData.account.accountId
    };
    
    clientData.transactions.unshift(newTransaction);
    
    // Actualizar datos en sessionStorage
    sessionStorage.setItem('clientData', JSON.stringify(clientData));
    
    // Guardar en sistema hÃ­brido (localStorage + Supabase)
    const currentUser = sessionStorage.getItem('currentUser');
    saveCreditCardHybrid(currentUser, clientData);
    
    // Guardar transacciÃ³n individual en Supabase
    saveTransactionHybrid(currentUser, newTransaction);
    
    // Debug: Verificar que los datos se guardaron correctamente
    const currentUser = sessionStorage.getItem('currentUser');
    const verificationKey = `bankData_${currentUser}`;
    const savedData = localStorage.getItem(verificationKey);
    console.log('Datos guardados despuÃ©s del pago:', {
        user: currentUser,
        newAccountBalance: clientData.account.balance,
        newCreditBalance: clientData.creditCard.currentBalance,
        savedInLocalStorage: savedData ? 'SÃ' : 'NO',
        timestamp: new Date().toISOString()
    });
    
    return { success: true, transaction: newTransaction };
}

// FunciÃ³n para formatear moneda
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2
    }).format(amount);
}

// FunciÃ³n para formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// FunciÃ³n de debug para verificar persistencia
function debugPersistence(username) {
    const key = `bankData_${username}`;
    const data = localStorage.getItem(key);
    const sessionData = sessionStorage.getItem('clientData');
    
    console.log('=== DEBUG PERSISTENCE ===');
    console.log('Usuario:', username);
    console.log('localStorage key:', key);
    console.log('Hay datos en localStorage:', data ? 'SÃ' : 'NO');
    console.log('Hay datos en sessionStorage:', sessionData ? 'SÃ' : 'NO');
    
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

// FunciÃ³n para guardar tarjetas de crÃ©dito en sistema hÃ­brido
async function saveCreditCardHybrid(username, clientData) {
    try {
        // Guardar en localStorage (compatibilidad y velocidad)
        updatePersistentData();
        
        // Guardar en Supabase si estÃ¡ disponible
        if (typeof hybridStorage !== 'undefined') {
            await hybridStorage.saveClient(username, {
                password: clientData.password || 'temp', // Temporal si no tenemos la contraseÃ±a
                usuario: username,
                clientData: clientData
            });
            console.log(`âœ… Tarjeta de crÃ©dito guardada en sistema hÃ­brido para ${username}`);
        } else {
            console.log('âš ï¸ Sistema hÃ­brido no disponible, guardado solo en localStorage');
        }
    } catch (error) {
        console.error('âŒ Error guardando tarjeta en sistema hÃ­brido:', error);
        // Fallback: asegurar que al menos estÃ© en localStorage
        updatePersistentData();
    }
}

// FunciÃ³n para guardar transacciones individuales en Supabase
async function saveTransactionHybrid(username, transaction) {
    try {
        // Guardar en Supabase si estÃ¡ disponible
        if (typeof saveTransactionToSupabase !== 'undefined') {
            await saveTransactionToSupabase(username, transaction);
        } else {
            console.log('âš ï¸ FunciÃ³n de transacciones no disponible');
        }
    } catch (error) {
        console.error('âŒ Error guardando transacciÃ³n en sistema hÃ­brido:', error);
    }
}

// Exponer funciÃ³n de debug
window.debugPersistence = debugPersistence;
console.log('ðŸ”§ FunciÃ³n de debug expuesta');

console.log('ðŸŽ¯ Archivo auth.js cargado completamente');

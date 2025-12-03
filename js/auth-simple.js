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
                name: 'Cliente Uno',
                email: 'cliente1@test.com',
                phone: '+58424000001',
                account: {
                    accountId: 'ACC_001',
                    accountNumber: '12345678',
                    accountType: 'Ahorros',
                    balance: 10000.00,
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
                name: 'Cliente Dos',
                email: 'cliente2@test.com',
                phone: '+58424000002',
                account: {
                    accountId: 'ACC_002',
                    accountNumber: '87654321',
                    accountType: 'Ahorros',
                    balance: 15000.00,
                    currency: 'VES'
                },
                creditCard: null,
                transactions: []
            }
        }
    };
    console.log('✅ Base de datos básica inicializada');
}

// Función de login simplificada
async function login(username, password) {
    console.log('=== INICIO LOGIN SIMPLIFICADO ===');
    console.log('Usuario:', username, 'Password:', password);
    
    // Inicializar base de datos si no existe
    if (!clientsDatabase || Object.keys(clientsDatabase).length === 0) {
        initializeBasicDatabase();
    }
    
    // Buscar usuario
    const client = clientsDatabase[username];
    
    if (!client) {
        console.log('❌ Usuario no encontrado');
        return false;
    }
    
    // Verificar contraseña
    if (String(client.password) !== String(password)) {
        console.log('❌ Contraseña incorrecta');
        return false;
    }
    
    console.log('✅ Login exitoso');
    
    // Guardar sesión
    sessionStorage.setItem('currentUser', username);
    sessionStorage.setItem('clientData', JSON.stringify(client.clientData));
    
    return true;
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

console.log('🎯 Auth.js simplificado cargado completamente');
// ===================================================
// CONFIGURACIÓN SUPABASE - MERIDIAN BANCO
// ===================================================

// Credenciales de Supabase
const SUPABASE_CONFIG = {
    url: 'https://kvbgtjbxycqaqcymbdyk.supabase.co',
    anonKey: 'sb_publishable_cj6W2dC47fry7sjzlFHjVg_7GQGlEFi'
};

// Cliente Supabase (se inicializa cuando se cargue la librería)
let supabaseClient = null;

// Configuración del modo de base de datos
const DATABASE_CONFIG = {
    // Cambiar a true para usar Supabase, false para localStorage
    USE_SUPABASE: false, // Empezar con false para migración gradual
    FALLBACK_TO_LOCALSTORAGE: true // Si falla Supabase, usar localStorage
};

// Función para inicializar Supabase cuando esté listo
function initializeSupabase() {
    try {
        // Para Supabase v1
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase v1 inicializado correctamente');
            return true;
        }
        // Para Supabase v2
        else if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase v2 inicializado correctamente');
            return true;
        } 
        // Para imports ES6
        else if (typeof createClient !== 'undefined') {
            supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase ES6 inicializado correctamente');
            return true;
        } else {
            console.log('⚠️ Librería Supabase no encontrada');
            console.log('Window keys:', typeof window !== 'undefined' ? Object.keys(window).filter(k => k.toLowerCase().includes('supabase')).join(', ') : 'N/A');
            console.log('Global supabase:', typeof supabase);
            console.log('Global createClient:', typeof createClient);
            return false;
        }
    } catch (error) {
        console.error('❌ Error inicializando Supabase:', error);
        return false;
    }
}

// Clase wrapper para manejar datos híbridos (localStorage + Supabase)
class DatabaseManager {
    constructor() {
        this.useSupabase = DATABASE_CONFIG.USE_SUPABASE;
        this.fallback = DATABASE_CONFIG.FALLBACK_TO_LOCALSTORAGE;
    }

    // Método para cambiar entre localStorage y Supabase
    toggleDatabase(useSupabase) {
        this.useSupabase = useSupabase;
        DATABASE_CONFIG.USE_SUPABASE = useSupabase;
        console.log(`🔄 Cambiado a: ${useSupabase ? 'Supabase' : 'localStorage'}`);
    }

    // Obtener cliente por username
    async getClient(username) {
        if (this.useSupabase && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('clients')
                    .select('*')
                    .eq('username', username)
                    .single();

                if (error) {
                    if (this.fallback) {
                        console.log('⚠️ Fallback a localStorage para getClient');
                        return this.getClientFromLocalStorage(username);
                    }
                    throw error;
                }

                return this.convertSupabaseToLocalFormat(data);
            } catch (error) {
                console.error('❌ Error obteniendo cliente de Supabase:', error);
                if (this.fallback) {
                    return this.getClientFromLocalStorage(username);
                }
                return null;
            }
        } else {
            return this.getClientFromLocalStorage(username);
        }
    }

    // Obtener cliente de localStorage (método actual)
    getClientFromLocalStorage(username) {
        try {
            const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
            return clientsDatabase[username] || null;
        } catch (error) {
            console.error('❌ Error obteniendo cliente de localStorage:', error);
            return null;
        }
    }

    // Guardar cliente
    async saveClient(username, clientData) {
        // Siempre guardar en localStorage como backup
        this.saveClientToLocalStorage(username, clientData);

        if (this.useSupabase && supabaseClient) {
            try {
                const supabaseData = this.convertLocalToSupabaseFormat(clientData);
                
                // Verificar si el cliente ya existe
                const { data: existing } = await supabaseClient
                    .from('clients')
                    .select('id')
                    .eq('username', username)
                    .single();

                if (existing) {
                    // Actualizar cliente existente
                    const { error } = await supabaseClient
                        .from('clients')
                        .update(supabaseData)
                        .eq('username', username);

                    if (error) throw error;
                } else {
                    // Insertar nuevo cliente
                    const { error } = await supabaseClient
                        .from('clients')
                        .insert([supabaseData]);

                    if (error) throw error;
                }

                console.log('✅ Cliente guardado en Supabase');
                return true;
            } catch (error) {
                console.error('❌ Error guardando en Supabase:', error);
                console.log('✅ Cliente guardado solo en localStorage (fallback)');
                return false;
            }
        }

        return true;
    }

    // Guardar en localStorage (método actual)
    saveClientToLocalStorage(username, clientData) {
        try {
            const clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
            clientsDatabase[username] = clientData;
            localStorage.setItem('clientsDatabase', JSON.stringify(clientsDatabase));
        } catch (error) {
            console.error('❌ Error guardando en localStorage:', error);
        }
    }

    // Convertir formato Supabase a localStorage
    convertSupabaseToLocalFormat(supabaseData) {
        return {
            password: supabaseData.password_hash,
            usuario: supabaseData.username,
            clientData: {
                id: supabaseData.id,
                name: `${supabaseData.nombres} ${supabaseData.apellidos}`,
                email: supabaseData.email,
                phone: supabaseData.telefono,
                account: {
                    accountId: `ACC_${supabaseData.username}_001`,
                    accountNumber: supabaseData.document_number,
                    accountType: supabaseData.document_type === 'V' ? 'Ahorros' : 'Corriente',
                    balance: parseFloat(supabaseData.saldo_cuenta),
                    currency: 'VES'
                },
                // Las tarjetas de crédito se cargarán por separado si es necesario
                creditCard: null,
                transactions: []
            }
        };
    }

    // Convertir formato localStorage a Supabase
    convertLocalToSupabaseFormat(localData) {
        const clientData = localData.clientData;
        const [nombres, ...apellidosArray] = clientData.name.split(' ');
        const apellidos = apellidosArray.join(' ');

        return {
            username: localData.usuario,
            password_hash: localData.password,
            document_type: clientData.account.accountType === 'Ahorros' ? 'V' : 'J',
            document_number: clientData.account.accountNumber,
            nombres: nombres,
            apellidos: apellidos,
            email: clientData.email,
            telefono: clientData.phone,
            saldo_cuenta: clientData.account.balance
        };
    }
}

// Crear instancia global del manejador de base de datos
const dbManager = new DatabaseManager();

// Función para probar conexión a Supabase
async function testSupabaseConnection() {
    try {
        if (!supabaseClient) {
            if (!initializeSupabase()) {
                return { success: false, message: 'Cliente Supabase no inicializado' };
            }
        }

        const { data, error } = await supabaseClient
            .from('bank_config')
            .select('bank_name')
            .limit(1);

        if (error) {
            return { success: false, message: error.message };
        }

        return { 
            success: true, 
            message: 'Conexión exitosa', 
            data: data 
        };
    } catch (error) {
        return { 
            success: false, 
            message: error.message 
        };
    }
}

// Exponer funciones globales para debugging
window.dbManager = dbManager;
window.testSupabaseConnection = testSupabaseConnection;
window.initializeSupabase = initializeSupabase;

console.log('📊 Configuración de base de datos híbrida cargada');
console.log('🔧 Usar dbManager.toggleDatabase(true) para activar Supabase');
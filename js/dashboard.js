// Lógica del dashboard bancario

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    const clientData = getCurrentClient();
    if (!clientData) {
        logout();
        return;
    }

    // Inicializar dashboard
    initializeDashboard(clientData);
});

function initializeDashboard(clientData) {
    // Mostrar información completa del cliente
    document.getElementById('clientName').textContent = clientData.name;
    
    // Mostrar información adicional del cliente si existe
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        const savedClients = JSON.parse(localStorage.getItem('clientsDatabase')) || {};
        const fullClientData = Object.values(savedClients).find(c => c.usuario === currentUser);
        
        if (fullClientData) {
            // Agregar información del tipo de documento al nombre si existe elemento
            const clientInfoElement = document.getElementById('clientInfo');
            if (clientInfoElement) {
                clientInfoElement.innerHTML = `
                    <strong>${clientData.name}</strong><br>
                    <small class="text-muted">${fullClientData.tipoDocumento}-${fullClientData.documento}</small><br>
                    <small class="text-muted">${fullClientData.email}</small>
                `;
            }
        }
    }
    
    // Cargar cuenta principal
    loadAccount(clientData.account);

    // Cargar tarjeta de crédito
    loadCreditCard(clientData.creditCard);

    // Cargar transacciones (primero local/session)
    loadTransactions(clientData.transactions);

    // Refrescar SOLO transacciones desde Supabase (híbrido) si hay usuario
    if (typeof loadClientDataFromPersistentStorage === 'function' && currentUser) {
        loadClientDataFromPersistentStorage(currentUser).then(freshData => {
            if (freshData && freshData.clientData && Array.isArray(freshData.clientData.transactions)) {
                loadTransactions(freshData.clientData.transactions);
            }
        }).catch(err => {
            console.warn('No se pudieron refrescar transacciones desde Supabase:', err);
        });
    }

    // Verificar transacciones pendientes de liquidación
    checkPendingSettlements();

    // Configurar modal de nueva tarjeta si no tiene una
    if (!clientData.creditCard) {
        setupNewCardModal(clientData.account);
    }
}

function loadAccount(account) {
    const container = document.getElementById('accountContainer');
    container.innerHTML = '';

    // Formatear número de cuenta si el generador está disponible
    let formattedAccountNumber = account.accountNumber;
    if (window.AccountNumberGenerator) {
        formattedAccountNumber = AccountNumberGenerator.formatAccountNumber(account.accountNumber);
    }

    const accountCard = `
        <div class="col-md-8 col-lg-6 mx-auto">
            <div class="account-card fade-in">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="mb-0">Cuenta ${account.accountType}</h5>
                    <span class="badge bg-success">Activa</span>
                </div>
                <p class="account-number">Número: ${formattedAccountNumber}</p>
                <div class="account-balance">${formatCurrency(account.balance)}</div>
                <small class="text-muted">Saldo disponible</small>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', accountCard);
}

function loadCreditCard(creditCard) {
    const container = document.getElementById('creditCardContainer');
    container.innerHTML = '';

    if (!creditCard) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info d-flex justify-content-between align-items-center">
                    <div>
                        <strong>No tienes tarjeta de crédito.</strong>
                        Puedes solicitar una tarjeta de crédito asociada a tu cuenta principal.
                    </div>
                    <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#newCardModal">
                        ➕ Solicitar Tarjeta
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const availableCredit = creditCard.availableCredit;
    const usagePercentage = (creditCard.currentBalance / creditCard.creditLimit) * 100;
    
    const cardHtml = `
        <div class="col-md-8 col-lg-6 mx-auto">
            <div class="credit-card standard fade-in">
                <div class="card-status status-${creditCard.status}">${getStatusText(creditCard.status)}</div>
                <div class="card-type">Tarjeta de Crédito Estándar</div>
                <div class="card-number">${creditCard.cardNumber}</div>
                <div class="card-details">
                    <div class="card-holder">${creditCard.holderName}</div>
                    <div class="card-expiry">${creditCard.expiryDate}</div>
                    <!-- CVV Button Container -->
                    <div class="cvv-container" id="cvvContainer">
                        <div class="cvv-front">
                            <button class="cvv-button" id="cvvButton" onclick="toggleCVV()" title="Mostrar CVV">
                                <i class="fas fa-lock"></i>
                                CVV
                            </button>
                        </div>
                        <div class="cvv-back">
                            <div class="cvv-display">
                                <span class="cvv-code" id="cvvDisplay">***</span>
                            </div>
                            <button class="cvv-hide-btn" onclick="hideCVV()" title="Ocultar CVV">
                                <i class="fas fa-eye-slash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <hr style="border-color: rgba(255,255,255,0.3);">
                <div class="credit-info">
                    <div class="row">
                        <div class="col-6">
                            <small>Límite Total:</small><br>
                            <strong>${formatCurrency(creditCard.creditLimit)}</strong>
                        </div>
                        <div class="col-6">
                            <small>Disponible:</small><br>
                            <strong class="available-credit">${formatCurrency(availableCredit)}</strong>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-12">
                            <small>Deuda Actual: <span class="used-credit">${formatCurrency(creditCard.currentBalance)}</span></small>
                            <div class="progress mt-1" style="height: 6px;">
                                <div class="progress-bar ${usagePercentage > 80 ? 'bg-danger' : usagePercentage > 50 ? 'bg-warning' : 'bg-success'}"
                                     style="width: ${usagePercentage}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                ${creditCard.status === 'active' ? `
                <div class="mt-3">
                    <button class="btn btn-light btn-sm w-100" data-bs-toggle="modal" data-bs-target="#cardOperationsModal">
                        Gestionar Tarjeta
                    </button>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
}


function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function loadTransactions(transactions) {
    const tbody = document.querySelector('#transactionsTable tbody');
    tbody.innerHTML = '';

    // Ordenar transacciones por fecha (más recientes primero)
    const sortedTransactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.slice(0, 10).forEach(transaction => { // Mostrar solo las 10 más recientes
        const typeClass = getTransactionTypeClass(transaction.type);
        
        const row = `
            <tr class="transaction-row">
                <td>${formatDate(transaction.date)}</td>
                <td>${transaction.description}</td>
                <td class="transaction-amount">${formatCurrency(Math.abs(transaction.amount))}</td>
                <td><span class="badge ${typeClass}">${transaction.type}</span></td>
                <td><small class="text-muted">${transaction.reference || 'N/A'}</small></td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function getTransactionTypeClass(type) {
    const typeClasses = {
        'Crédito': 'bg-success',
        'Débito': 'bg-danger',
        'Tarjeta de Crédito': 'bg-primary',
        'Pago TDC': 'bg-info'
    };
    return typeClasses[type] || 'bg-secondary';
}

function setupNewCardModal(account) {
    const accountField = document.getElementById('associatedAccount');
    if (accountField) {
        accountField.value = `${account.accountType} - ${account.accountNumber} (${formatCurrency(account.balance)})`;
    }
}

function getStatusText(status) {
    const statusMap = {
        'active': 'Activa',
        'pending': 'Pendiente',
        'blocked': 'Bloqueada'
    };
    return statusMap[status] || status;
}

function getCardTypeText(cardType) {
    const typeMap = {
        'clasica': 'Tarjeta Clásica',
        'oro': 'Tarjeta Oro',
        'platinum': 'Tarjeta Platinum'
    };
    return typeMap[cardType] || cardType;
}

async function requestNewCard() {
    // Validar que el cliente no tenga ya una tarjeta
    const clientData = getCurrentClient();
    
    // VALIDACIÓN: Verificar que la tarjeta realmente existe y está activa
    if (clientData && clientData.creditCard && 
        clientData.creditCard.status === 'active' && 
        clientData.creditCard.cardNumber) {
        showAlert('error', 'Ya tienes una tarjeta de crédito activa. Solo puedes tener una tarjeta por cuenta.');
        return;
    }

    try {
        // Solicitar nueva tarjeta con límite estándar (Bs. 100,000)
        const result = await requestCreditCard();

        if (result.success) {
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('newCardModal'));
            modal.hide();

            // Mostrar mensaje de éxito
            showAlert('success', '¡Solicitud enviada! Su nueva tarjeta será activada en unos momentos.');
            
            // Recargar página después de 2 segundos para mostrar la tarjeta
            setTimeout(() => {
                location.reload();
            }, 2000);

            // Limpiar formulario
            document.getElementById('newCardForm').reset();
            
        } else {
            showAlert('error', result.message || 'Error al procesar la solicitud. Intente nuevamente.');
        }
    } catch (error) {
        console.error('Error en requestNewCard:', error);
        showAlert('error', 'Error al procesar la solicitud. Intente nuevamente.');
    }
}

// Funciones para operaciones de tarjeta
function showPayCardForm() {
    document.getElementById('payCardForm').style.display = 'block';
    document.getElementById('useCardForm').style.display = 'none';
    
    const clientData = getCurrentClient();
    if (clientData && clientData.creditCard) {
        document.getElementById('debtInfo').textContent = 
            `Deuda actual: ${formatCurrency(clientData.creditCard.currentBalance)}`;
    }
}

function showUseCardForm() {
    document.getElementById('useCardForm').style.display = 'block';
    document.getElementById('payCardForm').style.display = 'none';
}

async function processCardPayment() {
    const amount = parseFloat(document.getElementById('payAmount').value);

    if (!amount || amount <= 0) {
        showAlert('error', 'Ingrese un monto válido.');
        return;
    }

    const result = await payCreditCard(amount);

    if (result.success) {
        showAlert('success', `Pago procesado exitosamente. Pagaste ${formatCurrency(amount)}`);

        // Obtener username seguro
        const clientData = getCurrentClient();
        const username = clientData.usuario || sessionStorage.getItem('currentUser');

        // Descontar el monto de la cuenta principal
        if (clientData.account && typeof clientData.account.balance === 'number') {
            clientData.account.balance -= amount;
            if (clientData.account.balance < 0) clientData.account.balance = 0;
        }


        // Guardar la transacción en Supabase
        if (typeof saveTransactionToSupabase === 'function') {
            try {
                await saveTransactionToSupabase(username, result.transaction);
                console.log('[Supabase] Pago guardado en Supabase:', result.transaction);
            } catch (err) {
                console.warn('[Supabase] Error al guardar pago en Supabase:', err);
            }
        }

        // Actualizar saldo de la tarjeta en Supabase
        if (typeof updateCreditCardInSupabase === 'function') {
            try {
                await updateCreditCardInSupabase(username, clientData.creditCard);
                console.log('[Supabase] Tarjeta actualizada en Supabase:', clientData.creditCard);
            } catch (err) {
                console.warn('[Supabase] Error al actualizar tarjeta en Supabase:', err);
            }
        }

        // Actualizar saldo de la cuenta principal en Supabase
        if (window.hybridStorage && typeof window.hybridStorage.saveClient === 'function') {
            try {
                // Log para depuración del saldo antes de guardar
                console.log('[Depuración] Saldo que se va a guardar en Supabase:', clientData.account.balance);
                let clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase')) || {};
                let clientWrapper = clientsDatabase[username];
                if (clientWrapper && clientWrapper.clientData) {
                    clientWrapper.saldo_cuenta = clientWrapper.clientData.account.balance;
                    console.log('[Depuración] Wrapper enviado a saveClient:', clientWrapper);
                    await window.hybridStorage.saveClient(username, clientWrapper);
                } else {
                    // Si no existe, crea el wrapper mínimo
                    const clientToSave = getCurrentClient();
                    await window.hybridStorage.saveClient(username, {
                        password: '', // o el valor correcto si lo tienes
                        usuario: username,
                        clientData: clientToSave,
                        saldo_cuenta: clientToSave.account.balance
                    });
                }
                console.log('[Supabase] Cuenta principal actualizada en Supabase:', clientData.account);
            } catch (err) {
                console.error('[Supabase] Error al actualizar cuenta en Supabase:', err);
                showAlert('error', 'Error al guardar el saldo en Supabase: ' + (err.message || err));
            }
        }

        // Guardar los cambios en localStorage/sessionStorage
        try {
            if (username) {
                let clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase')) || {};
                if (clientsDatabase[username]) {
                    clientsDatabase[username].clientData = clientData;
                    localStorage.setItem('clientsDatabase', JSON.stringify(clientsDatabase));
                }
                sessionStorage.setItem('clientData', JSON.stringify(clientData));
            }
        } catch (err) {
            console.warn('[Depuración] Error guardando datos local/session:', err);
        }

        // Refrescar historial de transacciones desde Supabase
        if (typeof loadClientDataFromPersistentStorage === 'function' && username) {
            loadClientDataFromPersistentStorage(username).then(freshData => {
                if (freshData && freshData.clientData && Array.isArray(freshData.clientData.transactions)) {
                    loadTransactions(freshData.clientData.transactions);
                }
            }).catch(err => {
                console.warn('No se pudieron refrescar transacciones desde Supabase:', err);
            });
        } else {
            loadTransactions(clientData.transactions);
        }

        loadAccount(clientData.account);
        loadCreditCard(clientData.creditCard);

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('cardOperationsModal'));
        modal.hide();

        // Limpiar formulario
        document.getElementById('payAmount').value = '';

    } else {
        showAlert('error', result.message);
    }
}

async function processPurchase() {
    const amount = parseFloat(document.getElementById('purchaseAmount').value);
    const description = document.getElementById('purchaseDescription').value || 'Compra con tarjeta de crédito';

    // Validación de campos
    if (!amount || amount <= 0) {
        showAlert('error', 'Ingrese un monto válido.');
        return;
    }

    // Validar cliente y tarjeta
    const clientData = getCurrentClient();
    if (!clientData) {
        showAlert('error', 'No se encontró el cliente actual.');
        console.warn('[Depuración] clientData está undefined o null:', clientData);
        return;
    }
    if (!clientData.creditCard) {
        showAlert('error', 'No tienes tarjeta de crédito activa.');
        console.warn('[Depuración] clientData.creditCard está undefined o null:', clientData.creditCard);
        return;
    }

    // Procesar compra
    const result = await useCreditCard(amount, description);
    console.log('[Depuración] Resultado de useCreditCard:', result);

    if (result.success) {
        showAlert('success', `Compra procesada exitosamente. Monto: ${formatCurrency(amount)}`);

        // 1. Actualizar saldo de la tarjeta con los datos devueltos
        if (result.updatedCard) {
            clientData.creditCard = result.updatedCard;
        }

        // 2. Agregar la transacción al historial local
        if (result.transaction) {
            if (!clientData.transactions) clientData.transactions = [];
            clientData.transactions.unshift(result.transaction);
        }

        // Obtener username seguro
        const username = clientData.usuario || sessionStorage.getItem('currentUser');

        // 3. Guardar la transacción en Supabase
        if (typeof saveTransactionToSupabase === 'function') {
            try {
                await saveTransactionToSupabase(username, result.transaction);
                console.log('[Supabase] Transacción guardada en Supabase:', result.transaction);
            } catch (err) {
                console.warn('[Supabase] Error al guardar en Supabase:', err);
            }
        } else {
            console.warn('[Supabase] saveTransactionToSupabase no está definida');
        }

        // 3b. Actualizar saldo de la tarjeta en Supabase
        if (result.updatedCard && typeof updateCreditCardInSupabase === 'function') {
            try {
                await updateCreditCardInSupabase(username, result.updatedCard);
                console.log('[Supabase] Saldo de tarjeta actualizado en Supabase:', result.updatedCard);
            } catch (err) {
                console.warn('[Supabase] Error al actualizar tarjeta en Supabase:', err);
            }
        } else if (result.updatedCard) {
            console.warn('[Supabase] updateCreditCardInSupabase no está definida');
        }

        // 4. Guardar los cambios en localStorage/sessionStorage
        try {
            if (username) {
                let clientsDatabase = JSON.parse(localStorage.getItem('clientsDatabase')) || {};
                if (clientsDatabase[username]) {
                    clientsDatabase[username].clientData = clientData;
                    localStorage.setItem('clientsDatabase', JSON.stringify(clientsDatabase));
                }
                sessionStorage.setItem('clientData', JSON.stringify(clientData));
            }
        } catch (err) {
            console.warn('[Depuración] Error guardando datos local/session:', err);
        }

        // Actualizar la vista
        loadAccount(clientData.account);
        loadCreditCard(clientData.creditCard);
        loadTransactions(clientData.transactions);

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('cardOperationsModal'));
        modal.hide();

        // Limpiar formulario
        document.getElementById('purchaseAmount').value = '';
        document.getElementById('purchaseDescription').value = '';

    } else {
        showAlert('error', result.message);
        console.warn('[Depuración] Error en la compra:', result.message, result);
    }
}

// Función para mostrar alertas/notificaciones
function showAlert(type, message) {
    // Crear elemento de alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible fade show`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.maxWidth = '400px';

    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Agregar al body
    document.body.appendChild(alertDiv);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// ===============================================
// FUNCIONES PARA EL BOTÓN CVV
// ===============================================

let cvvDisplayTimeout = null;

function showCVV(cvvCode) {
    const cvvContainer = document.getElementById('cvvContainer');
    const cvvDisplay = document.getElementById('cvvDisplay');
    
    if (!cvvContainer || !cvvDisplay) return;

    // Mostrar el CVV con animación de giro
    cvvContainer.classList.add('flipped');
    cvvDisplay.textContent = cvvCode;

    // Limpiar timeout anterior si existe
    if (cvvDisplayTimeout) {
        clearTimeout(cvvDisplayTimeout);
    }

    // Ocultar automáticamente después de 10 segundos por seguridad
    cvvDisplayTimeout = setTimeout(() => {
        hideCVV();
    }, 10000);
}

function hideCVV() {
    const cvvContainer = document.getElementById('cvvContainer');
    
    if (!cvvContainer) return;

    cvvContainer.classList.remove('flipped');

    if (cvvDisplayTimeout) {
        clearTimeout(cvvDisplayTimeout);
        cvvDisplayTimeout = null;
    }
}

function toggleCVV() {
    const cvvContainer = document.getElementById('cvvContainer');
    const clientData = getCurrentClient();
    
    if (!cvvContainer || !clientData || !clientData.creditCard) return;

    if (cvvContainer.classList.contains('flipped')) {
        hideCVV();
    } else {
        showCVV(clientData.creditCard.cvv);
    }
}

// ============================================
// SISTEMA DE LIQUIDACIÓN DE TRANSACCIONES POS
// ============================================

// Verificar transacciones pendientes al cargar
function checkPendingSettlements() {
    const pendingSettlements = JSON.parse(localStorage.getItem('pendingSettlements')) || [];
    const currentClient = getCurrentClient();

    if (!currentClient || !currentClient.creditCard) {
        return;
    }

    // Filtrar transacciones de este cliente
    const clientTransactions = pendingSettlements.filter(transaction =>
        transaction.cardNumber === currentClient.creditCard.cardNumber
    );
    
    const counter = document.getElementById('pendingSettlementsCounter');
    const btnShow = document.getElementById('btnShowPending');
    const btnProcess = document.getElementById('btnProcessSettlements');
    
    if (clientTransactions.length > 0) {
        counter.textContent = `${clientTransactions.length} transacciones pendientes`;
        counter.style.display = 'inline-block';
        btnShow.style.display = 'inline-block';
        btnProcess.style.display = 'inline-block';
    } else {
        counter.style.display = 'none';
        btnShow.style.display = 'none';
        btnProcess.style.display = 'none';
    }
}

// Mostrar transacciones pendientes
function showPendingSettlements() {
    const pendingSettlements = JSON.parse(localStorage.getItem('pendingSettlements')) || [];
    const currentClient = getCurrentClient();

    if (!currentClient || !currentClient.creditCard) {
        showAlert('error', 'Error al obtener datos del cliente');
        return;
    }

    // Filtrar transacciones de este cliente
    const clientTransactions = pendingSettlements.filter(transaction =>
        transaction.cardNumber === currentClient.creditCard.cardNumber
    );

    if (clientTransactions.length === 0) {
        showAlert('info', 'No hay transacciones pendientes de liquidación');
        return;
    }

    let html = `
        <div class="modal fade" id="pendingModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">📋 Transacciones Pendientes de Liquidación</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Comercio</th>
                                        <th>Descripción</th>
                                        <th>Monto</th>
                                        <th>Código Auth.</th>
                                    </tr>
                                </thead>
                                <tbody>
    `;

    let total = 0;
    clientTransactions.forEach(transaction => {
        total += transaction.amount;
        html += `
            <tr>
                <td>${transaction.displayTime}</td>
                <td>${transaction.commerceName}</td>
                <td>${transaction.description}</td>
                <td class="text-danger">${formatCurrency(transaction.amount)}</td>
                <td><small>${transaction.authCode}</small></td>
            </tr>
        `;
    });

    html += `
                                </tbody>
                            </table>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between align-items-center">
                            <strong>Total a liquidar: ${formatCurrency(total)}</strong>
                            <button class="btn btn-success" onclick="processSettlements(); bootstrap.Modal.getInstance(document.getElementById('pendingModal')).hide();">
                                💰 Liquidar Ahora
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Eliminar modal existente si existe
    const existingModal = document.getElementById('pendingModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('pendingModal'));
    modal.show();
}

// Procesar liquidación de transacciones
function processSettlements() {
    const pendingSettlements = JSON.parse(localStorage.getItem('pendingSettlements')) || [];
    const currentClient = getCurrentClient();

    if (!currentClient || !currentClient.creditCard) {
        showAlert('error', 'Error al obtener datos del cliente');
        return;
    }

    // Filtrar transacciones de este cliente
    const clientTransactions = pendingSettlements.filter(transaction =>
        transaction.cardNumber === currentClient.creditCard.cardNumber
    );

    if (clientTransactions.length === 0) {
        showAlert('info', 'No hay transacciones pendientes de liquidación');
        return;
    }

    // Procesar cada transacción
    let totalProcessed = 0;
    let clientsDatabase;

    try {
        const storedData = localStorage.getItem('clientsDatabase');
        if (storedData) {
            clientsDatabase = JSON.parse(storedData);
        } else {
            showAlert('error', 'Base de datos no disponible');
            return;
        }
    } catch (error) {
        showAlert('error', 'Error al acceder a la base de datos del cliente');
        return;
    }

    // Buscar cliente en la base de datos
    const clientKey = Object.keys(clientsDatabase).find(key =>
        clientsDatabase[key].clientData &&
        clientsDatabase[key].clientData.name === currentClient.name
    );

    if (!clientKey) {
        showAlert('error', 'Error al acceder a la base de datos del cliente');
        return;
    }

    clientTransactions.forEach(transaction => {
        // Crear transacción en el historial del cliente
        const newTransaction = {
            id: transaction.id,
            date: new Date(transaction.timestamp).toISOString().split('T')[0], // Formato YYYY-MM-DD
            description: `${transaction.description} - ${transaction.commerceName}`,
            amount: -transaction.amount, // Negativo porque es un cargo
            type: 'COMPRA_POS',
            reference: transaction.authCode,
            displayTime: transaction.displayTime,
            accountId: clientsDatabase[clientKey].clientData.account.accountId
        };
        
        // Agregar al historial
        clientsDatabase[clientKey].clientData.transactions.unshift(newTransaction);
        
        // Reducir límite disponible
        clientsDatabase[clientKey].clientData.creditCard.availableCredit -= transaction.amount;
        totalProcessed += transaction.amount;
    });

    // Actualizar base de datos
    localStorage.setItem('clientsDatabase', JSON.stringify(clientsDatabase));
    
    // Eliminar transacciones procesadas de pendientes
    const remainingPending = pendingSettlements.filter(transaction =>
        transaction.cardNumber !== currentClient.creditCard.cardNumber
    );
    localStorage.setItem('pendingSettlements', JSON.stringify(remainingPending));
    
    // Actualizar sessionStorage con los datos actualizados
    sessionStorage.setItem('clientData', JSON.stringify(clientsDatabase[clientKey].clientData));
    
    // Actualizar también la persistencia
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        // Enviar wrapper completo a la persistencia
        if (clientsDatabase[currentUser]) {
            saveClientDataToPersistentStorage(currentUser, clientsDatabase[currentUser]);
        } else {
            // Fallback: crear wrapper mínimo
            saveClientDataToPersistentStorage(currentUser, {
                password: '',
                usuario: currentUser,
                clientData: clientsDatabase[clientKey].clientData,
                saldo_cuenta: clientsDatabase[clientKey].clientData.account.balance
            });
        }
    }

    // Mostrar resultado
    showAlert('success', `
        <strong>💰 Liquidación Completada</strong><br>
        Se procesaron ${clientTransactions.length} transacciones<br>
        Monto total: ${formatCurrency(totalProcessed)}<br>
        Las transacciones aparecen ahora en tu historial
    `);

    // Actualizar vista inmediatamente
    console.log('Actualizando vista después de liquidación...');
    const updatedClientData = getCurrentClient();
    console.log('Datos actualizados del cliente:', updatedClientData);
    loadTransactions(updatedClientData.transactions);
}

// DEBUG: Función para verificar usuario en Supabase
async function checkUserInSupabase(userIdentifier) {
    try {
        console.log('🔍 Buscando usuario en Supabase:', userIdentifier);
        
        // Intentar consulta a Supabase directamente
        const hybridStorage = new HybridStorage();
        const clientes = await hybridStorage.getAllClients();
        
        const usuario = clientes.find(c => 
            c.email === userIdentifier || 
            c.name === userIdentifier ||
            c.usuario === userIdentifier
        );
        
        if (usuario) {
            console.log('🔍 Usuario encontrado en Supabase:', usuario);
            console.log('🔍 CreditCard en Supabase:', usuario.creditCard || 'null/undefined');
        } else {
            console.log('🔍 Usuario NO encontrado en Supabase');
        }
        
        // También verificar tabla credit_cards si existe
        if (hybridStorage.supabase) {
            const response = await fetch(`${hybridStorage.supabase.url}/rest/v1/credit_cards?select=*`, {
                headers: hybridStorage.supabase.headers
            });
            if (response.ok) {
                const creditCards = await response.json();
                console.log('🔍 Todas las credit_cards en Supabase:', creditCards);
                
                const userCard = creditCards.find(card => 
                    card.username === userIdentifier || 
                    card.user_email === userIdentifier
                );
                if (userCard) {
                    console.log('🔍 Tarjeta encontrada en tabla credit_cards:', userCard);
                }
            }
        }
    } catch (error) {
        console.error('🔍 Error consultando Supabase:', error);
    }
    loadCreditCard(updatedClientData.creditCard);
    checkPendingSettlements(); // Actualizar botones de liquidación
}

// Función para mostrar notificaciones (compatibilidad)
function showNotification(title, message, type) {
    const fullMessage = `<strong>${title}</strong><br>${message}`;
    showAlert(type, fullMessage);
}

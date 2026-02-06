// dashboardadmin.js
// Procesamiento y renderizado de datos para el dashboard administrativo


// Importar la instancia supabase del sistema híbrido
// Asume que hybrid-storage.js ya está cargado antes que este script

async function cargarDatosDashboard() {
	// Consultar datos reales desde Supabase
	const [clients, transactions, creditCards] = await Promise.all([
		supabase.select('clients'),
		supabase.select('transactions'),
		supabase.select('credit_cards')
	]);

	// Depuración: mostrar datos obtenidos
	console.log('clients:', clients);
	console.log('transactions:', transactions);
	console.log('creditCards:', creditCards);

	function formatVES(amount) {
		return amount.toLocaleString('es-VE', { style: 'currency', currency: 'VES' });
	}
	//function getToday() {
	//	return new Date().toISOString().split('T')[0];
	//}
	function getToday() {
    	const now = new Date();
    	return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
	}
	function getWeekStart() {
		const now = new Date();
		const day = now.getDay();
		const diff = now.getDate() - day + (day === 0 ? -6 : 1);
		return new Date(now.setDate(diff)).toISOString().split('T')[0];
	}
	function getMonthStart() {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
	}
		function sumAbonosByDateRange(transactions, start, end) {
	// DEPURACIÓN: Mostrar transacciones Abono de hoy y comparar formatos
	const hoy = getToday();
	console.log('getToday():', hoy);
	console.log('transaction.date:', transactions.map(t => t.date));
	const abonosHoy = transactions.filter(t => t.date === hoy && t.transaction_type === 'Abono');
	console.log('Abonos hoy:', abonosHoy);
	console.log('Cantidad Abonos hoy:', abonosHoy.length);
	console.log('Montos Abonos hoy:', abonosHoy.map(t => t.amount));
	console.log('Total Abonos hoy:', abonosHoy.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0));
	return transactions
		.filter(t => t.date >= start && t.date <= end && t.transaction_type === 'Abono')
		.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
	}
	function getSuccessRate(transactions) {
		const total = transactions.length;
		const completed = transactions.filter(t => t.status === 'completed').length;
		return total ? Math.round((completed/total)*100) : 0;
	}
	function sumCreditCardDebt(cards) {
		return cards.reduce((acc, c) => acc + parseFloat(c.current_balance || 0), 0);
	}
	function getAdminCommissionTotal(clients) {
    const admin = clients.find(c => c.username === 'admin' && c.status === 'active');
    return admin ? parseFloat(admin.saldo_cuenta || 0) : 0;
	}
	function safeSetText(id, value) {
		const el = document.getElementById(id);
		if (!el) {
			console.warn('Elemento no encontrado:', id);
			return;
		}
		el.textContent = value;
	}

	// Renderizar totales
	safeSetText('totalHoy', formatVES(sumAbonosByDateRange(transactions, getToday(), getToday())));
	safeSetText('totalSemana', formatVES(sumAbonosByDateRange(transactions, getWeekStart(), getToday())));
	safeSetText('totalMes', formatVES(sumAbonosByDateRange(transactions, getMonthStart(), getToday())));
	safeSetText('tasaExito', getSuccessRate(transactions) + '%');
	safeSetText('deudaTotal', formatVES(sumCreditCardDebt(creditCards)));
	safeSetText('totalComisiones', formatVES(getAdminCommissionTotal(clients)));

	// Gráfico: Transacciones últimos 7 días
	const dias = [];
	const transPorDia = [];
	for(let i=6;i>=0;i--) {
		const d = new Date();
		d.setDate(d.getDate()-i);
		const fecha = d.toISOString().split('T')[0];
		dias.push(fecha.slice(5));
		transPorDia.push(transactions.filter(t => t.date === fecha).length);
	}
	new Chart(document.getElementById('graficoTransacciones7d'), {
		type: 'bar',
		data: {
			labels: dias,
			datasets: [{ label: 'Transacciones', data: transPorDia, backgroundColor: '#0d6efd' }]
		},
		options: { responsive: true }
	});

	// Gráfico: Distribución por Canal
	const canales = {};
	transactions.forEach(t => { canales[t.transaction_type] = (canales[t.transaction_type]||0)+1; });
	new Chart(document.getElementById('graficoCanal'), {
		type: 'pie',
		data: {
			labels: Object.keys(canales),
			datasets: [{ data: Object.values(canales), backgroundColor: ['#0d6efd','#6c757d','#198754','#ffc107'] }]
		},
		options: { responsive: true }
	});

	// Gráfico: Transacciones por Horario
	const horarios = { 'Mañana (6-12)':0, 'Tarde (12-18)':0, 'Noche (18-6)':0 };
	transactions.forEach(t => {
		const hora = new Date(t.created_at||t.date).getHours();
		if(hora>=6 && hora<12) horarios['Mañana (6-12)']++;
		else if(hora>=12 && hora<18) horarios['Tarde (12-18)']++;
		else horarios['Noche (18-6)']++;
	});
	new Chart(document.getElementById('graficoHorario'), {
		type: 'bar',
		data: {
			labels: Object.keys(horarios),
			datasets: [{ label: 'Transacciones', data: Object.values(horarios), backgroundColor: '#198754' }]
		},
		options: { responsive: true }
	});

	// Top 5 clientes por cantidad de transacciones
	const transPorCliente = {};
	transactions.forEach(t => { transPorCliente[t.client_id] = (transPorCliente[t.client_id]||0)+1; });
	const topClientes = Object.entries(transPorCliente)
		.sort((a,b)=>b[1]-a[1])
		.slice(0,5)
		.map(([id, count]) => {
			const c = clients.find(cl=>cl.id===id);
			return { nombre: c ? (c.nombres+' '+c.apellidos) : id, count };
		});
	const tbody = document.querySelector('#tablaTopClientes tbody');
	tbody.innerHTML = '';
	topClientes.forEach(tc => {
		const tr = document.createElement('tr');
		tr.innerHTML = `<td>${tc.nombre}</td><td>${tc.count}</td>`;
		tbody.appendChild(tr);
	});
}

// Ejecutar la carga al iniciar
window.addEventListener('DOMContentLoaded', cargarDatosDashboard);







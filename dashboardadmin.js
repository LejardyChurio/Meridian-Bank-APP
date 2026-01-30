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

	// ...el resto del procesamiento y renderizado permanece igual...
	function formatVES(amount) {
		return amount.toLocaleString('es-VE', { style: 'currency', currency: 'VES' });
	}
	function getToday() {
		return new Date().toISOString().split('T')[0];
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
	function sumByDateRange(transactions, start, end) {
		return transactions.filter(t => t.date >= start && t.date <= end)
			.reduce((acc, t) => acc + t.amount, 0);
	}
	function getSuccessRate(transactions) {
		const total = transactions.length;
		const completed = transactions.filter(t => t.status === 'completed').length;
		return total ? Math.round((completed/total)*100) : 0;
	}
	function sumCreditCardDebt(cards) {
		return cards.reduce((acc, c) => acc + c.current_balance, 0);
	}

	// Renderizar totales
	document.getElementById('totalHoy').textContent = formatVES(sumByDateRange(transactions, getToday(), getToday()));
	document.getElementById('totalSemana').textContent = formatVES(sumByDateRange(transactions, getWeekStart(), getToday()));
	document.getElementById('totalMes').textContent = formatVES(sumByDateRange(transactions, getMonthStart(), getToday()));
	document.getElementById('tasaExito').textContent = getSuccessRate(transactions) + '%';
	document.getElementById('deudaTotal').textContent = formatVES(sumCreditCardDebt(creditCards));

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

// 2. Procesamiento de totales y métricas
function formatVES(amount) {
	return amount.toLocaleString('es-VE', { style: 'currency', currency: 'VES' });
}

function getToday() {
	return new Date().toISOString().split('T')[0];
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

function sumByDateRange(transactions, start, end) {
	return transactions.filter(t => t.date >= start && t.date <= end)
		.reduce((acc, t) => acc + t.amount, 0);
}

function getSuccessRate(transactions) {
	const total = transactions.length;
	const completed = transactions.filter(t => t.status === 'completed').length;
	return total ? Math.round((completed/total)*100) : 0;
}

function sumCreditCardDebt(cards) {
	return cards.reduce((acc, c) => acc + c.current_balance, 0);
}

// 3. Renderizar totales
document.getElementById('totalHoy').textContent = formatVES(sumByDateRange(transactions, getToday(), getToday()));
document.getElementById('totalSemana').textContent = formatVES(sumByDateRange(transactions, getWeekStart(), getToday()));
document.getElementById('totalMes').textContent = formatVES(sumByDateRange(transactions, getMonthStart(), getToday()));
document.getElementById('tasaExito').textContent = getSuccessRate(transactions) + '%';
document.getElementById('deudaTotal').textContent = formatVES(sumCreditCardDebt(creditCards));

// 4. Gráfico: Transacciones últimos 7 días
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

// 5. Gráfico: Distribución por Canal
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

// 6. Gráfico: Transacciones por Horario
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

// 7. Top 5 clientes por cantidad de transacciones
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
topClientes.forEach(tc => {
	const tr = document.createElement('tr');
	tr.innerHTML = `<td>${tc.nombre}</td><td>${tc.count}</td>`;
	tbody.appendChild(tr);
});

// 2. Funciones de procesamiento y renderizado (se agregarán en el siguiente paso)

// Puedes agregar aquí las funciones para calcular totales, tasa de éxito, deuda, preparar datos para gráficos, etc.

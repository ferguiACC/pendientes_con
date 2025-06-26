// Construction Tracking Application JavaScript
class ConstructionTracker {
    constructor() {
        this.pendientes = [];
        this.filteredPendientes = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentEditingId = null;
        this.charts = {};
        
        this.init();
    }

    init() {
        this.loadData();
        this.bindEvents();
        this.renderTable();
        this.updateFilters();
        this.updateStats();
        this.initCharts();
    }

    async loadData() {
        try {
            // Try to load from localStorage first
            const savedData = localStorage.getItem('constructionPendientes');
            if (savedData) {
                this.pendientes = JSON.parse(savedData);
            } else {
                // Load initial data from the provided asset
                const response = await fetch('https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/8eb640635a01d732869a8dde089153eb/7b81e2e5-e1dd-47eb-8228-84e5314fba6a/10f050fa.json');
                this.pendientes = await response.json();
                this.saveData();
            }
            this.filteredPendientes = [...this.pendientes];
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error al cargar los datos', 'error');
            this.pendientes = this.getSampleData();
            this.filteredPendientes = [...this.pendientes];
        }
    }

    saveData() {
        localStorage.setItem('constructionPendientes', JSON.stringify(this.pendientes));
    }

    bindEvents() {
        // Filter events
        document.getElementById('filterEstado').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterPrioridad').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterDisciplina').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterHito').addEventListener('change', () => this.applyFilters());
        document.getElementById('searchInput').addEventListener('input', () => this.applyFilters());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());

        // Modal events
        document.getElementById('addPendiente').addEventListener('click', () => this.openModal());
        document.getElementById('savePendiente').addEventListener('click', () => this.savePendiente());

        // Photo upload events
        this.setupPhotoUpload();

        // Excel import events
        this.setupExcelImport();

        // Configuration events
        document.getElementById('exportExcel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('loadSampleData').addEventListener('click', () => this.loadSampleData());
        document.getElementById('clearAllData').addEventListener('click', () => this.clearAllData());
        document.getElementById('itemsPerPage').addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.renderTable();
        });

        // Location events
        document.getElementById('getCurrentLocation').addEventListener('click', () => this.getCurrentLocation());

        // Tab events
        document.addEventListener('shown.bs.tab', (e) => {
            if (e.target.getAttribute('data-bs-target') === '#stats') {
                this.updateStats();
                this.updateCharts();
            }
        });
    }

    setupPhotoUpload() {
        const photoDropZone = document.getElementById('photoDropZone');
        const photoInput = document.getElementById('photoInput');

        photoDropZone.addEventListener('click', () => photoInput.click());
        photoDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoDropZone.classList.add('drag-over');
        });
        photoDropZone.addEventListener('dragleave', () => {
            photoDropZone.classList.remove('drag-over');
        });
        photoDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            photoDropZone.classList.remove('drag-over');
            this.handlePhotoFiles(e.dataTransfer.files);
        });
        photoInput.addEventListener('change', (e) => {
            this.handlePhotoFiles(e.target.files);
        });
    }

    setupExcelImport() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('excelFileInput');
        const selectFileBtn = document.getElementById('selectFileBtn');

        selectFileBtn.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.handleExcelFile(e.dataTransfer.files[0]);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleExcelFile(e.target.files[0]);
        });

        document.getElementById('importDataBtn').addEventListener('click', () => this.importExcelData());
    }

    applyFilters() {
        const estado = document.getElementById('filterEstado').value;
        const prioridad = document.getElementById('filterPrioridad').value;
        const disciplina = document.getElementById('filterDisciplina').value;
        const hito = document.getElementById('filterHito').value;
        const search = document.getElementById('searchInput').value.toLowerCase();

        this.filteredPendientes = this.pendientes.filter(item => {
            return (!estado || item.estado === estado) &&
                   (!prioridad || item.prioridad === prioridad) &&
                   (!disciplina || item.disciplina === disciplina) &&
                   (!hito || item.hito_asociado === hito) &&
                   (!search || 
                    item.descripcion_sistema.toLowerCase().includes(search) ||
                    item.descripcion_faltas.toLowerCase().includes(search) ||
                    item.responsable_acc.toLowerCase().includes(search) ||
                    item.top_number.toLowerCase().includes(search));
        });

        this.currentPage = 1;
        this.renderTable();
    }

    clearFilters() {
        document.getElementById('filterEstado').value = '';
        document.getElementById('filterPrioridad').value = '';
        document.getElementById('filterDisciplina').value = '';
        document.getElementById('filterHito').value = '';
        document.getElementById('searchInput').value = '';
        this.applyFilters();
    }

    updateFilters() {
        // Update disciplina filter
        const disciplinas = [...new Set(this.pendientes.map(p => p.disciplina))];
        const disciplinaFilter = document.getElementById('filterDisciplina');
        disciplinaFilter.innerHTML = '<option value="">Todas</option>';
        disciplinas.forEach(d => {
            disciplinaFilter.innerHTML += `<option value="${d}">${d}</option>`;
        });

        // Update hito filter
        const hitos = [...new Set(this.pendientes.map(p => p.hito_asociado))];
        const hitoFilter = document.getElementById('filterHito');
        hitoFilter.innerHTML = '<option value="">Todos</option>';
        hitos.forEach(h => {
            hitoFilter.innerHTML += `<option value="${h}">${h}</option>`;
        });
    }

    renderTable() {
        const tbody = document.getElementById('pendientesTableBody');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = this.filteredPendientes.slice(startIndex, endIndex);

        tbody.innerHTML = '';

        if (pageItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="text-center py-4">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <p>No se encontraron pendientes</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        pageItems.forEach(item => {
            const row = document.createElement('tr');
            
            // Calculate days remaining
            const today = new Date();
            const objetivo = new Date(item.fecha_objetivo_top);
            const diasRestantes = Math.ceil((objetivo - today) / (1000 * 60 * 60 * 24));
            
            let diasClass = 'days-remaining on-time';
            if (diasRestantes < 0) diasClass = 'days-remaining overdue';
            else if (diasRestantes <= 7) diasClass = 'days-remaining due-soon';

            row.innerHTML = `
                <td>
                    ${item.fotos && item.fotos.length > 0 
                        ? `<img src="${item.fotos[0]}" class="photo-thumbnail" onclick="this.openPhotoModal(${item.id})">`
                        : `<div class="photo-placeholder"><i class="fas fa-camera"></i></div>`
                    }
                </td>
                <td>${item.id}</td>
                <td>${item.semana || '-'}</td>
                <td class="text-truncate-table" title="${item.top_number}">${item.top_number}</td>
                <td class="text-truncate-table" title="${item.descripcion_sistema}">${item.descripcion_sistema}</td>
                <td>${item.hito_asociado}</td>
                <td><span class="badge badge-priority-${item.prioridad.toLowerCase()}">${item.prioridad}</span></td>
                <td><span class="badge badge-status-${item.estado.toLowerCase()}">${item.estado}</span></td>
                <td>${item.disciplina}</td>
                <td>${item.responsable_acc}</td>
                <td>${this.formatDate(item.fecha_objetivo_top)}</td>
                <td><span class="${diasClass}">${diasRestantes}</span></td>
                <td>${item.sub_vendor || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-action" onclick="tracker.editPendiente(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="tracker.deletePendiente(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredPendientes.length / this.itemsPerPage);
        const paginationList = document.getElementById('paginationList');
        
        paginationList.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="tracker.goToPage(${this.currentPage - 1})">Anterior</a>`;
        paginationList.appendChild(prevLi);

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="tracker.goToPage(${i})">${i}</a>`;
            paginationList.appendChild(li);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${this.currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="tracker.goToPage(${this.currentPage + 1})">Siguiente</a>`;
        paginationList.appendChild(nextLi);
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredPendientes.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderTable();
        }
    }

    openModal(id = null) {
        this.currentEditingId = id;
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        
        if (id) {
            const pendiente = this.pendientes.find(p => p.id === id);
            this.populateForm(pendiente);
        } else {
            this.clearForm();
        }
        
        modal.show();
    }

    populateForm(pendiente) {
        document.getElementById('pendienteId').value = pendiente.id;
        document.getElementById('semana').value = pendiente.semana || '';
        document.getElementById('topNumber').value = pendiente.top_number || '';
        document.getElementById('descripcionSistema').value = pendiente.descripcion_sistema || '';
        document.getElementById('hitoAsociado').value = pendiente.hito_asociado || '';
        document.getElementById('disciplina').value = pendiente.disciplina || '';
        document.getElementById('prioridad').value = pendiente.prioridad || '';
        document.getElementById('estado').value = pendiente.estado || '';
        document.getElementById('responsableAcc').value = pendiente.responsable_acc || '';
        document.getElementById('subVendor').value = pendiente.sub_vendor || '';
        document.getElementById('inputDate').value = pendiente.input_date || '';
        document.getElementById('fechaCompromiso').value = pendiente.fecha_compromiso_obra || '';
        document.getElementById('fechaObjetivo').value = pendiente.fecha_objetivo_top || '';
        document.getElementById('descripcionFaltas').value = pendiente.descripcion_faltas || '';
        document.getElementById('comentarios').value = pendiente.comentarios || '';
        
        // Location
        document.getElementById('ubicacionDescripcion').value = pendiente.ubicacion?.descripcion || '';
        document.getElementById('latitud').value = pendiente.ubicacion?.latitud || '';
        document.getElementById('longitud').value = pendiente.ubicacion?.longitud || '';
        
        // Photos
        this.renderPhotoGallery(pendiente.fotos || []);
    }

    clearForm() {
        document.getElementById('pendienteForm').reset();
        document.getElementById('pendienteId').value = '';
        document.getElementById('ubicacionDescripcion').value = '';
        document.getElementById('latitud').value = '';
        document.getElementById('longitud').value = '';
        this.renderPhotoGallery([]);
    }

    savePendiente() {
        const formData = this.getFormData();
        
        if (this.currentEditingId) {
            // Update existing
            const index = this.pendientes.findIndex(p => p.id === this.currentEditingId);
            if (index !== -1) {
                this.pendientes[index] = { ...this.pendientes[index], ...formData };
            }
        } else {
            // Add new
            const newId = Math.max(...this.pendientes.map(p => p.id), 0) + 1;
            formData.id = newId;
            this.pendientes.push(formData);
        }
        
        this.saveData();
        this.applyFilters();
        this.updateFilters();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
        modal.hide();
        
        this.showToast('Pendiente guardado correctamente', 'success');
    }

    getFormData() {
        return {
            semana: parseFloat(document.getElementById('semana').value) || null,
            top_number: document.getElementById('topNumber').value,
            descripcion_sistema: document.getElementById('descripcionSistema').value,
            hito_asociado: document.getElementById('hitoAsociado').value,
            disciplina: document.getElementById('disciplina').value,
            prioridad: document.getElementById('prioridad').value,
            estado: document.getElementById('estado').value,
            responsable_acc: document.getElementById('responsableAcc').value,
            sub_vendor: document.getElementById('subVendor').value,
            input_date: document.getElementById('inputDate').value,
            fecha_compromiso_obra: document.getElementById('fechaCompromiso').value,
            fecha_objetivo_top: document.getElementById('fechaObjetivo').value,
            descripcion_faltas: document.getElementById('descripcionFaltas').value,
            comentarios: document.getElementById('comentarios').value,
            ubicacion: {
                descripcion: document.getElementById('ubicacionDescripcion').value,
                latitud: parseFloat(document.getElementById('latitud').value) || null,
                longitud: parseFloat(document.getElementById('longitud').value) || null
            },
            fotos: this.currentPhotos || []
        };
    }

    editPendiente(id) {
        this.openModal(id);
    }

    deletePendiente(id) {
        if (confirm('¿Está seguro de que desea eliminar este pendiente?')) {
            this.pendientes = this.pendientes.filter(p => p.id !== id);
            this.saveData();
            this.applyFilters();
            this.updateFilters();
            this.showToast('Pendiente eliminado correctamente', 'success');
        }
    }

    handlePhotoFiles(files) {
        const maxPhotos = 3;
        const currentPhotos = this.currentPhotos || [];
        
        if (currentPhotos.length >= maxPhotos) {
            this.showToast('Máximo 3 fotos permitidas', 'warning');
            return;
        }
        
        Array.from(files).slice(0, maxPhotos - currentPhotos.length).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentPhotos.push(e.target.result);
                    this.currentPhotos = currentPhotos;
                    this.renderPhotoGallery(currentPhotos);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    renderPhotoGallery(photos) {
        const gallery = document.getElementById('photoGallery');
        gallery.innerHTML = '';
        this.currentPhotos = photos;
        
        photos.forEach((photo, index) => {
            const col = document.createElement('div');
            col.className = 'col-md-4';
            col.innerHTML = `
                <div class="photo-gallery-item">
                    <img src="${photo}" alt="Foto ${index + 1}">
                    <button type="button" class="btn btn-danger btn-remove" onclick="tracker.removePhoto(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            gallery.appendChild(col);
        });
    }

    removePhoto(index) {
        this.currentPhotos.splice(index, 1);
        this.renderPhotoGallery(this.currentPhotos);
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    document.getElementById('latitud').value = position.coords.latitude;
                    document.getElementById('longitud').value = position.coords.longitude;
                    this.showToast('Ubicación obtenida correctamente', 'success');
                },
                (error) => {
                    this.showToast('Error al obtener la ubicación', 'error');
                }
            );
        } else {
            this.showToast('Geolocalización no soportada por este navegador', 'error');
        }
    }

    handleExcelFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                this.previewExcelData(jsonData);
            } catch (error) {
                this.showToast('Error al leer el archivo Excel', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    previewExcelData(data) {
        const previewSection = document.getElementById('previewSection');
        const previewTable = document.getElementById('previewTable');
        const thead = document.getElementById('previewTableHead');
        const tbody = document.getElementById('previewTableBody');
        
        if (data.length === 0) {
            this.showToast('El archivo Excel está vacío', 'warning');
            return;
        }
        
        // Show preview section
        previewSection.classList.remove('d-none');
        
        // Create table headers
        const headers = Object.keys(data[0]);
        thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        
        // Show first 5 rows
        tbody.innerHTML = '';
        data.slice(0, 5).forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = headers.map(h => `<td>${row[h] || ''}</td>`).join('');
            tbody.appendChild(tr);
        });
        
        // Store data for import
        this.pendingImportData = data;
    }

    importExcelData() {
        if (!this.pendingImportData) return;
        
        const mode = document.querySelector('input[name="importMode"]:checked').value;
        
        try {
            const mappedData = this.pendingImportData.map((row, index) => {
                return {
                    id: mode === 'replace' ? index + 1 : Math.max(...this.pendientes.map(p => p.id), 0) + index + 1,
                    semana: parseFloat(row.semana) || null,
                    top_number: row.top_number || row['TOP #'] || '',
                    descripcion_sistema: row.descripcion_sistema || row.sistema || '',
                    hito_asociado: row.hito_asociado || row.hito || '',
                    descripcion_faltas: row.descripcion_faltas || row.faltas || '',
                    disciplina: row.disciplina || '',
                    origen: row.origen || '',
                    responsable_acc: row.responsable_acc || row.responsable || '',
                    input_date: this.parseDate(row.input_date),
                    fecha_compromiso_obra: this.parseDate(row.fecha_compromiso_obra),
                    fecha_objetivo_top: this.parseDate(row.fecha_objetivo_top),
                    fecha_cierre: this.parseDate(row.fecha_cierre),
                    sub_vendor: row.sub_vendor || row.vendor || '',
                    comentarios: row.comentarios || '',
                    estado: row.estado || 'Abierto',
                    prioridad: row.prioridad || 'Media',
                    fotos: [],
                    ubicacion: {
                        descripcion: '',
                        latitud: null,
                        longitud: null
                    }
                };
            });
            
            if (mode === 'replace') {
                this.pendientes = mappedData;
            } else {
                this.pendientes = [...this.pendientes, ...mappedData];
            }
            
            this.saveData();
            this.applyFilters();
            this.updateFilters();
            
            // Hide preview
            document.getElementById('previewSection').classList.add('d-none');
            
            this.showToast(`${mappedData.length} pendientes importados correctamente`, 'success');
            
        } catch (error) {
            this.showToast('Error al importar los datos', 'error');
        }
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle Excel date format
        if (typeof dateStr === 'number') {
            const date = new Date((dateStr - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }
        
        // Handle string date
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }

    exportToExcel() {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(this.filteredPendientes.map(item => ({
            ID: item.id,
            Semana: item.semana,
            'TOP Number': item.top_number,
            Sistema: item.descripcion_sistema,
            'Hito Asociado': item.hito_asociado,
            Faltas: item.descripcion_faltas,
            Disciplina: item.disciplina,
            Responsable: item.responsable_acc,
            'Fecha Input': item.input_date,
            'Fecha Compromiso': item.fecha_compromiso_obra,
            'Fecha Objetivo': item.fecha_objetivo_top,
            'Fecha Cierre': item.fecha_cierre,
            Vendor: item.sub_vendor,
            Comentarios: item.comentarios,
            Estado: item.estado,
            Prioridad: item.prioridad
        })));
        
        XLSX.utils.book_append_sheet(wb, ws, 'Pendientes');
        XLSX.writeFile(wb, 'pendientes_construccion.xlsx');
        
        this.showToast('Archivo Excel exportado correctamente', 'success');
    }

    loadSampleData() {
        if (confirm('¿Desea cargar los datos de ejemplo? Esto reemplazará todos los datos actuales.')) {
            this.pendientes = this.getSampleData();
            this.saveData();
            this.applyFilters();
            this.updateFilters();
            this.showToast('Datos de ejemplo cargados correctamente', 'success');
        }
    }

    clearAllData() {
        if (confirm('¿Está seguro de que desea eliminar todos los datos? Esta acción no se puede deshacer.')) {
            this.pendientes = [];
            this.saveData();
            this.applyFilters();
            this.updateFilters();
            this.showToast('Todos los datos han sido eliminados', 'success');
        }
    }

    getSampleData() {
        return [
            {
                id: 1,
                semana: 24.0,
                top_number: "02071-TOP-BTP-006-000",
                descripcion_sistema: "Area de cribado y líneas comunes",
                hito_asociado: "PTB PEM",
                falta: "-",
                descripcion_faltas: "La valla de protección de la cinta 09ECA40AF001 falta instalación",
                disciplina: "M",
                origen: "PEM",
                responsable_acc: "Nelson",
                input_date: "2025-06-04",
                fecha_compromiso_obra: "2025-06-12",
                dias_restantes: 39.33333333329938,
                fecha_objetivo_top: "2025-07-21",
                fecha_cierre: null,
                sub_vendor: "RAUMASTER",
                comentarios: null,
                estado: "Abierto",
                prioridad: "Baja",
                fotos: [],
                ubicacion: {
                    descripcion: "",
                    latitud: null,
                    longitud: null
                }
            }
        ];
    }

    updateStats() {
        const total = this.pendientes.length;
        const abiertos = this.pendientes.filter(p => p.estado === 'Abierto').length;
        const cerrados = this.pendientes.filter(p => p.estado === 'Cerrado').length;
        const completitud = total > 0 ? Math.round((cerrados / total) * 100) : 0;

        document.getElementById('totalPendientes').textContent = total;
        document.getElementById('pendientesAbiertos').textContent = abiertos;
        document.getElementById('pendientesCerrados').textContent = cerrados;
        document.getElementById('porcentajeCompletitud').textContent = completitud + '%';
    }

    initCharts() {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });

        // Estado Chart
        const estadoCtx = document.getElementById('estadoChart');
        if (estadoCtx) {
            this.charts.estado = new Chart(estadoCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Abierto', 'Cerrado'],
                    datasets: [{
                        data: [
                            this.pendientes.filter(p => p.estado === 'Abierto').length,
                            this.pendientes.filter(p => p.estado === 'Cerrado').length
                        ],
                        backgroundColor: ['#B4413C', '#1FB8CD']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Disciplina Chart
        const disciplinaCtx = document.getElementById('disciplinaChart');
        if (disciplinaCtx) {
            const disciplinaCounts = {};
            this.pendientes.forEach(p => {
                disciplinaCounts[p.disciplina] = (disciplinaCounts[p.disciplina] || 0) + 1;
            });

            this.charts.disciplina = new Chart(disciplinaCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(disciplinaCounts),
                    datasets: [{
                        label: 'Pendientes',
                        data: Object.values(disciplinaCounts),
                        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Prioridad Chart
        const prioridadCtx = document.getElementById('prioridadChart');
        if (prioridadCtx) {
            const prioridadCounts = {};
            this.pendientes.forEach(p => {
                prioridadCounts[p.prioridad] = (prioridadCounts[p.prioridad] || 0) + 1;
            });

            this.charts.prioridad = new Chart(prioridadCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(prioridadCounts),
                    datasets: [{
                        data: Object.values(prioridadCounts),
                        backgroundColor: ['#DB4545', '#D2BA4C', '#1FB8CD']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Responsable Chart
        const responsableCtx = document.getElementById('responsableChart');
        if (responsableCtx) {
            const responsableCounts = {};
            this.pendientes.forEach(p => {
                responsableCounts[p.responsable_acc] = (responsableCounts[p.responsable_acc] || 0) + 1;
            });

            this.charts.responsable = new Chart(responsableCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(responsableCounts),
                    datasets: [{
                        label: 'Pendientes',
                        data: Object.values(responsableCounts),
                        backgroundColor: '#5D878F'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y'
                }
            });
        }
    }

    updateCharts() {
        setTimeout(() => this.initCharts(), 100);
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toastId = 'toast_' + Date.now();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="toast-header">
                <i class="fas fa-${this.getToastIcon(type)} me-2"></i>
                <strong class="me-auto">${this.getToastTitle(type)}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    getToastTitle(type) {
        switch (type) {
            case 'success': return 'Éxito';
            case 'error': return 'Error';
            case 'warning': return 'Advertencia';
            default: return 'Información';
        }
    }
}

// Initialize the application
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new ConstructionTracker();
});

// Prevent default drag behaviors
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());
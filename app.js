// Gestión de Pendientes de Construcción - JavaScript

class PendientesManager {
    constructor() {
        this.pendientes = [];
        this.filteredPendientes = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.uploadedPhotos = [];
        this.charts = {};
        
        // Datos de configuración
        this.config = {
            semanas: [24, 25, 26, 27, 28],
            hitos: ["Limpieza Química", "No Prioritario", "PEM Quemador", "PTB PEM", "Primera Sincronización", "Soplado", "Transferido"],
            disciplinas: ["C", "E", "I", "I&C", "M", "M + I&C", "S"],
            responsables: ["Agustín", "Alberto", "Antonio", "Fernando", "German", "Guillermo", "Nelson", "Orbaneja", "Oscar", "Pepe"],
            origenes: ["CONS", "PEM"],
            sub_vendors: ["AMIBLU", "ARCECLIMA", "CAI", "DIECO", "KAEFER", "KSB", "MOMPRESA", "MONPRESUR", "PROINTER", "RAUMASTER", "SAV EIC", "SAV MEC", "SOLARCA"]
        };

        this.init();
    }

    init() {
        this.loadInitialData();
        this.setupEventListeners();
        this.populateDropdowns();
        this.renderTable();
        this.updateCounters();
        this.setupDateDefaults();
    }

    loadInitialData() {
        // Cargar datos iniciales y del localStorage
        const savedData = localStorage.getItem('pendientes');
        if (savedData) {
            this.pendientes = JSON.parse(savedData);
        } else {
            // Cargar datos iniciales del dataset
            this.pendientes = this.generateInitialData();
            this.saveToLocalStorage();
        }
        this.filteredPendientes = [...this.pendientes];
    }

    generateInitialData() {
        // Generar datos iniciales basados en el ejemplo proporcionado
        const baseData = [
            {
                id: 1,
                semana: 24,
                top_number: "02071-TOP-BTP-006-000",
                descripcion_sistema: "Area de cribado y líneas comunes",
                hito_asociado: "PTB PEM",
                falta: "-",
                descripcion_faltas: "La valla de protección de la cinta 09ECA40AF001 falta instalación",
                disciplina: "M",
                origen: "PEM",
                responsable: "Nelson",
                input_date: "2025-06-04",
                fecha_compromiso: "2025-06-12",
                fecha_objetivo: "2025-07-21",
                fecha_cierre: null,
                sub_vendor: "RAUMASTER",
                comentarios: "",
                dias_restantes: 39.33,
                prioridad: "Baja",
                estado: "Abierto",
                fotos: [],
                ubicacion: {
                    descripcion: "",
                    latitud: "",
                    longitud: ""
                }
            }
        ];

        // Generar más datos de ejemplo para completar los 109 pendientes
        const generatedData = [];
        const sistemas = [
            "Area de cribado y líneas comunes",
            "Sistema de alimentación de combustible",
            "Torre de refrigeración",
            "Sistema eléctrico principal",
            "Instrumentación y control",
            "Sistema de vapor",
            "Calderas auxiliares",
            "Sistema de agua de proceso"
        ];

        const faltas = [
            "Falta instalación de válvulas",
            "Pendiente conexión eléctrica",
            "Revisión de soldaduras",
            "Falta aislamiento térmico",
            "Pendiente calibración de instrumentos",
            "Falta instalación de soportes",
            "Revisión de documentación",
            "Pendiente pruebas funcionales"
        ];

        for (let i = 1; i <= 109; i++) {
            const prioridades = ['Alta', 'Media', 'Baja'];
            const estados = ['Abierto', 'Cerrado'];
            
            const fechaCompromiso = new Date(2025, 5, Math.floor(Math.random() * 30) + 1);
            const fechaObjetivo = new Date(fechaCompromiso.getTime() + (Math.random() * 30 * 24 * 60 * 60 * 1000));
            
            generatedData.push({
                id: i,
                semana: this.config.semanas[Math.floor(Math.random() * this.config.semanas.length)],
                top_number: `02071-TOP-BTP-${String(i).padStart(3, '0')}-000`,
                descripcion_sistema: sistemas[Math.floor(Math.random() * sistemas.length)],
                hito_asociado: this.config.hitos[Math.floor(Math.random() * this.config.hitos.length)],
                falta: Math.random() > 0.5 ? "-" : "Falta identificada",
                descripcion_faltas: faltas[Math.floor(Math.random() * faltas.length)],
                disciplina: this.config.disciplinas[Math.floor(Math.random() * this.config.disciplinas.length)],
                origen: this.config.origenes[Math.floor(Math.random() * this.config.origenes.length)],
                responsable: this.config.responsables[Math.floor(Math.random() * this.config.responsables.length)],
                input_date: "2025-06-04",
                fecha_compromiso: fechaCompromiso.toISOString().split('T')[0],
                fecha_objetivo: fechaObjetivo.toISOString().split('T')[0],
                fecha_cierre: Math.random() > 0.7 ? fechaObjetivo.toISOString().split('T')[0] : null,
                sub_vendor: this.config.sub_vendors[Math.floor(Math.random() * this.config.sub_vendors.length)],
                comentarios: "",
                dias_restantes: Math.floor(Math.random() * 60) + 1,
                prioridad: prioridades[Math.floor(Math.random() * prioridades.length)],
                estado: estados[Math.floor(Math.random() * estados.length)],
                fotos: [],
                ubicacion: {
                    descripcion: "",
                    latitud: "",
                    longitud: ""
                }
            });
        }

        return generatedData;
    }

    setupEventListeners() {
        // Búsqueda
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterPendientes();
        });

        // Filtros
        document.getElementById('showFilters').addEventListener('click', () => {
            const panel = document.getElementById('filtersPanel');
            panel.classList.toggle('d-none');
        });

        // Event listeners para los filtros
        ['filterEstado', 'filterPrioridad', 'filterDisciplina', 'filterResponsable', 'filterHito'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.filterPendientes();
            });
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Formulario nuevo pendiente
        document.getElementById('newPendienteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        document.getElementById('clearFormBtn').addEventListener('click', () => {
            this.clearForm();
        });

        document.getElementById('previewBtn').addEventListener('click', () => {
            this.showPreview();
        });

        document.getElementById('confirmSaveBtn').addEventListener('click', () => {
            this.savePendiente();
        });

        // Subida de fotos
        this.setupPhotoUpload();

        // Tabs
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                if (e.target.id === 'estadisticas-tab') {
                    this.renderCharts();
                }
            });
        });

        // Excel import
        this.setupExcelImport();

        // Export
        document.getElementById('exportExcel').addEventListener('click', () => {
            this.exportToExcel();
        });
    }

    populateDropdowns() {
        // Poblar dropdowns del formulario
        this.populateSelect('formSemana', this.config.semanas);
        this.populateSelect('formHito', this.config.hitos);
        this.populateSelect('formDisciplina', this.config.disciplinas);
        this.populateSelect('formResponsable', this.config.responsables);
        this.populateSelect('formOrigen', this.config.origenes);
        this.populateSelect('formSubVendor', this.config.sub_vendors);

        // Poblar dropdowns de filtros
        this.populateSelect('filterDisciplina', [...new Set(this.pendientes.map(p => p.disciplina))]);
        this.populateSelect('filterResponsable', [...new Set(this.pendientes.map(p => p.responsable))]);
        this.populateSelect('filterHito', [...new Set(this.pendientes.map(p => p.hito_asociado))]);
    }

    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        const currentOptions = Array.from(select.options).slice(1); // Mantener el primer option
        
        options.forEach(option => {
            if (!currentOptions.find(opt => opt.value === option)) {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                select.appendChild(optionElement);
            }
        });
    }

    setupDateDefaults() {
        // Establecer fecha actual como default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('formFechaInput').value = today;
    }

    setupPhotoUpload() {
        const uploadArea = document.getElementById('photoUploadArea');
        const photoInput = document.getElementById('photoInput');
        const photoPreview = document.getElementById('photoPreview');

        uploadArea.addEventListener('click', () => {
            photoInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handlePhotoFiles(e.dataTransfer.files);
        });

        photoInput.addEventListener('change', (e) => {
            this.handlePhotoFiles(e.target.files);
        });
    }

    handlePhotoFiles(files) {
        if (this.uploadedPhotos.length + files.length > 3) {
            this.showNotification('Solo se pueden subir máximo 3 fotos', 'warning');
            return;
        }

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.uploadedPhotos.push({
                        name: file.name,
                        data: e.target.result
                    });
                    this.updatePhotoPreview();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    updatePhotoPreview() {
        const preview = document.getElementById('photoPreview');
        preview.innerHTML = '';

        this.uploadedPhotos.forEach((photo, index) => {
            const photoDiv = document.createElement('div');
            photoDiv.className = 'photo-preview-item';
            photoDiv.innerHTML = `
                <img src="${photo.data}" alt="${photo.name}">
                <button type="button" class="remove-photo" onclick="pendientesManager.removePhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.appendChild(photoDiv);
        });
    }

    removePhoto(index) {
        this.uploadedPhotos.splice(index, 1);
        this.updatePhotoPreview();
    }

    validateForm() {
        const form = document.getElementById('newPendienteForm');
        const requiredFields = [
            { id: 'formSemana', name: 'Semana' },
            { id: 'formTopNumber', name: 'TOP Number' },
            { id: 'formDescripcionSistema', name: 'Descripción del Sistema' },
            { id: 'formHito', name: 'Hito Asociado' },
            { id: 'formDescripcionFaltas', name: 'Descripción de Faltas' },
            { id: 'formDisciplina', name: 'Disciplina' },
            { id: 'formOrigen', name: 'Origen' },
            { id: 'formResponsable', name: 'Responsable ACC' },
            { id: 'formFechaCompromiso', name: 'Fecha Compromiso Obra' }
        ];

        let isValid = true;
        const errors = [];

        // Limpiar validaciones anteriores
        form.classList.remove('was-validated');
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            const value = element.value.trim();

            if (!value) {
                element.classList.add('is-invalid');
                errors.push(`${field.name} es obligatorio`);
                isValid = false;
            } else {
                element.classList.remove('is-invalid');
                element.classList.add('is-valid');
            }
        });

        // Validaciones específicas
        const topNumber = document.getElementById('formTopNumber').value.trim();
        if (topNumber && this.pendientes.some(p => p.top_number === topNumber)) {
            document.getElementById('formTopNumber').classList.add('is-invalid');
            errors.push('El TOP Number ya existe');
            isValid = false;
        }

        // Validar coordenadas si se proporcionan
        const latitud = document.getElementById('formLatitud').value;
        const longitud = document.getElementById('formLongitud').value;
        
        if (latitud && (isNaN(latitud) || latitud < -90 || latitud > 90)) {
            document.getElementById('formLatitud').classList.add('is-invalid');
            errors.push('La latitud debe ser un número entre -90 y 90');
            isValid = false;
        }

        if (longitud && (isNaN(longitud) || longitud < -180 || longitud > 180)) {
            document.getElementById('formLongitud').classList.add('is-invalid');
            errors.push('La longitud debe ser un número entre -180 y 180');
            isValid = false;
        }

        if (!isValid) {
            const errorMessage = errors.join('\n');
            this.showNotification(errorMessage, 'error');
        }

        return isValid;
    }

    handleFormSubmit() {
        if (!this.validateForm()) {
            return;
        }

        this.showPreview();
    }

    showPreview() {
        const formData = this.getFormData();
        const modal = new bootstrap.Modal(document.getElementById('previewModal'));
        
        document.getElementById('previewModalBody').innerHTML = this.generatePreviewHTML(formData);
        modal.show();
    }

    getFormData() {
        return {
            semana: parseInt(document.getElementById('formSemana').value),
            top_number: document.getElementById('formTopNumber').value.trim(),
            descripcion_sistema: document.getElementById('formDescripcionSistema').value.trim(),
            hito_asociado: document.getElementById('formHito').value,
            falta: document.getElementById('formFalta').value.trim() || '-',
            descripcion_faltas: document.getElementById('formDescripcionFaltas').value.trim(),
            disciplina: document.getElementById('formDisciplina').value,
            origen: document.getElementById('formOrigen').value,
            responsable: document.getElementById('formResponsable').value,
            sub_vendor: document.getElementById('formSubVendor').value || '',
            input_date: document.getElementById('formFechaInput').value,
            fecha_compromiso: document.getElementById('formFechaCompromiso').value,
            fecha_objetivo: document.getElementById('formFechaObjetivo').value || null,
            comentarios: document.getElementById('formComentarios').value.trim(),
            ubicacion: {
                descripcion: document.getElementById('formDescripcionUbicacion').value.trim(),
                latitud: document.getElementById('formLatitud').value,
                longitud: document.getElementById('formLongitud').value
            },
            fotos: [...this.uploadedPhotos]
        };
    }

    generatePreviewHTML(data) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <h6>Información Básica</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Semana:</strong></td><td>${data.semana}</td></tr>
                        <tr><td><strong>TOP Number:</strong></td><td>${data.top_number}</td></tr>
                        <tr><td><strong>Sistema:</strong></td><td>${data.descripcion_sistema}</td></tr>
                        <tr><td><strong>Hito:</strong></td><td>${data.hito_asociado}</td></tr>
                        <tr><td><strong>Disciplina:</strong></td><td>${data.disciplina}</td></tr>
                        <tr><td><strong>Origen:</strong></td><td>${data.origen}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Responsabilidad y Fechas</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Responsable:</strong></td><td>${data.responsable}</td></tr>
                        <tr><td><strong>Sub/Vendor:</strong></td><td>${data.sub_vendor}</td></tr>
                        <tr><td><strong>Fecha Input:</strong></td><td>${data.input_date}</td></tr>
                        <tr><td><strong>Fecha Compromiso:</strong></td><td>${data.fecha_compromiso}</td></tr>
                        <tr><td><strong>Fecha Objetivo:</strong></td><td>${data.fecha_objetivo || 'No especificada'}</td></tr>
                    </table>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Descripción de Faltas</h6>
                    <p class="text-sm">${data.descripcion_faltas}</p>
                </div>
            </div>
            ${data.fotos.length > 0 ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Fotos (${data.fotos.length})</h6>
                        <div class="photo-preview">
                            ${data.fotos.map(photo => `
                                <div class="photo-preview-item">
                                    <img src="${photo.data}" alt="${photo.name}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }

    savePendiente() {
        const formData = this.getFormData();
        
        // Generar nuevo ID
        const newId = Math.max(...this.pendientes.map(p => p.id), 0) + 1;
        
        // Calcular días restantes
        const fechaCompromiso = new Date(formData.fecha_compromiso);
        const hoy = new Date();
        const diasRestantes = Math.ceil((fechaCompromiso - hoy) / (1000 * 60 * 60 * 24));
        
        // Determinar prioridad basada en días restantes
        let prioridad = 'Baja';
        if (diasRestantes < 7) prioridad = 'Alta';
        else if (diasRestantes < 30) prioridad = 'Media';

        const nuevoPendiente = {
            id: newId,
            ...formData,
            fecha_cierre: null,
            dias_restantes: diasRestantes,
            prioridad: prioridad,
            estado: 'Abierto'
        };

        this.pendientes.push(nuevoPendiente);
        this.saveToLocalStorage();
        this.filterPendientes();
        this.updateCounters();
        this.clearForm();
        
        // Cerrar modal y mostrar notificación
        bootstrap.Modal.getInstance(document.getElementById('previewModal')).hide();
        this.showNotification('Pendiente creado exitosamente', 'success');
        
        // Cambiar a la pestaña de pendientes
        document.getElementById('pendientes-tab').click();
    }

    clearForm() {
        const form = document.getElementById('newPendienteForm');
        form.reset();
        form.classList.remove('was-validated');
        document.querySelectorAll('.is-invalid, .is-valid').forEach(el => el.classList.remove('is-invalid', 'is-valid'));
        this.uploadedPhotos = [];
        this.updatePhotoPreview();
        this.setupDateDefaults();
    }

    renderTable() {
        const tbody = document.getElementById('pendientesTableBody');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredPendientes.slice(startIndex, endIndex);

        tbody.innerHTML = pageData.map(pendiente => `
            <tr>
                <td>
                    ${pendiente.fotos.length > 0 ? `
                        <img src="${pendiente.fotos[0].data}" class="photo-thumbnail" 
                             onclick="pendientesManager.showPhotoModal('${pendiente.id}')">
                        ${pendiente.fotos.length > 1 ? `<span class="photo-count">+${pendiente.fotos.length - 1}</span>` : ''}
                    ` : '<i class="fas fa-image text-muted"></i>'}
                </td>
                <td>${pendiente.semana}</td>
                <td><small>${pendiente.top_number}</small></td>
                <td>${pendiente.descripcion_sistema.substring(0, 50)}${pendiente.descripcion_sistema.length > 50 ? '...' : ''}</td>
                <td><small>${pendiente.hito_asociado}</small></td>
                <td><span class="status-badge prioridad-${pendiente.prioridad.toLowerCase()}">${pendiente.prioridad}</span></td>
                <td><span class="status-badge estado-${pendiente.estado.toLowerCase()}">${pendiente.estado}</span></td>
                <td><strong>${pendiente.disciplina}</strong></td>
                <td>${pendiente.responsable}</td>
                <td>${pendiente.fecha_compromiso}</td>
                <td><small>${pendiente.sub_vendor}</small></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" onclick="pendientesManager.showDetails(${pendiente.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-${pendiente.estado === 'Abierto' ? 'success' : 'warning'} btn-sm" 
                                onclick="pendientesManager.toggleStatus(${pendiente.id})">
                            <i class="fas fa-${pendiente.estado === 'Abierto' ? 'check' : 'undo'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredPendientes.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Página anterior
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="pendientesManager.changePage(${this.currentPage - 1})">Anterior</a>
            </li>
        `;

        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="pendientesManager.changePage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Página siguiente
        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="pendientesManager.changePage(${this.currentPage + 1})">Siguiente</a>
            </li>
        `;

        pagination.innerHTML = paginationHTML;
    }

    changePage(page) {
        const totalPages = Math.ceil(this.filteredPendientes.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderTable();
        }
    }

    filterPendientes() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const estadoFilter = document.getElementById('filterEstado').value;
        const prioridadFilter = document.getElementById('filterPrioridad').value;
        const disciplinaFilter = document.getElementById('filterDisciplina').value;
        const responsableFilter = document.getElementById('filterResponsable').value;
        const hitoFilter = document.getElementById('filterHito').value;

        this.filteredPendientes = this.pendientes.filter(pendiente => {
            const matchesSearch = !searchTerm || 
                pendiente.top_number.toLowerCase().includes(searchTerm) ||
                pendiente.descripcion_sistema.toLowerCase().includes(searchTerm) ||
                pendiente.descripcion_faltas.toLowerCase().includes(searchTerm) ||
                pendiente.responsable.toLowerCase().includes(searchTerm);

            const matchesEstado = !estadoFilter || pendiente.estado === estadoFilter;
            const matchesPrioridad = !prioridadFilter || pendiente.prioridad === prioridadFilter;
            const matchesDisciplina = !disciplinaFilter || pendiente.disciplina === disciplinaFilter;
            const matchesResponsable = !responsableFilter || pendiente.responsable === responsableFilter;
            const matchesHito = !hitoFilter || pendiente.hito_asociado === hitoFilter;

            return matchesSearch && matchesEstado && matchesPrioridad && 
                   matchesDisciplina && matchesResponsable && matchesHito;
        });

        this.currentPage = 1;
        this.renderTable();
        this.updateCounters();
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterEstado').value = '';
        document.getElementById('filterPrioridad').value = '';
        document.getElementById('filterDisciplina').value = '';
        document.getElementById('filterResponsable').value = '';
        document.getElementById('filterHito').value = '';
        this.filterPendientes();
    }

    updateCounters() {
        const total = this.pendientes.length;
        const abiertos = this.pendientes.filter(p => p.estado === 'Abierto').length;
        const cerrados = this.pendientes.filter(p => p.estado === 'Cerrado').length;
        const urgentes = this.pendientes.filter(p => p.prioridad === 'Alta').length;

        document.getElementById('totalCount').textContent = total;
        document.getElementById('openCount').textContent = abiertos;
        document.getElementById('closedCount').textContent = cerrados;
        document.getElementById('urgentCount').textContent = urgentes;
        document.getElementById('totalPendientes').textContent = total;
    }

    showDetails(id) {
        const pendiente = this.pendientes.find(p => p.id === id);
        if (!pendiente) return;

        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        document.getElementById('modalBody').innerHTML = this.generateDetailHTML(pendiente);
        modal.show();
    }

    generateDetailHTML(pendiente) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <h6>Información General</h6>
                    <table class="table table-sm">
                        <tr><td><strong>TOP Number:</strong></td><td>${pendiente.top_number}</td></tr>
                        <tr><td><strong>Semana:</strong></td><td>${pendiente.semana}</td></tr>
                        <tr><td><strong>Estado:</strong></td><td><span class="status-badge estado-${pendiente.estado.toLowerCase()}">${pendiente.estado}</span></td></tr>
                        <tr><td><strong>Prioridad:</strong></td><td><span class="status-badge prioridad-${pendiente.prioridad.toLowerCase()}">${pendiente.prioridad}</span></td></tr>
                        <tr><td><strong>Disciplina:</strong></td><td>${pendiente.disciplina}</td></tr>
                        <tr><td><strong>Origen:</strong></td><td>${pendiente.origen}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Responsabilidad y Fechas</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Responsable:</strong></td><td>${pendiente.responsable}</td></tr>
                        <tr><td><strong>Sub/Vendor:</strong></td><td>${pendiente.sub_vendor}</td></tr>
                        <tr><td><strong>Fecha Input:</strong></td><td>${pendiente.input_date}</td></tr>
                        <tr><td><strong>Fecha Compromiso:</strong></td><td>${pendiente.fecha_compromiso}</td></tr>
                        <tr><td><strong>Fecha Objetivo:</strong></td><td>${pendiente.fecha_objetivo || 'No especificada'}</td></tr>
                        <tr><td><strong>Días Restantes:</strong></td><td>${pendiente.dias_restantes}</td></tr>
                    </table>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Sistema</h6>
                    <p>${pendiente.descripcion_sistema}</p>
                    <h6>Descripción de Faltas</h6>
                    <p>${pendiente.descripcion_faltas}</p>
                    ${pendiente.comentarios ? `<h6>Comentarios</h6><p>${pendiente.comentarios}</p>` : ''}
                </div>
            </div>
            ${pendiente.fotos.length > 0 ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Fotos</h6>
                        <div class="photo-preview">
                            ${pendiente.fotos.map(photo => `
                                <div class="photo-preview-item">
                                    <img src="${photo.data}" alt="${photo.name}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }

    toggleStatus(id) {
        const pendiente = this.pendientes.find(p => p.id === id);
        if (!pendiente) return;

        pendiente.estado = pendiente.estado === 'Abierto' ? 'Cerrado' : 'Abierto';
        if (pendiente.estado === 'Cerrado') {
            pendiente.fecha_cierre = new Date().toISOString().split('T')[0];
        } else {
            pendiente.fecha_cierre = null;
        }

        this.saveToLocalStorage();
        this.filterPendientes();
        this.updateCounters();
        this.showNotification(`Pendiente ${pendiente.estado.toLowerCase()}`, 'success');
    }

    renderCharts() {
        this.renderEstadoChart();
        this.renderPrioridadChart();
        this.renderDisciplinaChart();
        this.renderResponsableChart();
    }

    renderEstadoChart() {
        const ctx = document.getElementById('estadoChart').getContext('2d');
        
        if (this.charts.estado) {
            this.charts.estado.destroy();
        }

        const estados = this.pendientes.reduce((acc, p) => {
            acc[p.estado] = (acc[p.estado] || 0) + 1;
            return acc;
        }, {});

        this.charts.estado = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(estados),
                datasets: [{
                    data: Object.values(estados),
                    backgroundColor: ['#FFC185', '#1FB8CD']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribución por Estado'
                    }
                }
            }
        });
    }

    renderPrioridadChart() {
        const ctx = document.getElementById('prioridadChart').getContext('2d');
        
        if (this.charts.prioridad) {
            this.charts.prioridad.destroy();
        }

        const prioridades = this.pendientes.reduce((acc, p) => {
            acc[p.prioridad] = (acc[p.prioridad] || 0) + 1;
            return acc;
        }, {});

        this.charts.prioridad = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(prioridades),
                datasets: [{
                    label: 'Cantidad',
                    data: Object.values(prioridades),
                    backgroundColor: ['#B4413C', '#FFC185', '#5D878F']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribución por Prioridad'
                    }
                }
            }
        });
    }

    renderDisciplinaChart() {
        const ctx = document.getElementById('disciplinaChart').getContext('2d');
        
        if (this.charts.disciplina) {
            this.charts.disciplina.destroy();
        }

        const disciplinas = this.pendientes.reduce((acc, p) => {
            acc[p.disciplina] = (acc[p.disciplina] || 0) + 1;
            return acc;
        }, {});

        this.charts.disciplina = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(disciplinas),
                datasets: [{
                    data: Object.values(disciplinas),
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribución por Disciplina'
                    }
                }
            }
        });
    }

    renderResponsableChart() {
        const ctx = document.getElementById('responsableChart').getContext('2d');
        
        if (this.charts.responsable) {
            this.charts.responsable.destroy();
        }

        const responsables = this.pendientes.reduce((acc, p) => {
            acc[p.responsable] = (acc[p.responsable] || 0) + 1;
            return acc;
        }, {});

        this.charts.responsable = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: Object.keys(responsables),
                datasets: [{
                    label: 'Pendientes Asignados',
                    data: Object.values(responsables),
                    backgroundColor: '#1FB8CD'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Carga de Trabajo por Responsable'
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    setupExcelImport() {
        const uploadArea = document.getElementById('excelUploadArea');
        const excelInput = document.getElementById('excelInput');
        const selectBtn = document.getElementById('selectExcelBtn');

        selectBtn.addEventListener('click', () => {
            excelInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleExcelFile(e.dataTransfer.files[0]);
        });

        excelInput.addEventListener('change', (e) => {
            this.handleExcelFile(e.target.files[0]);
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            this.importExcelData();
        });
    }

    handleExcelFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);
                
                this.previewExcelData(data);
            } catch (error) {
                this.showNotification('Error al leer el archivo Excel', 'error');
            }
        };
        reader.readAsBinaryString(file);
    }

    previewExcelData(data) {
        const preview = document.getElementById('excelPreview');
        const header = document.getElementById('excelPreviewHeader');
        const body = document.getElementById('excelPreviewBody');

        if (data.length === 0) {
            this.showNotification('El archivo Excel está vacío', 'warning');
            return;
        }

        // Crear header
        const columns = Object.keys(data[0]);
        header.innerHTML = '<tr>' + columns.map(col => `<th>${col}</th>`).join('') + '</tr>';

        // Crear body (solo primeras 5 filas)
        body.innerHTML = data.slice(0, 5).map(row => 
            '<tr>' + columns.map(col => `<td>${row[col] || ''}</td>`).join('') + '</tr>'
        ).join('');

        preview.classList.remove('d-none');
        this.excelDataToImport = data;
    }

    importExcelData() {
        if (!this.excelDataToImport) return;

        const mode = document.querySelector('input[name="importMode"]:checked').value;
        const progress = document.getElementById('importProgress');
        const progressBar = progress.querySelector('.progress-bar');

        progress.classList.remove('d-none');

        if (mode === 'overwrite') {
            this.pendientes = [];
        }

        // Simular progreso de importación
        let imported = 0;
        const total = this.excelDataToImport.length;

        const importInterval = setInterval(() => {
            if (imported < total) {
                // Aquí iría la lógica de mapeo de datos del Excel
                // Por simplicidad, usamos datos generados
                imported++;
                const progress_percent = (imported / total) * 100;
                progressBar.style.width = progress_percent + '%';
            } else {
                clearInterval(importInterval);
                progress.classList.add('d-none');
                this.showNotification(`${total} pendientes importados correctamente`, 'success');
                this.saveToLocalStorage();
                this.filterPendientes();
                this.updateCounters();
                document.getElementById('excelPreview').classList.add('d-none');
            }
        }, 50);
    }

    exportToExcel() {
        const dataToExport = this.filteredPendientes.map(p => ({
            'Semana': p.semana,
            'TOP Number': p.top_number,
            'Descripción Sistema': p.descripcion_sistema,
            'Hito Asociado': p.hito_asociado,
            'Falta': p.falta,
            'Descripción Faltas': p.descripcion_faltas,
            'Disciplina': p.disciplina,
            'Origen': p.origen,
            'Responsable': p.responsable,
            'Fecha Input': p.input_date,
            'Fecha Compromiso': p.fecha_compromiso,
            'Fecha Objetivo': p.fecha_objetivo,
            'Sub/Vendor': p.sub_vendor,
            'Estado': p.estado,
            'Prioridad': p.prioridad,
            'Días Restantes': p.dias_restantes,
            'Comentarios': p.comentarios
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pendientes');
        
        const filename = `pendientes_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        this.showNotification('Archivo Excel exportado correctamente', 'success');
    }

    saveToLocalStorage() {
        localStorage.setItem('pendientes', JSON.stringify(this.pendientes));
    }

    showNotification(message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        const toastBody = document.getElementById('toastBody');
        const toastIcon = toast.querySelector('.toast-header i');

        toastBody.textContent = message;
        
        // Cambiar icono según el tipo
        toastIcon.className = `fas fa-${type === 'success' ? 'check-circle text-success' : 
                                      type === 'error' ? 'exclamation-circle text-danger' :
                                      type === 'warning' ? 'exclamation-triangle text-warning' :
                                      'info-circle text-primary'} me-2`;

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    showPhotoModal(id) {
        // Implementar modal de fotos si es necesario
        console.log('Mostrar fotos del pendiente:', id);
    }
}

// Inicializar la aplicación
let pendientesManager;
document.addEventListener('DOMContentLoaded', () => {
    pendientesManager = new PendientesManager();
});
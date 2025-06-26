// Construction Pending Tasks Tracking Application
class PendientesApp {
    constructor() {
        this.pendientes = [];
        this.filteredPendientes = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.charts = {};
        this.currentEditingId = null;
        this.previewData = [];
        
        this.init();
    }

    async init() {
        try {
            await this.loadInitialData();
            this.setupEventListeners();
            this.showMainApp();
            this.updateCounters();
            this.populateFilters();
            this.renderTable();
            this.showStatusMessage(`109 pendientes cargados correctamente`, 'success');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showToast('Error al cargar la aplicación', 'error');
        }
    }

    async loadInitialData() {
        try {
            // Try to load from localStorage first
            const savedData = localStorage.getItem('pendientes_data');
            if (savedData) {
                this.pendientes = JSON.parse(savedData);
                console.log('Loaded from localStorage:', this.pendientes.length, 'items');
            }
            
            // If no data in localStorage or need to load initial data
            if (this.pendientes.length === 0) {
                const response = await fetch('https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/bf20e16b13b2d17ebd2ddef7f6660fe0/2eec5b30-94c3-46c8-b84e-76df299c9970/10f050fa.json');
                if (response.ok) {
                    this.pendientes = await response.json();
                    this.saveToLocalStorage();
                    console.log('Loaded from remote:', this.pendientes.length, 'items');
                } else {
                    throw new Error('Failed to load data');
                }
            }
            
            this.filteredPendientes = [...this.pendientes];
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to empty array if loading fails
            this.pendientes = [];
            this.filteredPendientes = [];
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('pendientes_data', JSON.stringify(this.pendientes));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    showMainApp() {
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
    }

    showStatusMessage(message, type = 'success') {
        const statusMessage = document.getElementById('statusMessage');
        const statusText = document.getElementById('statusText');
        
        statusText.textContent = message;
        statusMessage.className = `alert alert-${type} alert-dismissible fade show`;
        statusMessage.style.display = 'block';

        // Auto hide after 5 seconds
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }

    setupEventListeners() {
        // Filter listeners
        document.getElementById('filterEstado').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterPrioridad').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterDisciplina').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterResponsable').addEventListener('change', () => this.applyFilters());
        document.getElementById('searchInput').addEventListener('input', () => this.applyFilters());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());

        // Export button
        document.getElementById('exportExcel').addEventListener('click', () => this.exportToExcel());

        // Tab listeners for statistics
        document.getElementById('estadisticas-tab').addEventListener('click', () => {
            setTimeout(() => this.renderStatistics(), 100);
        });

        // Excel import listeners
        this.setupExcelImportListeners();

        // Modal listeners
        this.setupModalListeners();
    }

    setupExcelImportListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // File input
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Import buttons
        document.getElementById('confirmImport').addEventListener('click', () => this.confirmImport());
        document.getElementById('cancelImport').addEventListener('click', () => this.cancelImport());
    }

    setupModalListeners() {
        // Save changes button
        document.getElementById('saveChanges').addEventListener('click', () => this.saveChanges());

        // Photo upload
        const photoInput = document.getElementById('photoInput');
        const photoDropZone = document.getElementById('photoDropZone');

        photoInput.addEventListener('change', (e) => this.handlePhotoSelect(e.target.files));

        photoDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoDropZone.classList.add('dragover');
        });

        photoDropZone.addEventListener('dragleave', () => {
            photoDropZone.classList.remove('dragover');
        });

        photoDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            photoDropZone.classList.remove('dragover');
            this.handlePhotoSelect(e.dataTransfer.files);
        });
    }

    handleFileSelect(file) {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            this.showToast('Por favor selecciona un archivo Excel (.xlsx o .xls)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.processExcelFile(e.target.result);
            } catch (error) {
                console.error('Error processing Excel file:', error);
                this.showToast('Error al procesar el archivo Excel', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    processExcelFile(arrayBuffer) {
        try {
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Use header: 1 to get data as array with first row as headers
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (rawData.length < 2) {
                throw new Error('El archivo no contiene datos suficientes');
            }

            // Headers should be in row 1 (index 1)
            const headers = rawData[1] || rawData[0];
            const dataRows = rawData.slice(2); // Data starts from row 2

            // Map headers to expected field names
            const headerMap = this.createHeaderMap(headers);
            
            // Process data rows
            this.previewData = [];
            let validRows = 0;

            dataRows.forEach((row, index) => {
                // Skip empty rows or rows without TOP #
                const topNumber = this.getCellValue(row, headerMap['TOP #']);
                if (!topNumber || topNumber.trim() === '') {
                    return;
                }

                const processedRow = this.processExcelRow(row, headerMap);
                if (processedRow) {
                    this.previewData.push(processedRow);
                    validRows++;
                }
            });

            if (validRows === 0) {
                throw new Error('No se encontraron filas válidas con TOP # en el archivo');
            }

            this.showPreview();
            this.showToast(`${validRows} filas válidas encontradas para importar`, 'success');

        } catch (error) {
            console.error('Error in processExcelFile:', error);
            this.showToast(`Error al procesar archivo: ${error.message}`, 'error');
        }
    }

    createHeaderMap(headers) {
        const map = {};
        headers.forEach((header, index) => {
            if (header) {
                const cleanHeader = header.toString().trim();
                // Map various header formats to standard field names
                switch (cleanHeader.toUpperCase()) {
                    case 'SEMANA':
                        map['Semana'] = index;
                        break;
                    case 'TOP #':
                    case 'TOP#':
                    case 'TOP':
                        map['TOP #'] = index;
                        break;
                    case 'DESCRIPCIÓN DEL SISTEMA':
                    case 'DESCRIPCION DEL SISTEMA':
                    case 'SISTEMA':
                        map['Descripción del Sistema'] = index;
                        break;
                    case 'HITO ASOCIADO':
                    case 'HITO':
                        map['HITO ASOCIADO'] = index;
                        break;
                    case 'DISCIPLINA':
                        map['Disciplina'] = index;
                        break;
                    case 'RESPONSABLE ACC':
                    case 'RESPONSABLE':
                        map['Responsable ACC'] = index;
                        break;
                    case 'INPUT DATE':
                    case 'FECHA INPUT':
                        map['INPUT DATE'] = index;
                        break;
                    case 'FECHA COMPROMISO OBRA':
                    case 'FECHA COMPROMISO':
                        map['Fecha Compromiso Obra'] = index;
                        break;
                    case 'FECHA OBJETIVO TOP':
                    case 'FECHA OBJETIVO':
                        map['Fecha Objetivo TOP'] = index;
                        break;
                    case 'FECHA CIERRE':
                        map['Fecha Cierre'] = index;
                        break;
                    case 'SUB/VENDOR':
                    case 'SUBVENDOR':
                    case 'VENDOR':
                        map['SUB/Vendor'] = index;
                        break;
                    case 'DESCRIPCIÓN DE FALTAS':
                    case 'DESCRIPCION DE FALTAS':
                    case 'FALTAS':
                        map['Descripción de faltas'] = index;
                        break;
                    case 'COMENTARIOS':
                        map['Comentarios'] = index;
                        break;
                }
            }
        });
        return map;
    }

    getCellValue(row, columnIndex) {
        if (columnIndex === undefined || row[columnIndex] === undefined) {
            return '';
        }
        return row[columnIndex]?.toString().trim() || '';
    }

    processExcelRow(row, headerMap) {
        try {
            const topNumber = this.getCellValue(row, headerMap['TOP #']);
            if (!topNumber) return null;

            const hitoAsociado = this.getCellValue(row, headerMap['HITO ASOCIADO']);
            const fechaCierre = this.getCellValue(row, headerMap['Fecha Cierre']);

            // Calculate priority based on hito_asociado
            let prioridad = 'Baja';
            if (hitoAsociado.toUpperCase().includes('PTB') || hitoAsociado.toUpperCase().includes('PEM')) {
                prioridad = 'Alta';
            } else if (hitoAsociado.toUpperCase().includes('PRIMERA SINCRONIZACIÓN') || 
                      hitoAsociado.toUpperCase().includes('SOPLADO')) {
                prioridad = 'Media';
            }

            // Calculate status based on fecha_cierre
            const estado = fechaCierre ? 'Cerrado' : 'Abierto';

            return {
                id: Date.now() + Math.random(), // Generate unique ID
                semana: parseFloat(this.getCellValue(row, headerMap['Semana'])) || 0,
                top_number: topNumber,
                descripcion_sistema: this.getCellValue(row, headerMap['Descripción del Sistema']),
                hito_asociado: hitoAsociado,
                falta: '-',
                descripcion_faltas: this.getCellValue(row, headerMap['Descripción de faltas']),
                disciplina: this.getCellValue(row, headerMap['Disciplina']),
                origen: 'Importado',
                responsable: this.getCellValue(row, headerMap['Responsable ACC']),
                input_date: this.formatDate(this.getCellValue(row, headerMap['INPUT DATE'])),
                fecha_compromiso: this.formatDate(this.getCellValue(row, headerMap['Fecha Compromiso Obra'])),
                fecha_objetivo: this.formatDate(this.getCellValue(row, headerMap['Fecha Objetivo TOP'])),
                fecha_cierre: fechaCierre ? this.formatDate(fechaCierre) : null,
                subcontratista: this.getCellValue(row, headerMap['SUB/Vendor']),
                comentarios: this.getCellValue(row, headerMap['Comentarios']),
                estado: estado,
                prioridad: prioridad,
                fotos: [],
                ubicacion: {
                    descripcion: '',
                    latitud: '',
                    longitud: ''
                }
            };
        } catch (error) {
            console.error('Error processing row:', error);
            return null;
        }
    }

    formatDate(dateStr) {
        if (!dateStr) return null;
        
        try {
            // Handle Excel serial date numbers
            if (!isNaN(dateStr)) {
                const date = XLSX.SSF.parse_date_code(dateStr);
                return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
            }
            
            // Handle string dates
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return null;
            
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.error('Error formatting date:', dateStr, error);
            return null;
        }
    }

    showPreview() {
        const previewSection = document.getElementById('previewSection');
        const importOptions = document.getElementById('importOptions');
        const previewTableHead = document.getElementById('previewTableHead');
        const previewTableBody = document.getElementById('previewTableBody');
        const previewCount = document.getElementById('previewCount');

        // Show sections
        previewSection.style.display = 'block';
        importOptions.style.display = 'block';

        // Create table headers
        const headers = ['TOP #', 'Sistema', 'Hito', 'Disciplina', 'Responsable', 'Estado', 'Prioridad'];
        previewTableHead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

        // Show first 10 rows for preview
        const previewRows = this.previewData.slice(0, 10);
        previewTableBody.innerHTML = previewRows.map(row => `
            <tr>
                <td>${row.top_number}</td>
                <td>${row.descripcion_sistema.substring(0, 50)}${row.descripcion_sistema.length > 50 ? '...' : ''}</td>
                <td>${row.hito_asociado}</td>
                <td><span class="badge disciplina-${row.disciplina.toLowerCase().replace(/[^a-z]/g, '')}">${row.disciplina}</span></td>
                <td>${row.responsable}</td>
                <td><span class="badge status-${row.estado.toLowerCase()}">${row.estado}</span></td>
                <td><span class="badge priority-${row.prioridad.toLowerCase()}">${row.prioridad}</span></td>
            </tr>
        `).join('');

        previewCount.textContent = this.previewData.length;
    }

    confirmImport() {
        const mode = document.querySelector('input[name="importMode"]:checked').value;
        
        try {
            if (mode === 'overwrite') {
                this.pendientes = [...this.previewData];
            } else {
                // Incremental mode - add new items
                const existingTopNumbers = new Set(this.pendientes.map(p => p.top_number));
                const newItems = this.previewData.filter(item => !existingTopNumbers.has(item.top_number));
                this.pendientes.push(...newItems);
                
                if (newItems.length === 0) {
                    this.showToast('No se encontraron nuevos pendientes para agregar', 'info');
                    this.cancelImport();
                    return;
                }
            }

            this.saveToLocalStorage();
            this.updateCounters();
            this.populateFilters();
            this.applyFilters();

            const message = mode === 'overwrite' 
                ? `${this.previewData.length} pendientes importados (modo sobrescritura)`
                : `${this.previewData.filter(item => !this.pendientes.slice(0, -this.previewData.length).some(p => p.top_number === item.top_number)).length} nuevos pendientes agregados`;
            
            this.showStatusMessage(message, 'success');
            this.cancelImport();

        } catch (error) {
            console.error('Error importing data:', error);
            this.showToast('Error al importar los datos', 'error');
        }
    }

    cancelImport() {
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('importOptions').style.display = 'none';
        document.getElementById('fileInput').value = '';
        this.previewData = [];
    }

    populateFilters() {
        // Get unique values for filters
        const disciplinas = [...new Set(this.pendientes.map(p => p.disciplina))].filter(Boolean).sort();
        const responsables = [...new Set(this.pendientes.map(p => p.responsable))].filter(Boolean).sort();

        // Populate disciplina filter
        const disciplinaFilter = document.getElementById('filterDisciplina');
        disciplinaFilter.innerHTML = '<option value="">Todas</option>' + 
            disciplinas.map(d => `<option value="${d}">${d}</option>`).join('');

        // Populate responsable filter
        const responsableFilter = document.getElementById('filterResponsable');
        responsableFilter.innerHTML = '<option value="">Todos</option>' + 
            responsables.map(r => `<option value="${r}">${r}</option>`).join('');
    }

    applyFilters() {
        const estado = document.getElementById('filterEstado').value;
        const prioridad = document.getElementById('filterPrioridad').value;
        const disciplina = document.getElementById('filterDisciplina').value;
        const responsable = document.getElementById('filterResponsable').value;
        const search = document.getElementById('searchInput').value.toLowerCase();

        this.filteredPendientes = this.pendientes.filter(pendiente => {
            return (!estado || pendiente.estado === estado) &&
                   (!prioridad || pendiente.prioridad === prioridad) &&
                   (!disciplina || pendiente.disciplina === disciplina) &&
                   (!responsable || pendiente.responsable === responsable) &&
                   (!search || 
                    pendiente.top_number.toLowerCase().includes(search) ||
                    pendiente.descripcion_sistema.toLowerCase().includes(search) ||
                    pendiente.descripcion_faltas.toLowerCase().includes(search) ||
                    pendiente.responsable.toLowerCase().includes(search));
        });

        this.currentPage = 1;
        this.renderTable();
        this.updateResultsInfo();
    }

    clearFilters() {
        document.getElementById('filterEstado').value = '';
        document.getElementById('filterPrioridad').value = '';
        document.getElementById('filterDisciplina').value = '';
        document.getElementById('filterResponsable').value = '';
        document.getElementById('searchInput').value = '';
        this.applyFilters();
    }

    updateCounters() {
        const total = this.pendientes.length;
        const abiertos = this.pendientes.filter(p => p.estado === 'Abierto').length;
        
        document.getElementById('totalCount').textContent = total;
        document.getElementById('openCount').textContent = abiertos;
    }

    updateResultsInfo() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredPendientes.length);
        
        document.getElementById('resultCount').textContent = `${startIndex + 1}-${endIndex}`;
        document.getElementById('totalResults').textContent = this.filteredPendientes.length;
    }

    renderTable() {
        const tbody = document.getElementById('pendientesTableBody');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = this.filteredPendientes.slice(startIndex, endIndex);

        if (pageItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center py-4">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <p>No se encontraron pendientes con los filtros aplicados</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = pageItems.map(pendiente => `
                <tr>
                    <td>
                        ${pendiente.fotos.length > 0 
                            ? `<img src="${pendiente.fotos[0]}" class="photo-thumbnail" alt="Foto">` 
                            : '<div class="photo-placeholder"><i class="fas fa-camera"></i></div>'
                        }
                    </td>
                    <td>${pendiente.semana || '-'}</td>
                    <td><small>${pendiente.top_number}</small></td>
                    <td>${pendiente.descripcion_sistema.substring(0, 40)}${pendiente.descripcion_sistema.length > 40 ? '...' : ''}</td>
                    <td><small>${pendiente.hito_asociado}</small></td>
                    <td><span class="badge priority-${pendiente.prioridad.toLowerCase()}">${pendiente.prioridad}</span></td>
                    <td><span class="badge status-${pendiente.estado.toLowerCase()}">${pendiente.estado}</span></td>
                    <td><span class="badge disciplina-${pendiente.disciplina.toLowerCase().replace(/[^a-z]/g, '')}">${pendiente.disciplina}</span></td>
                    <td>${pendiente.responsable}</td>
                    <td>${pendiente.fecha_compromiso || '-'}</td>
                    <td>${pendiente.subcontratista || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary action-btn" onclick="app.editPendiente(${pendiente.id})">
                            <i class="fas fa-edit"></i> Ver
                        </button>
                    </td>
                </tr>
            `).join('');
        }

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

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="app.goToPage(${this.currentPage - 1})">Anterior</a></li>`;
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<li class="page-item ${i === this.currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="app.goToPage(${i})">${i}</a>
            </li>`;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="app.goToPage(${this.currentPage + 1})">Siguiente</a></li>`;
        }

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderTable();
        this.updateResultsInfo();
    }

    editPendiente(id) {
        const pendiente = this.pendientes.find(p => p.id === id);
        if (!pendiente) return;

        this.currentEditingId = id;
        this.populateEditForm(pendiente);
        
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
    }

    populateEditForm(pendiente) {
        document.getElementById('editId').value = pendiente.id;
        document.getElementById('editTopNumber').value = pendiente.top_number;
        document.getElementById('editSemana').value = pendiente.semana || '';
        document.getElementById('editDescripcionSistema').value = pendiente.descripcion_sistema || '';
        document.getElementById('editHitoAsociado').value = pendiente.hito_asociado || '';
        document.getElementById('editDisciplina').value = pendiente.disciplina || '';
        document.getElementById('editDescripcionFaltas').value = pendiente.descripcion_faltas || '';
        document.getElementById('editResponsable').value = pendiente.responsable || '';
        document.getElementById('editSubvendor').value = pendiente.subcontratista || '';
        document.getElementById('editFechaCompromiso').value = pendiente.fecha_compromiso || '';
        document.getElementById('editFechaObjetivo').value = pendiente.fecha_objetivo || '';
        document.getElementById('editFechaCierre').value = pendiente.fecha_cierre || '';
        document.getElementById('editComentarios').value = pendiente.comentarios || '';
        document.getElementById('editUbicacionDesc').value = pendiente.ubicacion?.descripcion || '';
        document.getElementById('editLatitud').value = pendiente.ubicacion?.latitud || '';
        document.getElementById('editLongitud').value = pendiente.ubicacion?.longitud || '';

        this.renderPhotoPreview(pendiente.fotos || []);
    }

    renderPhotoPreview(fotos) {
        const preview = document.getElementById('photoPreview');
        preview.innerHTML = fotos.map((foto, index) => `
            <div class="col-md-4 photo-preview-item">
                <img src="${foto}" class="photo-preview-img" alt="Foto ${index + 1}">
                <button type="button" class="photo-remove-btn" onclick="app.removePhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    handlePhotoSelect(files) {
        const pendiente = this.pendientes.find(p => p.id === this.currentEditingId);
        if (!pendiente) return;

        const currentPhotos = pendiente.fotos || [];
        if (currentPhotos.length + files.length > 3) {
            this.showToast('Máximo 3 fotos permitidas', 'warning');
            return;
        }

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    pendiente.fotos = pendiente.fotos || [];
                    pendiente.fotos.push(e.target.result);
                    this.renderPhotoPreview(pendiente.fotos);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    removePhoto(index) {
        const pendiente = this.pendientes.find(p => p.id === this.currentEditingId);
        if (!pendiente || !pendiente.fotos) return;

        pendiente.fotos.splice(index, 1);
        this.renderPhotoPreview(pendiente.fotos);
    }

    saveChanges() {
        const id = parseInt(document.getElementById('editId').value);
        const pendiente = this.pendientes.find(p => p.id === id);
        if (!pendiente) return;

        // Update pendiente with form data
        pendiente.semana = parseFloat(document.getElementById('editSemana').value) || 0;
        pendiente.descripcion_sistema = document.getElementById('editDescripcionSistema').value;
        pendiente.hito_asociado = document.getElementById('editHitoAsociado').value;
        pendiente.disciplina = document.getElementById('editDisciplina').value;
        pendiente.descripcion_faltas = document.getElementById('editDescripcionFaltas').value;
        pendiente.responsable = document.getElementById('editResponsable').value;
        pendiente.subcontratista = document.getElementById('editSubvendor').value;
        pendiente.fecha_compromiso = document.getElementById('editFechaCompromiso').value || null;
        pendiente.fecha_objetivo = document.getElementById('editFechaObjetivo').value || null;
        pendiente.fecha_cierre = document.getElementById('editFechaCierre').value || null;
        pendiente.comentarios = document.getElementById('editComentarios').value;
        
        // Update status based on fecha_cierre
        pendiente.estado = pendiente.fecha_cierre ? 'Cerrado' : 'Abierto';

        // Update location
        pendiente.ubicacion = {
            descripcion: document.getElementById('editUbicacionDesc').value,
            latitud: document.getElementById('editLatitud').value,
            longitud: document.getElementById('editLongitud').value
        };

        this.saveToLocalStorage();
        this.applyFilters();
        this.updateCounters();

        const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        modal.hide();

        this.showToast('Pendiente actualizado correctamente', 'success');
    }

    renderStatistics() {
        const total = this.pendientes.length;
        const abiertos = this.pendientes.filter(p => p.estado === 'Abierto').length;
        const cerrados = total - abiertos;
        const altaPrioridad = this.pendientes.filter(p => p.prioridad === 'Alta').length;

        // Update metrics
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statAbiertos').textContent = abiertos;
        document.getElementById('statCerrados').textContent = cerrados;
        document.getElementById('statAltaPrioridad').textContent = altaPrioridad;
        document.getElementById('statPorcentajeAbiertos').textContent = total > 0 ? Math.round((abiertos / total) * 100) + '%' : '0%';
        document.getElementById('statPorcentajeCerrados').textContent = total > 0 ? Math.round((cerrados / total) * 100) + '%' : '0%';

        // Render charts
        this.renderPriorityChart();
        this.renderDisciplineChart();
    }

    renderPriorityChart() {
        const ctx = document.getElementById('prioridadChart').getContext('2d');
        
        if (this.charts.priority) {
            this.charts.priority.destroy();
        }

        const prioridadData = {
            'Alta': this.pendientes.filter(p => p.prioridad === 'Alta').length,
            'Media': this.pendientes.filter(p => p.prioridad === 'Media').length,
            'Baja': this.pendientes.filter(p => p.prioridad === 'Baja').length
        };

        this.charts.priority = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(prioridadData),
                datasets: [{
                    data: Object.values(prioridadData),
                    backgroundColor: ['#DC3545', '#FFC107', '#28A745'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderDisciplineChart() {
        const ctx = document.getElementById('disciplinaChart').getContext('2d');
        
        if (this.charts.discipline) {
            this.charts.discipline.destroy();
        }

        const disciplinaCount = {};
        this.pendientes.forEach(p => {
            disciplinaCount[p.disciplina] = (disciplinaCount[p.disciplina] || 0) + 1;
        });

        this.charts.discipline = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(disciplinaCount),
                datasets: [{
                    label: 'Cantidad',
                    data: Object.values(disciplinaCount),
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    exportToExcel() {
        const dataToExport = this.filteredPendientes.map(p => ({
            'Semana': p.semana,
            'TOP #': p.top_number,
            'Descripción del Sistema': p.descripcion_sistema,
            'Hito Asociado': p.hito_asociado,
            'Disciplina': p.disciplina,
            'Responsable': p.responsable,
            'Fecha Compromiso': p.fecha_compromiso,
            'Fecha Objetivo': p.fecha_objetivo,
            'Fecha Cierre': p.fecha_cierre,
            'Estado': p.estado,
            'Prioridad': p.prioridad,
            'SUB/Vendor': p.subcontratista,
            'Comentarios': p.comentarios
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pendientes");
        
        const fileName = `pendientes_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        this.showToast(`Archivo exportado: ${fileName}`, 'success');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('liveToast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        
        // Update toast styling based on type
        const toastHeader = toast.querySelector('.toast-header');
        const icon = toastHeader.querySelector('i');
        
        icon.className = `fas ${type === 'success' ? 'fa-check-circle text-success' : 
                               type === 'error' ? 'fa-exclamation-triangle text-danger' : 
                               type === 'warning' ? 'fa-exclamation-triangle text-warning' : 
                               'fa-info-circle text-primary'} me-2`;

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PendientesApp();
});
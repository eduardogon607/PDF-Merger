// Estado da aplicação
let selectedFiles = [];      // array de objetos { file, dataURL, width, height, name, type }
let processing = false;

// Elementos DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileListDiv = document.getElementById('fileList');
const fileItems = document.getElementById('fileItems');
const fileCount = document.getElementById('fileCount');
const emptyState = document.getElementById('emptyState');
const generateBtn = document.getElementById('generateBtn');
const clearAllBtn = document.getElementById('clearAll');

// Função para carregar imagem e extrair dados (mantém formato original)
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    file: file,
                    dataURL: e.target.result,
                    width: img.width,
                    height: img.height,
                    name: file.name,
                    type: file.type // 'image/png', 'image/jpeg', etc.
                });
            };
            img.onerror = () => reject(new Error(`Falha ao carregar ${file.name}`));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error(`Erro ao ler ${file.name}`));
        reader.readAsDataURL(file);
    });
}

// Adicionar arquivos (com validação)
async function addFiles(newFiles) {
    const validItems = [];
    const errors = [];

    for (const file of newFiles) {
        if (file.size > 10 * 1024 * 1024) {
            errors.push(`${file.name} (excede 10MB)`);
            continue;
        }
        try {
            const imgData = await loadImage(file);
            validItems.push(imgData);
        } catch (err) {
            errors.push(`${file.name} (não é imagem válida)`);
        }
    }

    if (errors.length) {
        alert(`❌ Arquivos ignorados:\n${errors.join('\n')}`);
    }

    if (validItems.length) {
        selectedFiles.push(...validItems);
        updateFileList();
    }
}

// Remover arquivo por índice
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
}

// Limpar todos
function clearAll() {
    selectedFiles = [];
    updateFileList();
    fileInput.value = '';
}

// Atualizar lista de arquivos com suporte a reordenação por drag & drop
function updateFileList() {
    const hasFiles = selectedFiles.length > 0;
    fileListDiv.style.display = hasFiles ? 'block' : 'none';
    emptyState.style.display = hasFiles ? 'none' : 'block';
    generateBtn.style.display = hasFiles ? 'block' : 'none';
    fileCount.textContent = selectedFiles.length;

    fileItems.innerHTML = '';
    selectedFiles.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.setAttribute('data-index', index);
        div.setAttribute('draggable', 'true');

        // Prévia da imagem
        const preview = document.createElement('img');
        preview.src = item.dataURL;
        preview.style.width = '50px';
        preview.style.height = '50px';
        preview.style.objectFit = 'cover';
        preview.style.borderRadius = '4px';
        preview.style.marginRight = '12px';

        // Informações
        const infoDiv = document.createElement('div');
        infoDiv.className = 'file-info';
        infoDiv.style.flex = '1';
        infoDiv.innerHTML = `
            <div class="file-name">${escapeHtml(item.name)}</div>
            <div class="file-size">${(item.file.size / 1024).toFixed(2)} KB</div>
            <div class="file-dimensions">${item.width}x${item.height}</div>
        `;

        // Botão remover
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.style.marginLeft = '12px';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(index);
        });

        div.appendChild(preview);
        div.appendChild(infoDiv);
        div.appendChild(removeBtn);

        // Eventos de drag & drop
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragend', handleDragEnd);

        fileItems.appendChild(div);
    });
}

// Variáveis para controle do drag
let dragSrcIndex = null;

function handleDragStart(e) {
    const targetDiv = e.target.closest('.file-item');
    if (!targetDiv) return;
    dragSrcIndex = parseInt(targetDiv.getAttribute('data-index'));
    e.dataTransfer.setData('text/plain', dragSrcIndex);
    e.dataTransfer.effectAllowed = 'move';
    targetDiv.style.opacity = '0.5';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Adicionar classe visual no alvo
    const targetDiv = e.target.closest('.file-item');
    if (targetDiv && targetDiv !== e.dataTransfer.dragElement) {
        targetDiv.classList.add('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const targetDiv = e.target.closest('.file-item');
    if (!targetDiv) return;
    const targetIndex = parseInt(targetDiv.getAttribute('data-index'));
    if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
        // Reordenar array
        const moved = selectedFiles[dragSrcIndex];
        selectedFiles.splice(dragSrcIndex, 1);
        selectedFiles.splice(targetIndex, 0, moved);
        updateFileList(); // recria a lista com nova ordem
    }
}

function handleDragEnd(e) {
    const targetDiv = e.target.closest('.file-item');
    if (targetDiv) targetDiv.style.opacity = '';
    // Remover classe drag-over de todos
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    dragSrcIndex = null;
}

// Helper para escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Gerar PDF com preservação do formato da imagem
generateBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    if (processing) return;

    processing = true;
    generateBtn.disabled = true;
    generateBtn.textContent = '📄 Gerando PDF... Aguarde';

    try {
        const { jsPDF } = window.jspdf;

        // Opções fixas (pode adicionar selects depois se quiser)
        const orientation = 'portrait'; // ou 'landscape'
        const fitMode = 'center';       // 'center' ou 'cover' (preencher)

        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;

        for (let i = 0; i < selectedFiles.length; i++) {
            const item = selectedFiles[i];
            const img = item.dataURL;
            let imgWidth = item.width;
            let imgHeight = item.height;
            let width, height, x, y;

            // Calcular dimensões para caber na página (centralizado)
            width = pageWidth - 2 * margin;
            height = (imgHeight * width) / imgWidth;
            if (height > pageHeight - 2 * margin) {
                height = pageHeight - 2 * margin;
                width = (imgWidth * height) / imgHeight;
            }
            x = (pageWidth - width) / 2;
            y = (pageHeight - height) / 2;

            // Adicionar nova página (exceto na primeira)
            if (i > 0) pdf.addPage();

            // Determinar formato para addImage (JPEG ou PNG)
            let format = 'JPEG';
            if (item.type === 'image/png') format = 'PNG';
            else if (item.type === 'image/jpeg') format = 'JPEG';

            // Adicionar imagem ao PDF
            pdf.addImage(img, format, x, y, width, height, undefined, 'FAST');

            // Log de progresso no console (opcional)
            console.log(`✅ Imagem ${i+1}/${selectedFiles.length} adicionada: ${item.name}`);
        }

        // Salvar PDF
        pdf.save('imagens_mescladas.pdf');
        alert(`✅ PDF gerado com sucesso!\n📄 ${selectedFiles.length} imagens incluídas na ordem definida.`);
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert(`❌ Erro ao gerar PDF: ${error.message}\n\nVerifique o console (F12) para mais detalhes.`);
    } finally {
        processing = false;
        generateBtn.disabled = false;
        generateBtn.textContent = '📄 Gerar PDF';
    }
});

// Eventos de upload
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});
uploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    await addFiles(files);
});
fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    await addFiles(files);
    fileInput.value = ''; // limpar input para permitir re-seleção
});
clearAllBtn.addEventListener('click', clearAll);
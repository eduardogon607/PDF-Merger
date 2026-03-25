let selectedFiles = [];

// Elementos DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileListDiv = document.getElementById('fileList');
const fileItems = document.getElementById('fileItems');
const fileCount = document.getElementById('fileCount');
const emptyState = document.getElementById('emptyState');
const generateBtn = document.getElementById('generateBtn');
const clearAllBtn = document.getElementById('clearAll');

// Função universal para tentar carregar qualquer arquivo como imagem
function tryLoadAsImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Conseguiu carregar! É uma imagem válida
                console.log(`✅ ${file.name} carregada com sucesso - ${img.width}x${img.height}`);
                resolve({
                    dataURL: e.target.result,
                    width: img.width,
                    height: img.height,
                    name: file.name
                });
            };
            
            img.onerror = () => {
                console.log(`❌ Falha ao carregar ${file.name} como imagem`);
                reject(new Error(`Não foi possível carregar como imagem: ${file.name}`));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error(`Erro ao ler arquivo: ${file.name}`));
        reader.readAsDataURL(file);
    });
}

// Função para testar se pode ser carregado como imagem
async function canLoadAsImage(file) {
    try {
        await tryLoadAsImage(file);
        return true;
    } catch (error) {
        return false;
    }
}

// Configurar eventos de drag & drop
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

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
    const validFiles = [];
    const invalidFiles = [];
    
    for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
            invalidFiles.push(`${file.name} (excede 10MB)`);
            continue;
        }
        
        // Tentar carregar como imagem
        const isValid = await canLoadAsImage(file);
        if (isValid) {
            validFiles.push(file);
        } else {
            invalidFiles.push(`${file.name} (não é uma imagem válida)`);
        }
    }
    
    if (invalidFiles.length > 0) {
        alert(`❌ Arquivos ignorados:\n${invalidFiles.join('\n')}`);
    }
    
    if (validFiles.length > 0) {
        addFiles(validFiles);
    }
});

fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    const invalidFiles = [];
    
    for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
            invalidFiles.push(`${file.name} (excede 10MB)`);
            continue;
        }
        
        // Tentar carregar como imagem
        const isValid = await canLoadAsImage(file);
        if (isValid) {
            validFiles.push(file);
        } else {
            invalidFiles.push(`${file.name} (não é uma imagem válida)`);
        }
    }
    
    if (invalidFiles.length > 0) {
        alert(`❌ Arquivos ignorados:\n${invalidFiles.join('\n')}`);
    }
    
    if (validFiles.length > 0) {
        addFiles(validFiles);
    }
});

function addFiles(newFiles) {
    selectedFiles = [...selectedFiles, ...newFiles];
    updateFileList();
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    fileInput.value = '';
}

function clearAll() {
    selectedFiles = [];
    updateFileList();
    fileInput.value = '';
}

function updateFileList() {
    if (selectedFiles.length === 0) {
        fileListDiv.style.display = 'none';
        emptyState.style.display = 'block';
        generateBtn.style.display = 'none';
        return;
    }
    
    fileListDiv.style.display = 'block';
    emptyState.style.display = 'none';
    generateBtn.style.display = 'block';
    fileCount.textContent = selectedFiles.length;
    
    fileItems.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        fileItem.innerHTML = `
            <div class="file-icon">🖼️</div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-size">${(file.size / 1024).toFixed(2)} KB</div>
                <div class="file-type" style="font-size: 0.7rem; color: #4CAF50;">✅ Imagem válida</div>
            </div>
            <button class="remove-btn" data-index="${index}">✕</button>
        `;
        
        fileItems.appendChild(fileItem);
    });
    
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            removeFile(index);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

clearAllBtn.addEventListener('click', clearAll);

// Gerar PDF
generateBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        alert('Selecione pelo menos uma imagem.');
        return;
    }
    
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Processando imagens...';
    
    try {
        const { jsPDF } = window.jspdf;
        
        // Processar todas as imagens
        const processedImages = [];
        
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            generateBtn.textContent = `⏳ Processando ${i + 1}/${selectedFiles.length}: ${file.name}`;
            
            try {
                const imgData = await tryLoadAsImage(file);
                processedImages.push(imgData);
                console.log(`✅ ${i + 1}/${selectedFiles.length}: ${file.name} (${imgData.width}x${imgData.height})`);
            } catch (error) {
                console.error(`❌ Erro em ${file.name}:`, error);
                alert(`Erro ao processar: ${file.name}\n\nEste arquivo será ignorado.`);
            }
        }
        
        if (processedImages.length === 0) {
            throw new Error('Nenhuma imagem pôde ser processada');
        }
        
        generateBtn.textContent = '📄 Gerando PDF...';
        
        // Criar PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        for (let i = 0; i < processedImages.length; i++) {
            const img = processedImages[i];
            
            // Calcular dimensões mantendo proporção
            let imgWidth = img.width;
            let imgHeight = img.height;
            let width = pageWidth - 20; // 10mm de margem de cada lado
            let height = (imgHeight * width) / imgWidth;
            
            // Se altura ultrapassar, ajusta pela altura
            if (height > pageHeight - 20) {
                height = pageHeight - 20;
                width = (imgWidth * height) / imgHeight;
            }
            
            // Centralizar na página
            const x = (pageWidth - width) / 2;
            const y = (pageHeight - height) / 2;
            
            // Adicionar nova página se não for a primeira
            if (i > 0) {
                pdf.addPage();
            }
            
            // Adicionar imagem ao PDF
            pdf.addImage(img.dataURL, 'JPEG', x, y, width, height, undefined, 'FAST');
            
            console.log(`✅ Adicionado ao PDF: ${img.name} (${width.toFixed(0)}x${height.toFixed(0)}mm)`);
        }
        
        // Salvar PDF
        pdf.save('imagens_mescladas.pdf');
        
        alert(`✅ PDF gerado com sucesso!\n📄 ${processedImages.length} de ${selectedFiles.length} imagens incluídas.`);
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert(`❌ Erro ao gerar PDF: ${error.message}`);
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '📄 Gerar PDF';
    }
});
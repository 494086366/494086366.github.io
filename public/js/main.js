// 页面加载时获取音频列表
window.onload = async () => {
    try {
        console.log('开始加载数据...');
        // 先加载下载列表
        await loadDownloadableFiles();
        // 再加载音频列表
    await loadAudioList();
        console.log('数据加载完成');
    } catch (error) {
        console.error('数据加载失败:', error);
    }
};

async function loadAudioList() {
    const response = await fetch('/api/files');
    const files = await response.json();
    
    // 获取所有分类
    const categories = [...new Set(files.map(f => f.category))];
    renderCategoryMenu(categories);
    
    // 默认显示所有文件
    renderFiles(files);
}

// 新增拖拽上传功能
const dropZone = document.getElementById('dropZone');

// 全局文件输入（确保只创建一次）
if (!window.fileInput) {
    window.fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'audio/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
}

// 动态管理拖拽事件
let isDragActive = false;

function updateDragDropState() {
    const isUploadVisible = document.getElementById('uploadSection').style.display === 'block';
    
    if (isUploadVisible && !isDragActive) {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('drop', handleDrop);
        isDragActive = true;
    } else if (!isUploadVisible && isDragActive) {
        dropZone.removeEventListener('dragover', handleDragOver);
        dropZone.removeEventListener('drop', handleDrop);
        isDragActive = false;
    }
}

// 修改分类点击处理
document.getElementById('categoryMenu').addEventListener('click', async (e) => {
    const categoryItem = e.target.closest('.category-item');
    if (!categoryItem) return;

    // 移除所有激活状态
    document.querySelectorAll('.category-item').forEach(item => 
        item.classList.remove('active')
    );
    
    // 设置当前激活项
    categoryItem.classList.add('active');

    // 完全切换界面
    const isUpload = categoryItem.dataset.category === 'upload';
    const isDownload = categoryItem.dataset.category === 'download';
    const isSongInfo = categoryItem.dataset.category === 'song-info';

    document.getElementById('uploadSection').style.display = isUpload ? 'block' : 'none';
    document.getElementById('downloadSection').style.display = isDownload ? 'block' : 'none';
    document.getElementById('songInfoSection').style.display = isSongInfo ? 'block' : 'none';

    // 重置上传状态
    if (isUpload) {
        initUploadHandlers();
        updateDragDropState();
    } else {
        window.cancelUpload();
    }
});

// 拖拽事件处理
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
    selectedFiles = Array.from(e.dataTransfer.files);
    if (selectedFiles.length > 0) {
        showUploadConfirmation(selectedFiles.length);
    }
});

// 修复拖拽区域点击事件
dropZone.addEventListener('click', () => {
    console.log('拖拽区域被点击');
    fileInput.click();
});

// 在文件开头声明变量
let uploadFiles = []; // 用于上传的文件
const selectedFiles = new Set(); // 用于下载选择的文件ID
let allFiles = []; // 所有可下载的文件
let filteredFiles = []; // 筛选后的文件

// 修改文件选择事件处理
fileInput.addEventListener('change', function(e) {
    const files = e.target.files;
    if (files.length > 0) {
        uploadFiles = Array.from(files);
        // 添加文件验证
        uploadFiles = uploadFiles.filter(file => 
            file.type.startsWith('audio/') && 
            ['audio/mpeg', 'audio/wav'].includes(file.type)
        );
        if (uploadFiles.length === 0) {
            showUploadError(new Error('请选择有效的音频文件'));
            return;
        }
        // 显示确认和取消按钮
        document.getElementById('confirmUpload').style.display = 'inline-block';
        document.getElementById('cancelUpload').style.display = 'inline-block';
        // 隐藏选择文件按钮
        document.querySelector('.upload-actions button:first-child').style.display = 'none';
        document.getElementById('fileCount').textContent = `已选择${files.length}个文件`;
    }
    this.value = ''; // 清空以允许重复选择
});

// 修改初始化状态
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成');
    // 设置初始激活项为上传文件
    const uploadItem = document.querySelector('[data-category="upload"]');
    uploadItem.classList.add('active');
    
    // 显示上传界面，隐藏下载界面
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('downloadSection').style.display = 'none';
    
    // 初始化上传处理器
    initUploadHandlers();
    updateDragDropState();
});

// 修改显示确认函数
function showUploadConfirmation(fileCount) {
    document.getElementById('fileCount').textContent = `已选择${fileCount}个文件`;
    // 渐变动画显示按钮
    document.getElementById('confirmUpload').style.display = 'inline-block';
    document.getElementById('confirmUpload').style.opacity = '0';
    document.getElementById('cancelUpload').style.display = 'inline-block';
    document.getElementById('cancelUpload').style.opacity = '0';
    
    setTimeout(() => {
        document.getElementById('confirmUpload').style.opacity = '1';
        document.getElementById('cancelUpload').style.opacity = '1';
    }, 50);
    
    document.querySelector('.upload-actions button:first-child').style.display = 'none';
}

// 修改取消上传函数
window.cancelUpload = function() {
    uploadFiles = [];
    document.getElementById('fileCount').textContent = '已选择0个文件';
    // 隐藏确认和取消按钮
    document.getElementById('confirmUpload').style.display = 'none';
    document.getElementById('cancelUpload').style.display = 'none';
    // 显示选择文件按钮
    document.querySelector('.upload-actions button:first-child').style.display = 'inline-block';
    fileInput.value = '';
    hideUploadingState();
}

// 重置上传UI
function resetUploadUI() {
    document.getElementById('fileCount').textContent = '已选择0个文件';
    document.getElementById('confirmUpload').style.display = 'none';
    document.getElementById('cancelUpload').style.display = 'none';
    document.querySelector('.upload-actions button:first-child').style.display = 'inline-block';
    hideUploadingState();
}

// 修改文件上传函数
window.confirmUpload = async () => {
    try {
        // 在开始上传时就隐藏按钮
        document.getElementById('confirmUpload').style.display = 'none';
        document.getElementById('cancelUpload').style.display = 'none';
        
        // 验证文件
        const validFiles = uploadFiles.filter(file => 
            file.type.startsWith('audio/') && 
            ['audio/mpeg', 'audio/wav'].includes(file.type)
        );
        
        if (validFiles.length === 0) {
            throw new Error('请选择有效的MP3/WAV文件');
        }

        // 构建FormData
        const formData = new FormData();
        validFiles.forEach(file => formData.append('files', file));

        // 发送请求
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || '上传失败');
        }

        // 处理成功
        await loadDownloadableFiles();
        showUploadSuccess(validFiles.length);
        
        // 重置选择文件按钮状态
        document.querySelector('.upload-actions button:first-child').style.display = 'inline-block';
        uploadFiles = []; // 清空已选文件

    } catch (error) {
        console.error('上传失败:', error);
        showUploadError(error);
        // 发生错误时恢复选择文件按钮
        document.querySelector('.upload-actions button:first-child').style.display = 'inline-block';
    }
};

// 修改上传成功处理函数
async function handleUploadSuccess(response) {
    // 只显示一次成功提示
    showUploadSuccess(response.files.length);
    resetUploadUI();
    
    // 刷新下载列表并切换到下载界面
    await loadDownloadableFiles();
    document.querySelector('[data-category="download"]').click();
}

// 修改成功提示函数，添加文件数量参数
function showUploadSuccess(fileCount) {
    // 移除可能存在的旧提示
    const existingStatus = document.querySelector('.upload-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    const status = document.createElement('div');
    status.className = 'upload-status success';
    status.textContent = `✓ 成功上传${fileCount}个文件`;
    document.querySelector('.upload-actions').appendChild(status);
    
    // 3秒后自动移除提示
    setTimeout(() => {
        if (status && status.parentNode) {
            status.remove();
        }
    }, 3000);
}

// 修改错误提示函数，确保同一时间只有一个提示
function showUploadError(error) {
    // 移除可能存在的旧提示
    const existingStatus = document.querySelector('.upload-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    const status = document.createElement('div');
    status.className = 'upload-status error';
    status.textContent = `✗ ${error.message}`;
    document.querySelector('.upload-actions').appendChild(status);
    
    // 5秒后自动移除提示
    setTimeout(() => {
        if (status && status.parentNode) {
            status.remove();
        }
    }, 5000);
}

// 显示上传状态
function showUploadingState() {
    dropZone.innerHTML = `<div class="uploading">上传中...</div>`;
}

function hideUploadingState() {
    dropZone.innerHTML = `
        <div class="upload-instruction">
            <span class="upload-icon">↑</span>
            <p>拖拽音频文件到这里上传<br>或点击选择文件</p>
        </div>
    `;
}

// 修改分类菜单渲染函数
function renderCategoryMenu(categories) {
    const container = document.getElementById('categoryMenu');
    container.innerHTML = `
        <div class="category-item active" data-category="upload">上传文件</div>
        <div class="category-item" data-category="download">歌曲列表</div>
        <div class="category-item" data-category="song-info">歌曲信息</div>
    `;
}

// 修改文件渲染函数
function renderFiles(files, isUploadSection = false) {
    const container = isUploadSection ? 
        document.getElementById('uploadList') :
        document.getElementById('fileListContainer');
        
    container.innerHTML = files.map(file => {
        // 确保字段存在
        const fileName = file.name || '未知歌曲';
        const category = file.category || '未分类';
        const duration = file.duration ? formatDuration(file.duration) : '0:00';
        const uploadDate = file.uploadDate ? 
            new Date(file.uploadDate).toLocaleDateString() : 
            '未知日期';

        return `
        <div class="file-item ${file.downloaded ? 'downloaded' : ''}">
            ${isUploadSection ? `
                <span>${fileName}</span>
                <div>
                    <span class="status">${file.downloaded ? '✓ 已下载' : '⏳ 未下载'}</span>
                    <span class="date">${uploadDate}</span>
                </div>
            ` : `
                <div class="artist">${getArtist(category)}</div>
                <div class="song-name">${fileName}</div>
                <div class="duration">${duration}</div>
                <div class="upload-date">${uploadDate}</div>
            `}
        </div>
        `;
    }).join('');
}

// 更新分类到歌手的映射
function getArtist(category) {
    const categoryMap = {
        'AEC': 'AEC组合',
        '汤姆猫的梦中情猫': '汤姆猫',
        'DSLL': 'DSLL乐队', 
        '大清第一巴图鲁': '巴图鲁',
        '耳朵超市': '耳朵超市', // 保持原名
        '未分类': '其他歌手'
    };
    return categoryMap[category] || '其他歌手';
}

// 自动生成日期选项
function initDateFilters(files) {
    const dates = [...new Set(files.map(f => new Date(f.uploadDate).toISOString().split('T')[0]))];
    const dateFilter = document.getElementById('dateFilter');
    
    dateFilter.innerHTML = dates.map(date => `
        <option value="${date}">${date}</option>
    `).join('');
}

// 修改下载列表渲染函数
async function loadDownloadableFiles() {
    try {
        const response = await fetch('/api/downloadable-files');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allFiles = await response.json();
        
        // 更新歌手筛选选项
        updateArtistFilter();
        
        // 应用筛选并渲染
        applyFilters();
        
    } catch (error) {
        console.error('加载下载列表失败:', error);
        document.getElementById('songList').innerHTML = 
            `<div class="error">加载失败，请刷新页面</div>`;
    }
}

// 更新歌手筛选选项
function updateArtistFilter() {
    const artists = [...new Set(allFiles.map(file => file.artist))];
    const artistFilter = document.getElementById('artistFilter');
    artistFilter.innerHTML = `
        <option value="">全部歌手</option>
        ${artists.map(artist => `
            <option value="${artist}">${artist}</option>
        `).join('')}
    `;
}

// 应用筛选
function applyFilters() {
    const artistValue = document.getElementById('artistFilter').value;
    const dateValue = document.getElementById('dateFilter').value;
    
    filteredFiles = allFiles.filter(file => {
        const matchArtist = !artistValue || file.artist === artistValue;
        const matchDate = filterByDate(file.uploadDate, dateValue);
        return matchArtist && matchDate;
    });
    
    renderFilteredFiles();
}

// 日期筛选逻辑
function filterByDate(dateStr, filter) {
    if (!filter) return true;
    
    const fileDate = new Date(dateStr);
    const now = new Date();
    
    switch(filter) {
        case 'today':
            return fileDate.toDateString() === now.toDateString();
        case 'week':
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            return fileDate >= weekAgo;
        case 'month':
            return fileDate.getMonth() === now.getMonth() && 
                   fileDate.getFullYear() === now.getFullYear();
        default:
            return true;
    }
}

// 渲染筛选后的文件列表
function renderFilteredFiles() {
    const listContainer = document.getElementById('songList');
    listContainer.innerHTML = filteredFiles.map(file => `
        <div class="download-item">
            <input type="checkbox" 
                   class="item-checkbox" 
                   onchange="toggleFileSelection('${file._id}')"
                   ${selectedFiles.has(file._id) ? 'checked' : ''}>
            <div class="download-info">
                <div class="download-name">${file.name}</div>
                <div class="download-meta">
                    <span>歌手：${file.artist}</span>
                    <span>上传时间：${new Date(file.uploadDate).toLocaleDateString()}</span>
                </div>
            </div>
            <button class="download-button ${downloadedFiles.has(file._id) ? 'downloaded' : ''}" 
                    onclick="downloadFile('${file._id}')" 
                    id="download-${file._id}">
                ${downloadedFiles.has(file._id) ? '已下载' : '下载'}
            </button>
        </div>
    `).join('');
    
    updateSelectedCount();
}

// 切换文件选择状态
function toggleFileSelection(fileId) {
    if (selectedFiles.has(fileId)) {
        selectedFiles.delete(fileId);
    } else {
        selectedFiles.add(fileId);
    }
    updateSelectedCount();
}

// 全选/取消全选
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox.checked) {
        filteredFiles.forEach(file => selectedFiles.add(file._id));
    } else {
        selectedFiles.clear();
    }
    renderFilteredFiles();
}

// 更新选中数量
function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = selectedFiles.size;
}

// 批量下载
async function batchDownload() {
    if (selectedFiles.size === 0) {
        alert('请选择要下载的文件');
        return;
    }

    try {
        const fileIds = Array.from(selectedFiles);
        for (const fileId of fileIds) {
            await downloadFile(fileId);
        }
        selectedFiles.clear();
        renderFilteredFiles();
    } catch (error) {
        console.error('批量下载失败:', error);
        alert('部分文件下载失败，请重试');
    }
}

// 添加筛选事件监听
document.getElementById('artistFilter').addEventListener('change', applyFilters);
document.getElementById('dateFilter').addEventListener('change', applyFilters);

// 时间格式化函数
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 在文件开头添加下载状态管理
const downloadedFiles = new Set(JSON.parse(localStorage.getItem('downloadedFiles') || '[]'));

// 修改下载函数
async function downloadFile(fileId) {
    try {
        const button = document.getElementById(`download-${fileId}`);
        button.disabled = true;
        button.textContent = '下载中...';
        
        const response = await fetch(`/api/download/${fileId}`);
        const blob = await response.blob();
        
        // 从响应头获取文件名
        const disposition = response.headers.get('content-disposition');
        let fileName = 'download';
        if (disposition && disposition.includes('filename*=UTF-8')) {
            fileName = decodeURIComponent(disposition.split("''")[1]);
        }
        
        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // 更新下载状态
        downloadedFiles.add(fileId);
        localStorage.setItem('downloadedFiles', JSON.stringify([...downloadedFiles]));
        
        button.classList.add('downloaded');
        button.textContent = '已下载';
        button.disabled = false;
    } catch (error) {
        console.error('下载失败:', error);
        const button = document.getElementById(`download-${fileId}`);
        button.textContent = '下载失败';
        button.disabled = false;
        setTimeout(() => {
            button.textContent = '重试下载';
        }, 2000);
    }
}

// 添加折叠切换函数
window.toggleCategory = (header) => {
    const group = header.parentElement;
    group.classList.toggle('expanded');
};

// 修改分类过滤函数
async function filterFilesByCategory(category) {
    try {
        const response = await fetch(`/api/files?category=${encodeURIComponent(category)}`);
        if (!response.ok) throw new Error('请求失败');
        const files = await response.json();
        renderFiles(files);
    } catch (error) {
        console.error('分类过滤错误:', error);
        alert('无法获取分类文件');
    }
}

// 统一文件选择入口
document.querySelector('.upload-actions button').addEventListener('click', () => {
    console.log('选择文件按钮被点击');
    fileInput.click();
});

// 修复拖拽和点击事件处理
document.getElementById('dropZone').addEventListener('click', () => {
    console.log('拖拽区域被点击');
    fileInput.click();
});

// 统一文件选择处理函数
function handleFileSelect() {
    if (!window.isHandling) {
        window.isHandling = true;
        fileInput.click();
        setTimeout(() => window.isHandling = false, 500);
    }
}

// 增强版事件处理
function initUploadHandlers() {
    const confirmBtn = document.getElementById('confirmUpload');
    const cancelBtn = document.getElementById('cancelUpload');
    
    // 移除所有旧监听器
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    
    // 添加新监听器
    confirmBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('确认上传触发');
        await window.confirmUpload();
    });
    
    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('取消上传触发');
        window.cancelUpload();
    });
}

// 新增下载列表渲染函数
function renderDownloadList(files) {
    const container = document.getElementById('downloadList');
    container.innerHTML = files.map(file => `
        <div class="download-item">
            <div class="download-info">
                <div class="download-name">${file.name}</div>
                <div class="download-meta">
                    <span>歌手：${file.artist}</span>
                    <span>时长：${formatDuration(file.duration)}</span>
                    <span>上传时间：${new Date(file.uploadDate).toLocaleDateString()}</span>
                </div>
            </div>
            <button class="download-button" onclick="downloadFile('${file._id}')">
                下载
            </button>
        </div>
    `).join('');
}

// 新增搜索功能
window.searchSongs = async () => {
    const keyword = document.getElementById('searchInput').value;
    const response = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
    const files = await response.json();
    renderDownloadList(files);
};
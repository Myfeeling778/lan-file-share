<template>
  <div class="app" :class="{ 'service-active': running }">
    <div class="titlebar">
      <div class="titlebar-drag"></div>
      <div class="titlebar-title">局域网文件分享</div>
      <div class="titlebar-controls">
        <span class="ctrl-dot ctrl-min"></span>
        <span class="ctrl-dot ctrl-max"></span>
        <span class="ctrl-dot ctrl-close"></span>
      </div>
    </div>

    <div class="header">
      <div class="header-bg"></div>
      <div class="header-content">
        <div class="server-panel">
          <div class="server-status">
            <div class="status-indicator" :class="running ? 'on' : 'off'">
              <div class="pulse-ring" v-if="running"></div>
            </div>
            <div class="status-info">
              <div class="status-label">{{ running ? '服务运行中' : '服务已停止' }}</div>
              <div class="status-sub">{{ running ? '局域网设备可访问' : '点击启动按钮开启服务' }}</div>
            </div>
          </div>
          <div class="server-controls">
            <div class="port-group">
              <label>端口</label>
              <input type="number" v-model="port" :disabled="running" class="port-field" />
            </div>
            <button class="toggle-btn" :class="{ 'active': running }" @click="toggleServer">
              <span class="toggle-icon">{{ running ? '⏹' : '▶' }}</span>
              {{ running ? '停止' : '启动' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="main-body">
      <div class="info-card" v-if="running">
        <div class="info-card-header">
          <span class="info-icon">🌐</span>
          <span class="info-title">访问地址</span>
        </div>
        <div class="info-card-body">
          <div class="url-row">
            <div class="url-display">
              <span class="url-text">{{ localUrl }}</span>
            </div>
            <button class="action-btn copy-btn" @click="copyUrl(localUrl)">
              <span>📋</span> 复制
            </button>
            <button class="action-btn open-btn" @click="openBrowser(localUrl)">
              <span>🌍</span> 打开
            </button>
          </div>
          <div class="url-hint">其他设备在浏览器中输入此地址即可访问共享文件</div>
        </div>
        <div class="info-card-qr">
          <div ref="qrContainer" class="qr-wrapper"></div>
          <div class="qr-label">手机扫码访问</div>
        </div>
      </div>

      <div class="info-card offline-card" v-else>
        <div class="offline-icon">📡</div>
        <div class="offline-text">服务未启动</div>
        <div class="offline-hint">启动服务后，局域网内其他设备即可通过HTTP访问共享文件</div>
      </div>

      <div class="section-header">
        <div class="section-title">
          <span class="section-icon">📂</span>
          文件管理
        </div>
        <div class="file-count" v-if="files.length">{{ files.length }} 个文件</div>
      </div>

      <div class="toolbar">
        <div class="toolbar-left">
          <button class="tool-btn primary" @click="addFiles">
            <span class="tool-icon">+</span> 添加文件
          </button>
          <button class="tool-btn primary" @click="addFolder">
            <span class="tool-icon">📁</span> 添加文件夹
          </button>
        </div>
        <div class="toolbar-right">
          <button class="tool-btn" @click="refreshFiles">
            <span class="tool-icon">🔄</span> 刷新
          </button>
          <button class="tool-btn danger" @click="clearAllFiles" :disabled="!files.length">
            <span class="tool-icon">🗑</span> 清空
          </button>
        </div>
      </div>

      <div
        class="drop-zone"
        :class="{ dragover: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <div class="drop-visual">
          <div class="drop-arrow">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 4v28M14 22l10 10 10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 36h32" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
        <p class="drop-text">拖拽文件或文件夹到此处</p>
        <p class="drop-hint">支持任意格式文件，单次最大 10GB</p>
      </div>

      <div class="file-list" v-if="files.length">
        <div class="file-item header-row">
          <div class="file-col name-col">文件名</div>
          <div class="file-col size-col">大小</div>
          <div class="file-col time-col">修改时间</div>
          <div class="file-col action-col">操作</div>
        </div>
        <div class="file-item" v-for="file in files" :key="file.name">
          <div class="file-col name-col">
            <span class="file-icon">{{ file.isDirectory ? '📁' : getFileIcon(file.name) }}</span>
            <span class="file-name" :title="file.name">{{ file.name }}</span>
          </div>
          <div class="file-col size-col">
            <span class="size-badge" v-if="!file.isDirectory">{{ formatSize(file.size) }}</span>
            <span class="folder-badge" v-else>文件夹</span>
          </div>
          <div class="file-col time-col">{{ formatDate(file.mtime) }}</div>
          <div class="file-col action-col">
            <button v-if="!file.isDirectory" class="action-icon-btn download" @click="downloadFile(file.name)" title="下载">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1v10M4 7l4 4 4-4M2 13h12" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button class="action-icon-btn delete" @click="deleteFile(file.name)" title="删除">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <div class="empty-icon">📭</div>
        <div class="empty-title">暂无共享文件</div>
        <div class="empty-desc">点击上方按钮添加文件，或直接拖拽文件到上方区域</div>
      </div>
    </div>

    <div class="footer">Linの工具</div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import QRCode from 'qrcode';

const port = ref(18080);
const running = ref(false);
const localIP = ref('127.0.0.1');
const files = ref([]);
const isDragging = ref(false);
const qrContainer = ref(null);
const copied = ref(false);

const localUrl = computed(() => {
  if (!running.value) return '';
  return `http://${localIP.value}:${port.value}/`;
});

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const iconMap = {
    pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙',
    jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', bmp: '🖼', svg: '🖼', webp: '🖼',
    mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬', wmv: '🎬',
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵', ogg: '🎵',
    zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',
    exe: '⚙️', msi: '⚙️', dmg: '⚙️',
    txt: '📝', md: '📝', csv: '📝', json: '📝', xml: '📝',
    js: '📜', ts: '📜', py: '📜', java: '📜', c: '📜', cpp: '📜',
  };
  return iconMap[ext] || '📄';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function downloadFile(name) {
  await window.electronAPI?.downloadFile(name);
}

async function copyUrl(url) {
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  } catch {
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  }
}

function openBrowser(url) {
  window.electronAPI?.openInBrowser(url);
}

function openShareDir() {
  window.electronAPI?.openShareDir();
}

async function toggleServer() {
  if (running.value) {
    await window.electronAPI?.stopServer();
    running.value = false;
  } else {
    const result = await window.electronAPI?.startServer(port.value);
    if (result?.success) {
      running.value = true;
    } else {
      alert('启动失败: ' + (result?.error || '未知错误'));
    }
  }
}

async function refreshFiles() {
  const list = await window.electronAPI?.getFileList();
  files.value = list || [];
}

async function addFiles() {
  await window.electronAPI?.addFiles();
  await refreshFiles();
}

async function addFolder() {
  await window.electronAPI?.addFolder();
  await refreshFiles();
}

async function deleteFile(name) {
  if (!confirm(`确定删除 ${name}？`)) return;
  await window.electronAPI?.deleteFile(name);
  await refreshFiles();
}

async function clearAllFiles() {
  if (!confirm('确定清空全部共享文件？此操作不可恢复。')) return;
  await window.electronAPI?.clearAllFiles();
  await refreshFiles();
}

async function handleDrop(e) {
  isDragging.value = false;
  const droppedItems = e.dataTransfer.items;
  if (!droppedItems) return;
  for (const item of droppedItems) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) await processEntry(entry);
  }
  await refreshFiles();
}

async function processEntry(entry) {
  if (entry.isFile) {
    const file = await new Promise(resolve => entry.file(resolve));
    const formData = new FormData();
    formData.append('files', file);
    const url = `http://${localIP.value}:${port.value}/upload`;
    await fetch(url, { method: 'POST', body: formData });
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const entries = await new Promise(resolve => dirReader.readEntries(resolve));
    for (const e of entries) await processEntry(e);
  }
}

async function renderQR() {
  if (!running.value || !qrContainer.value) return;
  await nextTick();
  qrContainer.value.innerHTML = '';
  const canvas = document.createElement('canvas');
  qrContainer.value.appendChild(canvas);
  QRCode.toCanvas(canvas, localUrl.value, {
    width: 120,
    margin: 1,
    color: { dark: '#1e293b', light: '#ffffff' }
  });
}

onMounted(async () => {
  const ip = await window.electronAPI?.getLocalIP();
  if (ip) localIP.value = ip;
  const status = await window.electronAPI?.getServerStatus();
  if (status?.running) {
    running.value = true;
    port.value = status.port || 18080;
  }
  await refreshFiles();
  renderQR();
});

watch(running, async () => {
  await nextTick();
  renderQR();
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: #f5f7fa;
  overflow: hidden;
  color: #1e293b;
  -webkit-font-smoothing: antialiased;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.titlebar {
  height: 36px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  -webkit-app-region: drag;
  position: relative;
  z-index: 100;
  border-bottom: 1px solid #e5e7eb;
}

.titlebar-drag {
  flex: 1;
  height: 100%;
}

.titlebar-title {
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  letter-spacing: 0.5px;
}

.titlebar-controls {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.ctrl-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: block;
  cursor: pointer;
}

.ctrl-min { background: #fbbf24; }
.ctrl-max { background: #34d399; }
.ctrl-close { background: #f87171; }

.header {
  position: relative;
  padding: 0 24px 20px;
}

.header-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 50%, #ede9fe 100%);
  z-index: -1;
}

.header-content {
  padding-top: 4px;
}

.server-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  padding: 18px 24px;
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.server-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-indicator {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.status-indicator.on {
  background: linear-gradient(135deg, #059669, #10b981);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.25);
}

.status-indicator.off {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.25);
}

.pulse-ring {
  position: absolute;
  inset: -4px;
  border: 2px solid rgba(16, 185, 129, 0.4);
  border-radius: 16px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1); }
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-label {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.status-sub {
  font-size: 12px;
  color: #9ca3af;
}

.server-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.port-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.port-group label {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.port-field {
  width: 80px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #1e293b;
  font-size: 14px;
  font-weight: 500;
  font-family: 'SF Mono', 'Fira Code', monospace;
  outline: none;
  transition: all 0.2s;
}

.port-field:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.port-field:disabled {
  opacity: 0.5;
  background: #f9fafb;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25);
}

.toggle-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.35);
}

.toggle-btn.active {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.toggle-btn.active:hover {
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35);
}

.toggle-icon {
  font-size: 12px;
}

.main-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

.main-body::-webkit-scrollbar {
  width: 6px;
}

.main-body::-webkit-scrollbar-track {
  background: transparent;
}

.main-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.info-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.info-icon {
  font-size: 18px;
}

.info-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.info-card-body {
  flex: 1;
}

.url-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.url-display {
  flex: 1;
  padding: 10px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.url-text {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 14px;
  font-weight: 500;
  color: #2563eb;
  letter-spacing: 0.3px;
}

.url-hint {
  font-size: 12px;
  color: #9ca3af;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #4b5563;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
}

.action-btn span {
  font-size: 13px;
}

.info-card-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.qr-wrapper {
  background: white;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.qr-wrapper canvas {
  display: block;
  border-radius: 4px;
}

.qr-label {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
}

.offline-card {
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px;
}

.offline-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.offline-text {
  font-size: 16px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 6px;
}

.offline-hint {
  font-size: 13px;
  color: #9ca3af;
  max-width: 400px;
  line-height: 1.6;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.section-icon {
  font-size: 16px;
}

.file-count {
  font-size: 12px;
  padding: 4px 10px;
  background: #eff6ff;
  border-radius: 20px;
  color: #2563eb;
  font-weight: 500;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #4b5563;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.tool-btn.primary {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #2563eb;
}

.tool-btn.primary:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}

.tool-btn.danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-icon {
  font-size: 13px;
}

.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 20px;
  background: #ffffff;
}

.drop-zone:hover {
  border-color: #93c5fd;
  background: #f0f7ff;
}

.drop-zone.dragover {
  border-color: #3b82f6;
  background: #eff6ff;
  transform: scale(1.01);
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.08);
}

.drop-visual {
  margin-bottom: 16px;
}

.drop-arrow {
  color: #9ca3af;
  display: inline-block;
  animation: bounce 2s ease-in-out infinite;
}

.drop-zone:hover .drop-arrow,
.drop-zone.dragover .drop-arrow {
  color: #3b82f6;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.drop-text {
  font-size: 15px;
  font-weight: 500;
  color: #4b5563;
  margin-bottom: 4px;
}

.drop-hint {
  font-size: 12px;
  color: #9ca3af;
}

.file-list {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.file-item {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:not(.header-row):hover {
  background: #f9fafb;
}

.header-row {
  background: #f9fafb;
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.file-col {
  display: flex;
  align-items: center;
  min-width: 0;
}

.name-col {
  flex: 3;
  gap: 10px;
  min-width: 0;
}

.size-col {
  flex: 1;
  justify-content: flex-end;
}

.time-col {
  flex: 1.5;
  justify-content: flex-end;
  font-size: 12px;
  color: #9ca3af;
}

.action-col {
  flex: 0.8;
  justify-content: flex-end;
  gap: 6px;
}

.file-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.size-badge {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  padding: 3px 8px;
  background: #f3f4f6;
  border-radius: 6px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.folder-badge {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  padding: 3px 8px;
  background: #f9fafb;
  border-radius: 6px;
}

.action-icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.action-icon-btn:hover {
  background: #eff6ff;
  color: #2563eb;
}

.action-icon-btn.delete:hover {
  background: #fef2f2;
  color: #dc2626;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  color: #d1d5db;
}

.footer {
  text-align: center;
  padding: 12px;
  font-size: 11px;
  color: #d1d5db;
  letter-spacing: 1px;
  border-top: 1px solid #f3f4f6;
}
</style>

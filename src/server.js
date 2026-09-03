const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

let server = null;
let app = null;
let currentPort = null;

function safePathJoin(base, ...args) {
  const target = path.join(base, ...args);
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    return null;
  }
  return resolvedTarget;
}

function getWebPageHTML(ip, port) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>局域网文件分享</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,system-ui,sans-serif;background:#f5f7fa;color:#1e293b;min-height:100vh;overflow-x:hidden}

.header{position:relative;padding:40px 24px 32px;text-align:center;background:linear-gradient(135deg,#e0e7ff,#f0f4ff,#ede9fe)}
.header h1{font-size:28px;font-weight:700;color:#1e293b;letter-spacing:-.5px}
.header p{font-size:13px;color:#9ca3af;margin-top:8px;letter-spacing:.3px}
.header .badge{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:6px 14px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);border-radius:20px;font-size:12px;font-weight:500;color:#16a34a}
.header .badge::before{content:'';width:6px;height:6px;border-radius:50%;background:#22c55e;animation:glow 2s ease-in-out infinite}
@keyframes glow{0%,100%{opacity:.4;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}

.container{max-width:860px;margin:0 auto;padding:20px 20px 60px}

.stats-bar{display:flex;gap:12px;margin-bottom:20px}
.stat-card{flex:1;padding:16px 20px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.stat-label{font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}
.stat-value{font-size:22px;font-weight:700;color:#1e293b;font-variant-numeric:tabular-nums}

.upload-zone{border:2px dashed #d1d5db;border-radius:20px;padding:48px 24px;text-align:center;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);margin-bottom:20px;background:#ffffff}
.upload-zone:hover{border-color:#93c5fd;background:#f0f7ff}
.upload-zone.dragover{border-color:#3b82f6;background:#eff6ff;transform:scale(1.01);box-shadow:0 0 30px rgba(59,130,246,.08)}
.upload-icon{width:56px;height:56px;margin:0 auto 16px;border-radius:16px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:24px;transition:all .3s}
.upload-zone:hover .upload-icon{background:#dbeafe;transform:translateY(-2px)}
.upload-zone p{font-size:15px;font-weight:500;color:#4b5563;margin-bottom:4px}
.upload-zone .hint{font-size:12px;color:#9ca3af}

.file-list{background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.file-header{display:flex;padding:12px 24px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px}
.file-item{display:flex;align-items:center;padding:16px 24px;border-bottom:1px solid #f3f4f6;transition:background .15s}
.file-item:last-child{border-bottom:none}
.file-item:hover{background:#f9fafb}
.file-col{display:flex;align-items:center;min-width:0}
.col-name{flex:3;gap:12px;min-width:0}
.col-size{flex:1;justify-content:flex-end}
.col-time{flex:1.5;justify-content:flex-end;font-size:12px;color:#9ca3af}
.col-action{flex:1;justify-content:flex-end;gap:8px}
.file-icon-wrap{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.file-icon-wrap.doc{background:#eff6ff}
.file-icon-wrap.img{background:#f5f3ff}
.file-icon-wrap.video{background:#fef2f2}
.file-icon-wrap.audio{background:#fefce8}
.file-icon-wrap.archive{background:#f0fdf4}
.file-icon-wrap.code{background:#ecfeff}
.file-icon-wrap.folder{background:#f9fafb}
.file-icon-wrap.other{background:#f9fafb}
.file-name-text{font-size:14px;font-weight:500;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.file-size{font-size:12px;font-weight:500;color:#6b7280;padding:4px 10px;background:#f3f4f6;border-radius:8px;font-family:'SF Mono',ui-monospace,monospace}
.file-folder-tag{font-size:11px;font-weight:500;color:#9ca3af;padding:4px 10px;background:#f9fafb;border-radius:8px}
.btn{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all .2s;text-decoration:none}
.btn-dl{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe}
.btn-dl:hover{background:#dbeafe;border-color:#93c5fd;transform:translateY(-1px)}
.btn-del{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.btn-del:hover{background:#fee2e2;border-color:#fca5a5}
.empty{text-align:center;padding:64px 20px}
.empty-icon{font-size:48px;margin-bottom:16px;opacity:.5}
.empty-text{font-size:15px;font-weight:500;color:#9ca3af;margin-bottom:6px}
.empty-hint{font-size:13px;color:#d1d5db}

.toast{position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-100px);padding:12px 24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;color:#1e293b;font-size:13px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,.1);z-index:9999;transition:transform .3s cubic-bezier(.4,0,.2,1);pointer-events:none}
.toast.show{transform:translateX(-50%) translateY(0)}

.progress-overlay{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:14px 24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;color:#1e293b;font-size:13px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,.1);z-index:9999;display:none;align-items:center;gap:12px}
.progress-overlay.show{display:flex}
.spinner{width:18px;height:18px;border:2px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.footer{text-align:center;padding:16px;font-size:11px;color:#d1d5db;letter-spacing:1px}

@media(max-width:600px){
  .header h1{font-size:22px}
  .stats-bar{flex-direction:column}
  .col-time{display:none}
  .file-header .th-time{display:none}
  .file-item{padding:14px 16px}
  .file-header{padding:10px 16px}
}
</style>
</head>
<body>
<div class="header">
  <h1>局域网文件分享</h1>
  <p>在同一网络下的任何设备访问此页面</p>
  <div class="badge">在线服务</div>
</div>
<div class="container">
  <div class="stats-bar">
    <div class="stat-card"><div class="stat-label">文件数量</div><div class="stat-value" id="statCount">-</div></div>
    <div class="stat-card"><div class="stat-label">总大小</div><div class="stat-value" id="statSize">-</div></div>
  </div>
  <div class="upload-zone" id="dropZone">
    <div class="upload-icon">⬆</div>
    <p>拖拽文件到此处上传</p>
    <div class="hint">或点击选择文件 · 支持任意格式</div>
    <input type="file" id="fileInput" multiple style="display:none">
  </div>
  <div id="fileList"></div>
</div>
<div class="toast" id="toast"></div>
<div class="progress-overlay" id="progress"><div class="spinner"></div><span id="progressText">上传中...</span></div>
<div class="footer">Linの工具</div>
<script>
const dropZone=document.getElementById('dropZone');
const fileInput=document.getElementById('fileInput');
const toast=document.getElementById('toast');
const progress=document.getElementById('progress');
const progressText=document.getElementById('progressText');

function showToast(msg,duration){
  toast.textContent=msg;toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),duration||2000);
}

function getFileType(name){
  const ext=name.split('.').pop().toLowerCase();
  const map={pdf:'doc',doc:'doc',docx:'doc',xls:'doc',xlsx:'doc',ppt:'doc',pptx:'doc',
    jpg:'img',jpeg:'img',png:'img',gif:'img',bmp:'img',svg:'img',webp:'img',
    mp4:'video',avi:'video',mkv:'video',mov:'video',wmv:'video',
    mp3:'audio',wav:'audio',flac:'audio',aac:'audio',ogg:'audio',
    zip:'archive',rar:'archive','7z':'archive',tar:'archive',gz:'archive',
    js:'code',ts:'code',py:'code',java:'code',c:'code',cpp:'code',html:'code',css:'code',json:'code',xml:'code'};
  return map[ext]||'other';
}

function getFileIcon(name){
  const ext=name.split('.').pop().toLowerCase();
  const map={pdf:'📕',doc:'📘',docx:'📘',xls:'📗',xlsx:'📗',ppt:'📙',pptx:'📙',
    jpg:'🖼',jpeg:'🖼',png:'🖼',gif:'🖼',svg:'🖼',webp:'🖼',
    mp4:'🎬',avi:'🎬',mkv:'🎬',mov:'🎬',
    mp3:'🎵',wav:'🎵',flac:'🎵',
    zip:'📦',rar:'📦','7z':'📦',
    txt:'📝',md:'📝',json:'📝',
    js:'📜',ts:'📜',py:'📜',java:'📜'};
  return map[ext]||'📄';
}

dropZone.addEventListener('click',()=>fileInput.click());
dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('dragover')});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('dragover');uploadFiles(e.dataTransfer.files)});
fileInput.addEventListener('change',e=>{uploadFiles(e.target.files);e.target.value=''});

async function uploadFiles(files){
  if(!files.length)return;
  const fd=new FormData();
  let totalSize=0;
  for(const f of files){fd.append('files',f);totalSize+=f.size}
  progress.classList.add('show');
  progressText.textContent='正在上传 '+files.length+' 个文件...';
  try{
    const r=await fetch('/upload',{method:'POST',body:fd});
    progress.classList.remove('show');
    if(r.ok){showToast('上传成功');loadFiles()}
    else showToast('上传失败',3000);
  }catch(e){progress.classList.remove('show');showToast('上传出错',3000)}
}

async function deleteFile(name){
  if(!confirm('确定删除 '+name+' ？'))return;
  try{await fetch('/delete/'+encodeURIComponent(name),{method:'DELETE'});showToast('已删除');loadFiles()}
  catch(e){showToast('删除失败',3000)}
}

function formatSize(b){
  if(b===0)return '0 B';
  const k=1024,s=['B','KB','MB','GB','TB'];
  const i=Math.floor(Math.log(b)/Math.log(k));
  return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+s[i];
}

function formatDate(d){
  const date=new Date(d);
  const now=new Date();const diff=now-date;
  if(diff<60000)return'刚刚';
  if(diff<3600000)return Math.floor(diff/60000)+' 分钟前';
  if(diff<86400000)return Math.floor(diff/3600000)+' 小时前';
  return date.toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}

async function loadFiles(){
  try{
    const r=await fetch('/api/files');
    const files=await r.json();
    const el=document.getElementById('fileList');
    let totalSize=0;files.forEach(f=>{if(!f.isDirectory)totalSize+=f.size});
    document.getElementById('statCount').textContent=files.length;
    document.getElementById('statSize').textContent=formatSize(totalSize);
    if(!files.length){el.innerHTML='<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">暂无共享文件</div><div class="empty-hint">拖拽文件到上方区域即可上传</div></div>';return}
    let h='<div class="file-header"><div class="col-name th-name">文件名</div><div class="col-size th-size">大小</div><div class="col-time th-time">修改时间</div><div class="col-action th-action">操作</div></div>';
    files.forEach(f=>{
      const type=f.isDirectory?'folder':getFileType(f.name);
      const icon=f.isDirectory?'📁':getFileIcon(f.name);
      h+='<div class="file-item"><div class="file-col col-name"><div class="file-icon-wrap '+type+'">'+icon+'</div><span class="file-name-text">'+f.name+'</span></div>';
      h+='<div class="file-col col-size">'+(f.isDirectory?'<span class="file-folder-tag">文件夹</span>':'<span class="file-size">'+formatSize(f.size)+'</span>')+'</div>';
      h+='<div class="file-col col-time">'+formatDate(f.mtime)+'</div>';
      h+='<div class="file-col col-action">';
      if(!f.isDirectory)h+='<a href="/download/'+encodeURIComponent(f.name)+'" class="btn btn-dl">↓ 下载</a>';
      h+='<button class="btn btn-del" onclick="deleteFile(\\''+f.name.replace(/'/g,"\\\\'")+'\\')">删除</button></div></div>';
    });
    el.innerHTML=h;
  }catch(e){console.error(e)}
}
loadFiles();
</script>
</body>
</html>`;
}

function setupRoutes(app, shareDir) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, shareDir),
    filename: (req, file, cb) => {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, originalName);
    }
  });
  const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 * 1024 } });

  app.get('/', (req, res) => {
    res.send(getWebPageHTML());
  });

  app.get('/api/files', (req, res) => {
    try {
      const files = fs.readdirSync(shareDir);
      const result = files.map(name => {
        const filePath = path.join(shareDir, name);
        try {
          const stat = fs.statSync(filePath);
          return { name, size: stat.size, mtime: stat.mtime.toISOString(), isDirectory: stat.isDirectory() };
        } catch { return null; }
      }).filter(Boolean);
      res.json(result);
    } catch { res.json([]); }
  });

  app.post('/upload', upload.array('files', 50), (req, res) => {
    res.json({ success: true });
  });

  app.get('/download/:filename', (req, res) => {
    const fileName = decodeURIComponent(req.params.filename);
    const safe = safePathJoin(shareDir, fileName);
    if (!safe || !fs.existsSync(safe)) {
      return res.status(404).send('File not found');
    }
    const mimeType = mime.lookup(safe) || 'application/octet-stream';
    const stat = fs.statSync(safe);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(safe).pipe(res);
  });

  app.delete('/delete/:filename', (req, res) => {
    const fileName = decodeURIComponent(req.params.filename);
    const safe = safePathJoin(shareDir, fileName);
    if (!safe) return res.status(400).json({ error: 'Invalid path' });
    try {
      const stat = fs.statSync(safe);
      if (stat.isDirectory()) {
        fs.rmSync(safe, { recursive: true, force: true });
      } else {
        fs.unlinkSync(safe);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

async function startServer(port, shareDir, ip) {
  if (server) {
    await stopServer();
  }
  return new Promise((resolve, reject) => {
    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    setupRoutes(app, shareDir);
    server = app.listen(port, '0.0.0.0', () => {
      currentPort = port;
      console.log(`Server running on http://${ip}:${port}`);
      resolve();
    });
    server.on('error', (err) => {
      reject(err);
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        server = null;
        app = null;
        currentPort = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

function getServerStatus() {
  return {
    running: server !== null,
    port: currentPort
  };
}

module.exports = { startServer, stopServer, getServerStatus };

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const archiver = require('archiver');

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
.folder-pick{color:#2563eb;cursor:pointer;text-decoration:none;font-weight:500}
.folder-pick:hover{text-decoration:underline}

.file-list{background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.fl-header{display:grid;grid-template-columns:1fr 90px 140px 120px;padding:10px 24px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;background:#f9fafb}
.fl-row{display:grid;grid-template-columns:1fr 90px 140px 120px;align-items:center;padding:14px 24px;border-bottom:1px solid #f3f4f6;transition:background .15s}
.fl-row:last-child{border-bottom:none}
.fl-row:hover{background:#f9fafb}
.fl-row.is-folder{background:#fafbfc}
.fl-row.is-folder:hover{background:#f0f4f8}
.fl-name{display:flex;align-items:center;gap:12px;min-width:0}
.fl-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.fl-icon.ft-doc{background:#eff6ff}
.fl-icon.ft-img{background:#fdf4ff}
.fl-icon.ft-video{background:#fef2f2}
.fl-icon.ft-audio{background:#fefce8}
.fl-icon.ft-archive{background:#f0fdf4}
.fl-icon.ft-code{background:#ecfeff}
.fl-icon.ft-other{background:#f9fafb}
.fl-icon.fl-icon-folder{background:#f0f7ff}
.fl-name-text{font-size:13px;font-weight:500;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fl-folder-name{color:#2563eb;cursor:pointer;text-decoration:none}
.fl-folder-name:hover{text-decoration:underline}
.fl-size{text-align:right}
.fl-size-text{font-size:12px;font-weight:500;color:#6b7280;font-family:'SF Mono',ui-monospace,monospace}
.fl-type-text{font-size:11px;color:#9ca3af}
.fl-time{text-align:right;font-size:12px;color:#9ca3af}
.fl-action{display:flex;justify-content:flex-end;gap:6px}
.btn{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all .15s;text-decoration:none}
.btn-dl{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe}
.btn-dl:hover{background:#dbeafe;border-color:#93c5fd;transform:translateY(-1px)}
.btn-del{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.btn-del:hover{background:#fee2e2;border-color:#fca5a5}
.empty{text-align:center;padding:64px 20px}
.empty-icon{font-size:48px;margin-bottom:16px;opacity:.5}
.empty-text{font-size:15px;font-weight:500;color:#9ca3af;margin-bottom:6px}
.empty-hint{font-size:13px;color:#d1d5db}

.breadcrumb{display:flex;align-items:center;gap:4px;padding:10px 24px;font-size:13px;flex-wrap:wrap}
.bc-item{color:#6b7280;white-space:nowrap}
.bc-link{color:#2563eb;cursor:pointer;text-decoration:none}
.bc-link:hover{text-decoration:underline}
.bc-sep{color:#d1d5db}
.folder-link{cursor:pointer;color:#2563eb;text-decoration:none}
.folder-link:hover{text-decoration:underline}

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
  .fl-header,.fl-h-time,.fl-time{display:none}
  .fl-row{grid-template-columns:1fr 80px;gap:0}
  .fl-header{display:none}
  .fl-row{padding:14px 16px}
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
    <p>拖拽文件或文件夹到此处上传</p>
    <div class="hint">或 <a class="folder-pick" id="fileBtn">选择文件</a> · <a class="folder-pick" id="folderBtn">选择文件夹</a></div>
    <input type="file" id="fileInput" multiple style="display:none">
    <input type="file" id="folderInput" webkitdirectory style="display:none">
  </div>
  <div id="fileList"></div>
</div>
<div class="toast" id="toast"></div>
<div class="progress-overlay" id="progress"><div class="spinner"></div><span id="progressText">上传中...</span></div>
<div class="footer">Linの工具</div>
<script>
let currentPath='';
const dropZone=document.getElementById('dropZone');
const fileInput=document.getElementById('fileInput');
const folderInput=document.getElementById('folderInput');
const fileBtn=document.getElementById('fileBtn');
const folderBtn=document.getElementById('folderBtn');
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
    mp4:'video',avi:'video',mkv:'video',mov:'video',
    mp3:'audio',wav:'audio',flac:'audio',
    zip:'archive',rar:'archive','7z':'archive',
    js:'code',ts:'code',py:'code',java:'code',html:'code',css:'code',json:'code'};
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
dropZone.addEventListener('drop',async e=>{
  e.preventDefault();dropZone.classList.remove('dragover');
  const items=e.dataTransfer.items;
  if(!items||!items.length){uploadFiles(e.dataTransfer.files);return}
  const allFiles=[];
  for(const item of items){
    const entry=item.webkitGetAsEntry?.();
    if(entry)await readEntry(entry,'',allFiles);
  }
  if(allFiles.length)uploadFolderFiles(allFiles);
});
fileInput.addEventListener('click',e=>e.stopPropagation());
fileInput.addEventListener('change',e=>{uploadFiles(e.target.files);e.target.value=''});
folderBtn.addEventListener('click',e=>{e.stopPropagation();folderInput.click()});
folderInput.addEventListener('click',e=>e.stopPropagation());
folderInput.addEventListener('change',e=>{
  const files=[];const relPaths=[];
  for(const f of e.target.files){files.push(f);relPaths.push(f.webkitRelativePath||f.name)}
  uploadFolderWithPaths(files,relPaths);
  e.target.value='';
});

function readEntry(entry,prefix,list){
  return new Promise(resolve=>{
    if(entry.isFile){
      entry.file(f=>{f._relPath=prefix?prefix+'/'+f.name:f.name;list.push(f);resolve()});
    }else if(entry.isDirectory){
      const reader=entry.createReader();
      const readAll=(cb)=>{
        reader.readEntries(entries=>{
          if(!entries.length){cb();return}
          Promise.all(entries.map(e=>readEntry(e,prefix?prefix+'/'+entry.name:entry.name,list))).then(()=>readAll(cb));
        });
      };
      readAll(resolve);
    }else{resolve()}
  });
}

async function uploadFiles(files){
  if(!files.length)return;
  const fd=new FormData();
  for(const f of files)fd.append('files',f);
  progress.classList.add('show');
  progressText.textContent='正在上传 '+files.length+' 个文件...';
  try{
    const r=await fetch('/upload',{method:'POST',body:fd});
    progress.classList.remove('show');
    if(r.ok){showToast('上传成功');loadFiles()}
    else showToast('上传失败',3000);
  }catch(e){progress.classList.remove('show');showToast('上传出错',3000)}
}

async function uploadFolderFiles(files){
  if(!files.length)return;
  const groups={};
  for(const f of files){
    const rp=f._relPath||f.name;
    const dir=rp.includes('/')?rp.substring(0,rp.lastIndexOf('/')):'_root';
    if(!groups[dir])groups[dir]=[];
    groups[dir].push(f);
  }
  progress.classList.add('show');
  const dirs=Object.keys(groups);
  let done=0;
  for(const dir of dirs){
    progressText.textContent='正在上传... ('+done+'/'+files.length+')';
    const fd=new FormData();
    for(const f of groups[dir])fd.append('files',f);
    const qdir=dir==='_root'?'':dir;
    try{await fetch('/upload-to-dir?dir='+encodeURIComponent(qdir),{method:'POST',body:fd})}
    catch(e){}
    done+=groups[dir].length;
  }
  progress.classList.remove('show');
  showToast('上传成功');
  loadFiles();
}

async function uploadFolderWithPaths(files,relPaths){
  if(!files.length)return;
  const groups={};
  for(let i=0;i<files.length;i++){
    const rp=relPaths[i]||files[i].name;
    const dir=rp.includes('/')?rp.substring(0,rp.lastIndexOf('/')):'_root';
    if(!groups[dir])groups[dir]=[];
    groups[dir].push(files[i]);
  }
  progress.classList.add('show');
  const dirs=Object.keys(groups);
  let done=0;
  for(const dir of dirs){
    progressText.textContent='正在上传... ('+done+'/'+files.length+')';
    const fd=new FormData();
    for(const f of groups[dir])fd.append('files',f);
    const qdir=dir==='_root'?'':dir;
    try{await fetch('/upload-to-dir?dir='+encodeURIComponent(qdir),{method:'POST',body:fd})}
    catch(e){}
    done+=groups[dir].length;
  }
  progress.classList.remove('show');
  showToast('上传成功');
  loadFiles();
}

async function deleteFile(name){
  const fullPath=currentPath?currentPath+'/'+name:name;
  if(!confirm('确定删除 '+name+' ？'))return;
  try{await fetch('/delete/'+encodeURIComponent(fullPath),{method:'DELETE'});showToast('已删除');loadFiles()}
  catch(e){showToast('删除失败',3000)}
}

function enterFolder(name){
  currentPath=currentPath?currentPath+'/'+name:name;
  loadFiles();
}

function navigateTo(idx){
  if(idx<0){currentPath='';}
  else{currentPath=currentPath.split('/').slice(0,idx+1).join('/');}
  loadFiles();
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
    const url=currentPath?'/api/files?path='+encodeURIComponent(currentPath):'/api/files';
    const r=await fetch(url);
    const files=await r.json();
    const el=document.getElementById('fileList');
    let totalSize=0;files.forEach(f=>{if(!f.isDirectory)totalSize+=f.size});
    document.getElementById('statCount').textContent=files.length;
    document.getElementById('statSize').textContent=formatSize(totalSize);

    let breadcrumb='<div class="breadcrumb"><span class="bc-item'+(currentPath?' bc-link':'')+'" onclick="navigateTo(-1)">🏠 全部文件</span>';
    if(currentPath){
      const parts=currentPath.split('/');
      parts.forEach((p,i)=>{
        breadcrumb+='<span class="bc-sep">/</span><span class="bc-item'+(i<parts.length-1?' bc-link':'')+'" onclick="navigateTo('+i+')">'+p+'</span>';
      });
    }
    breadcrumb+='</div>';

    if(!files.length){el.innerHTML=breadcrumb+'<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">此目录为空</div><div class="empty-hint">拖拽文件到上方区域即可上传</div></div>';return}
    let h=breadcrumb+'<div class="fl-header"><div class="fl-h-name">文件名</div><div class="fl-h-size">大小</div><div class="fl-h-time">修改时间</div><div class="fl-h-action">操作</div></div>';
    files.forEach(f=>{
      const type=f.isDirectory?'fl-icon-folder':getFileType(f.name);
      const icon=f.isDirectory?'📁':getFileIcon(f.name);
      const nameHtml=f.isDirectory?'<a class="fl-name-text fl-folder-name" onclick="enterFolder(\\''+f.name.replace(/'/g,"\\\\'")+'\\')">'+f.name+'</a>':'<span class="fl-name-text">'+f.name+'</span>';
      h+='<div class="fl-row'+(f.isDirectory?' is-folder':'')+'"><div class="fl-name"><div class="fl-icon '+type+'">'+icon+'</div>'+nameHtml+'</div>';
      h+='<div class="fl-size">'+(f.isDirectory?'<span class="fl-type-text">文件夹</span>':'<span class="fl-size-text">'+formatSize(f.size)+'</span>')+'</div>';
      h+='<div class="fl-time">'+formatDate(f.mtime)+'</div>';
      h+='<div class="fl-action">';
      const fp=currentPath?currentPath+'/'+f.name:f.name;
      h+='<a href="/download/'+encodeURIComponent(fp)+'" class="btn btn-dl">↓ 下载</a>';
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
      const subPath = req.query.path || '';
      const targetDir = subPath ? safePathJoin(shareDir, subPath) : shareDir;
      if (!targetDir) return res.status(400).json([]);
      const files = fs.readdirSync(targetDir);
      const result = files.map(name => {
        const filePath = path.join(targetDir, name);
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

  app.post('/upload-to-dir', (req, res) => {
    const subDir = req.query.dir || '';
    const targetDir = subDir ? safePathJoin(shareDir, subDir) : shareDir;
    const destDir = targetDir || shareDir;
    fs.mkdir(destDir, { recursive: true }, () => {
      const storage2 = multer.diskStorage({
        destination: (req2, file, cb) => cb(null, destDir),
        filename: (req2, file, cb) => {
          cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8'));
        }
      });
      const upload2 = multer({ storage: storage2, limits: { fileSize: 10 * 1024 * 1024 * 1024 } });
      upload2.array('files', 200)(req, res, (err) => {
        if (err) {
          console.error('Upload error:', err.message);
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
      });
    });
  });

  app.get('/download/*', (req, res) => {
    const fileName = decodeURIComponent(req.params[0]);
    const safe = safePathJoin(shareDir, fileName);
    if (!safe || !fs.existsSync(safe)) {
      return res.status(404).send('File not found');
    }
    const stat = fs.statSync(safe);
    if (stat.isDirectory()) {
      const baseName = path.basename(fileName);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(baseName + '.zip')}`);
      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.pipe(res);
      archive.directory(safe, baseName);
      archive.finalize();
      return;
    }
    const mimeType = mime.lookup(safe) || 'application/octet-stream';
    const baseName = path.basename(fileName);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}`);
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(safe).pipe(res);
  });

  app.delete('/delete/*', (req, res) => {
    const fileName = decodeURIComponent(req.params[0]);
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
    setupRoutes(app, shareDir);
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
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
      const timeout = setTimeout(() => {
        server = null;
        app = null;
        currentPort = null;
        resolve();
      }, 3000);
      server.close(() => {
        clearTimeout(timeout);
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

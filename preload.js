const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  // 1. 拦截本地文件与测试按钮
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btnTestLocalOpen');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      ipcRenderer.send('open-local-path', 'C:\\Windows');
      return;
    }

    const link = e.target.closest('a');
    if (link && link.href && link.href.startsWith('animeshelf:')) {
      e.preventDefault();
      ipcRenderer.send('open-local-path', decodeURIComponent(link.href));
    }
  }, true);

  // 2. 右下角悬浮栏：打开数据目录 + 自定义目录
  if (!document.getElementById('electron-float-right')) {
    const barRight = document.createElement('div');
    barRight.id = 'electron-float-right';
    Object.assign(barRight.style, {
      position: 'fixed', right: '16px', bottom: '16px', zIndex: '99999',
      display: 'flex', gap: '6px'
    });

    const btnOpen = document.createElement('button');
    btnOpen.innerText = '📂 打开数据目录';
    const btnSet = document.createElement('button');
    btnSet.innerText = '⚙️ 自定义目录';

    [btnOpen, btnSet].forEach(b => {
      Object.assign(b.style, {
        padding: '6px 10px', fontSize: '12px', color: '#fff',
        backgroundColor: 'rgba(79, 70, 229, 0.85)', border: 'none',
        borderRadius: '6px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      });
    });

    btnOpen.onclick = () => ipcRenderer.send('open-data-folder');
    btnSet.onclick = async () => {
      const cur = await ipcRenderer.invoke('get-current-data-path');
      const next = prompt('请输入新的数据存储文件夹路径（例如 D:\\AnimeData）：', cur);
      if (next && next.trim() !== cur) {
        const res = await ipcRenderer.invoke('set-custom-data-path', next);
        alert(res.msg + '\n新路径：' + next + '\n（注：更改后请关闭软件重新打开，并重新导入一次 JSON 备份）');
      }
    };

    barRight.appendChild(btnOpen);
    barRight.appendChild(btnSet);
    document.body.appendChild(barRight);
  }

  // 3. 左下角独立悬浮栏：一键清空数据（连续五次确认 + 锁定防回写 + 立刻重载页面）
  if (!document.getElementById('electron-float-left')) {
    const barLeft = document.createElement('div');
    barLeft.id = 'electron-float-left';
    Object.assign(barLeft.style, {
      position: 'fixed', left: '16px', bottom: '16px', zIndex: '99999',
      display: 'flex', gap: '6px'
    });

    const btnClear = document.createElement('button');
    btnClear.innerText = '🗑️ 清空所有数据';
    Object.assign(btnClear.style, {
      padding: '6px 10px', fontSize: '12px', color: '#fff',
      backgroundColor: 'rgba(220, 38, 38, 0.85)', border: 'none',
      borderRadius: '6px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    });
    btnClear.onmouseenter = () => btnClear.style.backgroundColor = 'rgba(220, 38, 38, 1)';
    btnClear.onmouseleave = () => btnClear.style.backgroundColor = 'rgba(220, 38, 38, 0.85)';

    btnClear.onclick = async () => {
      const warnings = [
        '【第 1 / 5 次确认】\n确定要清空软件内的所有追番数据和本地缓存吗？',
        '【第 2 / 5 次确认】\n警告：清空后所有未导出的记录将无法恢复！是否继续？',
        '【第 3 / 5 次确认】\n再次提醒：请确保你已经提前导出了 JSON 备份文件！确定继续清空吗？',
        '【第 4 / 5 次确认】\n即将抹除所有 LocalStorage 和 IndexedDB 数据库，真的确定吗？',
        '【第 5 / 5 次最终确认】\n最后一次确认：点击「确定」将立刻彻底清空全部数据并重载界面！'
      ];
      for (let i = 0; i < warnings.length; i++) {
        if (!confirm(warnings[i])) {
          return;
        }
      }

      // 彻底清空底层存储
      localStorage.clear();
      sessionStorage.clear();
      if (window.indexedDB && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db.name) indexedDB.deleteDatabase(db.name);
        }
      }

      // 临时锁死写入接口，防止网页在刷新瞬间把内存里的旧数据重新写回硬盘
      Storage.prototype.setItem = function() {};

      // 立刻刷新重载页面
      location.reload();
    };

    barLeft.appendChild(btnClear);
    document.body.appendChild(barLeft);
  }
});

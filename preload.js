const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  async function wipeAllVisibleRows(excludeBtn) {
    const rawConfirm = window.confirm;
    window.confirm = () => true;
    let safetyCount = 0;
    while (safetyCount < 3000) {
      const delBtns = Array.from(document.querySelectorAll('table button, tbody button, [title*="删除"], [aria-label*="删除"]'))
        .filter(b => b !== excludeBtn && !b.closest('#electron-float-left') && !b.closest('#electron-float-right') && (
          (b.title && b.title.includes('删')) ||
          (b.innerText && b.innerText.includes('删')) ||
          (b.innerHTML && (b.innerHTML.includes('trash') || b.innerHTML.includes('M3 6h18') || b.innerHTML.includes('M19 7l') || b.innerHTML.includes('polyline')))
        ));
      if (delBtns.length === 0) break;
      delBtns[0].click();
      safetyCount++;
      await new Promise(r => setTimeout(r, 15));
    }
    window.confirm = rawConfirm;
  }

  if (sessionStorage.getItem('__wipe_seed_after_reload') === '1') {
    sessionStorage.removeItem('__wipe_seed_after_reload');
    setTimeout(async () => {
      await wipeAllVisibleRows(null);
      alert('✅ 已彻底清空全部数据（含默认演示条目），当前为 0 条纯空白看板！');
    }, 400);
  }

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
        '【第 4 / 5 次确认】\n即将彻底抹除全部记录（含内置默认示例条目），真的确定吗？',
        '【第 5 / 5 次最终确认】\n最后一次确认：点击「确定」将立刻彻底清空并变成 0 条纯空白看板！'
      ];
      for (let i = 0; i < warnings.length; i++) {
        if (!confirm(warnings[i])) return;
      }

      await wipeAllVisibleRows(btnClear);

      localStorage.clear();
      if (window.indexedDB && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db.name) indexedDB.deleteDatabase(db.name);
        }
      }

      sessionStorage.setItem('__wipe_seed_after_reload', '1');
      Storage.prototype.setItem = function() {};
      location.reload();
    };

    barLeft.appendChild(btnClear);
    document.body.appendChild(barLeft);
  }
});

const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  // 拦截页面内所有动态创建的 animeshelf: 跳转或测试打开按钮
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
});

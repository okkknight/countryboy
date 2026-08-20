const copyButton = document.querySelector('[data-copy-path]');
const copyStatus = document.querySelector('#copy-status');

if (copyButton && copyStatus) {
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copyPath);
      copyStatus.textContent = '已复制，去 Chrome 地址栏粘贴。';
    } catch {
      copyStatus.textContent = '复制失败，请手动输入 chrome://extensions。';
    }
  });
}

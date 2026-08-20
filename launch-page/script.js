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

const juanWrap = document.querySelector('.juan-wrap');
const juanImage = juanWrap?.querySelector('img');

if (juanWrap && juanImage?.animate) {
  const juanSpin = juanImage.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    { duration: 220, iterations: Infinity, easing: 'linear' },
  );
  juanSpin.playbackRate = 0;

  let speed = 0;
  let targetSpeed = 0;
  let previousTime = 0;
  let animationFrame = null;

  const startMotion = () => {
    if (animationFrame !== null) return;
    previousTime = performance.now();
    animationFrame = requestAnimationFrame((timestamp) => updateMotion(timestamp));
  };

  const updateMotion = (timestamp) => {
    const elapsed = Math.min(timestamp - previousTime, 100);
    previousTime = timestamp;
    const responseTime = targetSpeed > speed ? 75 : 650;
    const blend = 1 - Math.exp(-elapsed / responseTime);
    speed += (targetSpeed - speed) * blend;

    if (targetSpeed === 0 && speed < 0.001) {
      speed = 0;
      juanSpin.playbackRate = 0;
      animationFrame = null;
      return;
    }

    juanSpin.playbackRate = speed;
    animationFrame = requestAnimationFrame((nextTimestamp) => updateMotion(nextTimestamp));
  };

  juanWrap.addEventListener('pointerenter', () => {
    targetSpeed = 1;
    startMotion();
  });

  juanWrap.addEventListener('pointerleave', () => {
    targetSpeed = 0;
    startMotion();
  });
}

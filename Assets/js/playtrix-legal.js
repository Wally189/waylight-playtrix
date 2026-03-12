(function () {
  function footerDateTime() {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
    const month = now.toLocaleDateString('en-GB', { month: 'long' });
    const day = now.getDate();
    const suffix = (day % 100 >= 11 && day % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.querySelectorAll('[data-datetime]').forEach((node) => {
      node.textContent = weekday + ' ' + day + suffix + ' ' + month + ' ' + now.getFullYear() + ' ' + hours + ':' + minutes;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    footerDateTime();
    window.setInterval(footerDateTime, 60000);
  });
})();

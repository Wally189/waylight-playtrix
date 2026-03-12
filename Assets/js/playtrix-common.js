(function () {
  function formatFooterDateTime(date) {
    const now = date || new Date();
    const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
    const month = now.toLocaleDateString('en-GB', { month: 'long' });
    const day = now.getDate();
    const suffix = (day % 100 >= 11 && day % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${weekday} ${day}${suffix} ${month} ${now.getFullYear()} ${hours}:${minutes}`;
  }

  function updateFooterDateTime() {
    const text = formatFooterDateTime();
    document.querySelectorAll('[data-datetime]').forEach(function (node) {
      node.textContent = text;
    });
  }

  function startFooterClock() {
    updateFooterDateTime();
    if (window.__playtrixFooterClock) return;
    window.__playtrixFooterClock = window.setInterval(updateFooterDateTime, 60000);
  }

  function normaliseActionLink(value) {
    const link = String(value || '').trim();
    if (!link) return '';
    if (/^(https?:|mailto:|tel:|file:)/i.test(link)) return link;
    if (/^[A-Za-z]:[\\/]/.test(link)) return 'file:///' + link.replace(/\\/g, '/');
    if (/^\\\\/.test(link)) return 'file:' + link.replace(/\\/g, '/');
    if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:[/:?#]|$)/.test(link) && !link.includes(' ')) {
      return 'https://' + link;
    }
    return link.replace(/\\/g, '/');
  }

  document.addEventListener('DOMContentLoaded', startFooterClock);

  window.PlaytrixCommon = {
    formatFooterDateTime: formatFooterDateTime,
    updateFooterDateTime: updateFooterDateTime,
    startFooterClock: startFooterClock,
    normaliseActionLink: normaliseActionLink
  };
})();

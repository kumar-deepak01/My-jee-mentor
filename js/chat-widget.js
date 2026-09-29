(() => {
  if (document.getElementById('jma-chat-widget')) return;

  const FALLBACK = 'Kuch problem aa gayi! 🙏';
  const STORAGE_KEY = 'my-jee-mentor-priya-chat-v1';
  const WHATSAPP_URL = 'https://wa.me/917304256203?text=Hi%20My%20JEE%20Mentor!%20I%27m%20interested%20in%20your%20JEE%20coaching.%20Please%20share%20details.';
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/js/chat-widget.css';
  style.dataset.jmaChatStyle = 'true';
  document.head.append(style);

  const widget = document.createElement('div');
  widget.id = 'jma-chat-widget';
  widget.innerHTML = `
    <button class="jma-launcher" type="button" aria-label="Poochho, main Priya!" aria-haspopup="dialog" aria-expanded="false" aria-controls="jma-chat-panel">
      <span class="jma-launcher-tip">Poochho, main Priya!</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.4-.8L4 20l1.4-4.2a7.5 7.5 0 1 1 14.6-4.3Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>
    </button>
    <section class="jma-panel" id="jma-chat-panel" role="dialog" aria-modal="false" aria-labelledby="jma-chat-title" aria-describedby="jma-chat-status" hidden>
      <header class="jma-header">
        <div class="jma-avatar" aria-hidden="true">👩🏻‍🏫</div>
        <div class="jma-header-copy"><h2 id="jma-chat-title">Priya — JEE Mentor AI</h2><p id="jma-chat-status"><span></span>Online — Abhi jawab dungi!</p></div>
        <button class="jma-new-chat" type="button" aria-label="New chat" title="New chat">↻</button>
        <button class="jma-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="jma-messages" aria-live="polite" aria-relevant="additions text"></div>
      <div class="jma-quick-replies" aria-label="Suggested questions"></div>
      <form class="jma-composer">
        <label class="jma-sr-only" for="jma-chat-input">Type your message</label>
        <textarea id="jma-chat-input" rows="1" maxlength="500" placeholder="Apna sawaal likhiye…"></textarea>
        <button class="jma-send" type="submit" aria-label="Send message" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14"/></svg></button>
      </form>
      <div class="jma-footnote">My JEE Mentor · AI answers site information only</div>
    </section>`;
  document.body.append(widget);

  const launcher = widget.querySelector('.jma-launcher');
  const panel = widget.querySelector('.jma-panel');
  const closeButton = widget.querySelector('.jma-close');
  const newChatButton = widget.querySelector('.jma-new-chat');
  const messagesElement = widget.querySelector('.jma-messages');
  const quickReplies = widget.querySelector('.jma-quick-replies');
  const form = widget.querySelector('.jma-composer');
  const input = widget.querySelector('#jma-chat-input');
  const sendButton = widget.querySelector('.jma-send');
  let isLoading = false;
  let closeTimer;

  function readHistory() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(stored)
        ? stored.filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string')
          .slice(-30).map(item => ({role: item.role, text: item.text.slice(0, 2_000), type: item.type || '', time: item.time || Date.now()}))
        : [];
    } catch {
      return [];
    }
  }

  let messages = readHistory();

  function saveHistory() {
    messages = messages.slice(-30);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
  }

  function inlineMarkdown(value) {
    let safe = escapeHTML(value);
    safe = safe.replace(/\[([^\]]{1,120})\]\((https?:\/\/[^\s)<>]{1,800})\)/g, (match, label, href) => {
      try {
        const parsed = new URL(href.replace(/&amp;/g, '&'));
        if (!['https:', 'http:'].includes(parsed.protocol)) return label;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      } catch { return label; }
    });
    return safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function formatMarkdown(value) {
    const lines = String(value).split(/\r?\n/);
    const output = [];
    let inList = false;
    for (const line of lines) {
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) {
        if (!inList) output.push('<ul>');
        inList = true;
        output.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      } else {
        if (inList) { output.push('</ul>'); inList = false; }
        if (line.trim()) output.push(`<p>${inlineMarkdown(line)}</p>`);
      }
    }
    if (inList) output.push('</ul>');
    return output.join('');
  }

  function addTimestamp(parent, time) {
    const timestamp = document.createElement('time');
    const date = new Date(time);
    timestamp.className = 'jma-time';
    timestamp.textContent = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'}).format(date);
    parent.append(timestamp);
  }

  function addMessage(message, index) {
    const row = document.createElement('article');
    row.className = `jma-message ${message.role === 'user' ? 'jma-user-message' : 'jma-bot-message'}`;
    row.dataset.messageIndex = String(index);
    if (message.role === 'assistant') {
      const avatar = document.createElement('span');
      avatar.className = 'jma-message-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = '👩🏻‍🏫';
      row.append(avatar);
    }
    const body = document.createElement('div');
    body.className = 'jma-message-body';
    const bubble = document.createElement('div');
    bubble.className = 'jma-bubble';
    const text = document.createElement('div');
    text.className = 'jma-message-text';
    if (message.role === 'assistant' && message.type !== 'streaming') text.innerHTML = formatMarkdown(message.text);
    else text.textContent = message.text;
    bubble.append(text);
    body.append(bubble);
    addTimestamp(body, message.time);
    if (message.role === 'assistant' && message.type === 'whatsapp') {
      const card = document.createElement('div');
      card.className = 'jma-whatsapp-card';
      const copy = document.createElement('p');
      copy.textContent = '📱 WhatsApp pe connect karo! Hamare counsellor se directly baat karo — demo schedule karo, fees poochho, ya koi bhi doubt clear karo!';
      const link = document.createElement('a');
      link.href = WHATSAPP_URL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'WhatsApp pe Message Karo';
      card.append(copy, link);
      body.append(card);
    } else if (message.role === 'assistant' && message.type !== 'error' && /\bwhats?app\b|wa\.me/i.test(message.text)) {
      const card = document.createElement('div');
      card.className = 'jma-whatsapp-card jma-whatsapp-inline';
      const copy = document.createElement('p');
      copy.textContent = '📱 Counsellor se WhatsApp par directly baat karein.';
      const link = document.createElement('a');
      link.href = WHATSAPP_URL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'WhatsApp pe Message Karo';
      card.append(copy, link);
      body.append(card);
    }
    row.append(body);
    messagesElement.append(row);
    return row;
  }

  function addWelcome() {
    const welcome = document.createElement('article');
    welcome.className = 'jma-message jma-bot-message jma-welcome';
    const avatar = document.createElement('span');
    avatar.className = 'jma-message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = '👩🏻‍🏫';
    const body = document.createElement('div');
    body.className = 'jma-message-body';
    const bubble = document.createElement('div');
    bubble.className = 'jma-bubble';
    bubble.innerHTML = '<div class="jma-message-text">Namaste! 🎯 Main hoon Priya — My JEE Mentor ki AI assistant. Main aapki help kar sakti hoon:</div>';
    body.append(bubble);
    addTimestamp(body, Date.now());
    welcome.append(avatar, body);
    messagesElement.append(welcome);
  }

  function makeChips(items) {
    quickReplies.replaceChildren();
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jma-chip';
      button.textContent = item.label;
      button.addEventListener('click', () => item.whatsapp ? showWhatsApp(item.label) : sendMessage(item.label));
      quickReplies.append(button);
    }
  }

  const welcomeChips = [
    {label: '💰 Fees kya hai?'},
    {label: '👨‍🏫 Teacher kaun hain?'},
    {label: '🎓 Demo class chahiye'},
    {label: '📚 Subjects kaunse hain?'},
    {label: '💬 WhatsApp pe baat karo', whatsapp: true}
  ];
  const followupChips = [
    {label: '💰 Fees details'},
    {label: '📚 Subjects info'},
    {label: '👨‍🏫 Faculty info'}
  ];
  const errorChips = [
    {label: '💰 Fees?'},
    {label: '🎓 Free demo'},
    {label: '📞 Contact', whatsapp: true}
  ];

  function renderConversation() {
    messagesElement.replaceChildren();
    if (!messages.length) {
      addWelcome();
      makeChips(welcomeChips);
    } else {
      messages.forEach((message, index) => addMessage(message, index));
      const last = messages.at(-1);
      if (last?.role === 'assistant') makeChips(last.type === 'error' || last.text === FALLBACK ? errorChips : followupChips);
      else makeChips([]);
    }
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }

  function updateSendButton() {
    sendButton.disabled = isLoading || !input.value.trim();
    input.disabled = isLoading;
  }

  function setTyping(visible) {
    widget.querySelector('.jma-typing')?.remove();
    if (!visible) return;
    const typing = document.createElement('div');
    typing.className = 'jma-typing';
    typing.setAttribute('role', 'status');
    typing.setAttribute('aria-label', 'Priya is typing');
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesElement.append(typing);
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }

  function addUserMessage(text) {
    messages.push({role: 'user', text, time: Date.now()});
    saveHistory();
    renderConversation();
  }

  function showWhatsApp(label) {
    if (isLoading) return;
    addUserMessage(label);
    messages.push({
      role: 'assistant',
      text: '📱 WhatsApp pe connect karo! Hamare counsellor se directly baat karo — demo schedule karo, fees poochho, ya koi bhi doubt clear karo!',
      type: 'whatsapp',
      time: Date.now()
    });
    saveHistory();
    renderConversation();
  }

  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function animateReply(reply) {
    const type = reply === FALLBACK ? 'error' : 'normal';
    const message = {role: 'assistant', text: '', type: 'streaming', time: Date.now()};
    messages.push(message);
    const row = addMessage(message, messages.length - 1);
    const textElement = row.querySelector('.jma-message-text');
    const step = Math.max(1, Math.ceil(reply.length / 70));
    for (let index = 0; index < reply.length; index += step) {
      message.text = reply.slice(0, index + step);
      textElement.textContent = message.text;
      messagesElement.scrollTop = messagesElement.scrollHeight;
      await wait(12);
    }
    message.text = reply;
    message.type = type;
    saveHistory();
    renderConversation();
  }

  async function sendMessage(rawText) {
    if (isLoading) return;
    const text = String(rawText || '').trim().slice(0, 500);
    if (!text) return;
    addUserMessage(text);
    isLoading = true;
    updateSendButton();
    setTyping(true);
    try {
      const history = messages.slice(0, -1).slice(-9).map(({role, text: content}) => ({role, content: content.slice(0, 500)}));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({message: text, history})
      });
      const result = await response.json().catch(() => ({}));
      const reply = typeof result.reply === 'string' && result.reply.trim() ? result.reply.trim() : FALLBACK;
      setTyping(false);
      await animateReply(reply);
    } catch {
      setTyping(false);
      await animateReply(FALLBACK);
    } finally {
      isLoading = false;
      updateSendButton();
      input.focus();
    }
  }

  function openChat() {
    clearTimeout(closeTimer);
    panel.hidden = false;
    requestAnimationFrame(() => { panel.dataset.open = 'true'; });
    launcher.setAttribute('aria-expanded', 'true');
    renderConversation();
    input.focus();
  }

  function closeChat() {
    launcher.setAttribute('aria-expanded', 'false');
    panel.dataset.open = 'false';
    closeTimer = setTimeout(() => { panel.hidden = true; }, 190);
    launcher.focus();
  }

  launcher.addEventListener('click', () => panel.hidden ? openChat() : closeChat());
  closeButton.addEventListener('click', closeChat);
  newChatButton.addEventListener('click', () => {
    messages = [];
    saveHistory();
    renderConversation();
    input.focus();
  });
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeChat(); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value;
    input.value = '';
    input.style.height = 'auto';
    updateSendButton();
    sendMessage(text);
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 96)}px`;
    updateSendButton();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!sendButton.disabled) form.requestSubmit();
    }
  });
  renderConversation();
})();

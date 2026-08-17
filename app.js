const BANKS_URL = 'https://api.vietqr.io/v2/banks';
const QR_BASE = 'https://img.vietqr.io/image';
const CACHE_KEY = 'qr-banking-studio-banks-v1';
const DRAFT_KEY = 'qr-banking-studio-draft-v2';
const HISTORY_KEY = 'qr-banking-studio-history-v2';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const HISTORY_LIMIT = 6;

const fallbackBanks = [
  { shortName: 'Vietcombank', code: 'VCB', bin: '970436', logo: 'https://api.vietqr.io/img/VCB.png', name: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
  { shortName: 'BIDV', code: 'BIDV', bin: '970418', logo: 'https://api.vietqr.io/img/BIDV.png', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { shortName: 'VietinBank', code: 'ICB', bin: '970415', logo: 'https://api.vietqr.io/img/ICB.png', name: 'Ngân hàng TMCP Công thương Việt Nam' },
  { shortName: 'Agribank', code: 'VBA', bin: '970405', logo: 'https://api.vietqr.io/img/VBA.png', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
  { shortName: 'MB', code: 'MB', bin: '970422', logo: 'https://api.vietqr.io/img/MB.png', name: 'Ngân hàng TMCP Quân đội' },
  { shortName: 'Techcombank', code: 'TCB', bin: '970407', logo: 'https://api.vietqr.io/img/TCB.png', name: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
  { shortName: 'ACB', code: 'ACB', bin: '970416', logo: 'https://api.vietqr.io/img/ACB.png', name: 'Ngân hàng TMCP Á Châu' },
  { shortName: 'VPBank', code: 'VPB', bin: '970432', logo: 'https://api.vietqr.io/img/VPB.png', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' }
];

const $ = (id) => document.getElementById(id);
const els = {
  form: $('qrForm'), bank: $('bank'), bankLogo: $('bankLogo'), bankHint: $('bankHint'), accountNo: $('accountNo'),
  accountName: $('accountName'), amount: $('amount'), addInfo: $('addInfo'), template: $('template'), format: $('format'),
  amountPreview: $('amountPreview'), messageCount: $('messageCount'), formError: $('formError'), resetBtn: $('resetBtn'),
  qrImage: $('qrImage'), qrPlaceholder: $('qrPlaceholder'), readyBadge: $('readyBadge'), summaryBank: $('summaryBank'),
  summaryAccount: $('summaryAccount'), summaryAmount: $('summaryAmount'), copyBtn: $('copyBtn'), openBtn: $('openBtn'),
  shareBtn: $('shareBtn'), downloadBtn: $('downloadBtn'), toast: $('toast'), livePreview: $('livePreview'),
  saveDraftBtn: $('saveDraftBtn'), historyBtn: $('historyBtn'), historyDialog: $('historyDialog'), historyList: $('historyList'),
  closeHistoryBtn: $('closeHistoryBtn'), clearHistoryBtn: $('clearHistoryBtn'), cardCanvas: $('cardCanvas'), canvasTitle: $('canvasTitle'),
  canvasNote: $('canvasNote'), canvasBankBadge: $('canvasBankBadge'), cardTitle: $('cardTitle'), cardNote: $('cardNote'),
  qrSize: $('qrSize'), qrSizeValue: $('qrSizeValue')
};

let banks = [];
let currentQrUrl = '';
let currentTheme = 'midnight';
let previewTimer = 0;
let lastHistorySignature = '';

function cleanAccount(value) { return String(value || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 19); }
function cleanAmount(value) { return String(value || '').replace(/\D/g, '').slice(0, 13); }
function normalizeText(value, maxLength) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
function money(value) { return value ? new Intl.NumberFormat('vi-VN').format(Number(value)) : ''; }
function selectedBank() { return banks.find((item) => String(item.bin) === els.bank.value) || null; }
function bankLabel(bank) { return bank ? (bank.shortName || bank.code || bank.name || String(bank.bin)) : '—'; }
function safeJsonParse(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }

function readBankCache() {
  const cached = safeJsonParse(localStorage.getItem(CACHE_KEY) || 'null', null);
  if (!cached || !Array.isArray(cached.data) || Date.now() - cached.savedAt > CACHE_TTL) return null;
  return cached.data;
}
function writeBankCache(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data })); } catch {} }

async function loadBanks() {
  const cached = readBankCache();
  if (cached) { banks = cached; renderBanks('Danh sách ngân hàng lấy từ bộ nhớ đệm 24 giờ.'); return; }
  try {
    const response = await fetch(BANKS_URL, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.data)) throw new Error('Dữ liệu ngân hàng không hợp lệ');
    banks = payload.data.filter((item) => item.transferSupported !== 0);
    writeBankCache(banks);
    renderBanks('Danh sách ngân hàng được cập nhật từ VietQR.');
  } catch (error) {
    console.warn('Không tải được danh sách ngân hàng từ VietQR:', error);
    banks = fallbackBanks;
    renderBanks('Đang dùng danh sách ngân hàng phổ biến dự phòng.');
  }
}

function renderBanks(hint) {
  const sorted = [...banks].sort((a,b) => (a.shortName || a.name).localeCompare(b.shortName || b.name, 'vi'));
  els.bank.innerHTML = '<option value="">Chọn ngân hàng</option>' + sorted.map((bank) => `<option value="${bank.bin}">${bankLabel(bank)} · ${bank.bin}</option>`).join('');
  els.bankHint.textContent = hint;
}

function validate() {
  const bank = selectedBank();
  const accountNo = cleanAccount(els.accountNo.value);
  const amount = cleanAmount(els.amount.value);
  if (!bank) return 'Hãy chọn ngân hàng nhận tiền.';
  if (accountNo.length < 6) return 'Số tài khoản cần ít nhất 6 ký tự.';
  if (amount && (Number(amount) <= 0 || amount.length > 13)) return 'Số tiền phải là số dương, tối đa 13 chữ số.';
  return '';
}

function buildQrUrl() {
  const bank = selectedBank();
  const accountNo = cleanAccount(els.accountNo.value);
  if (!bank || accountNo.length < 6) return '';
  const params = new URLSearchParams();
  const amount = cleanAmount(els.amount.value);
  const addInfo = normalizeText(els.addInfo.value, 50);
  const accountName = normalizeText(els.accountName.value, 50);
  if (amount) params.set('amount', amount);
  if (addInfo) params.set('addInfo', addInfo);
  if (accountName) params.set('accountName', accountName);
  const url = `${QR_BASE}/${encodeURIComponent(bank.bin)}-${encodeURIComponent(accountNo)}-${encodeURIComponent(els.template.value)}.${els.format.value}`;
  return params.toString() ? `${url}?${params}` : url;
}

function getStudioState() {
  return {
    bank: els.bank.value, accountNo: cleanAccount(els.accountNo.value), accountName: els.accountName.value.trim(),
    amount: cleanAmount(els.amount.value), addInfo: els.addInfo.value.trim(), template: els.template.value, format: els.format.value,
    cardTitle: els.cardTitle.value.trim(), cardNote: els.cardNote.value.trim(), qrSize: Number(els.qrSize.value), theme: currentTheme,
    livePreview: els.livePreview.checked
  };
}

function applyStudioState(state, { generate = true } = {}) {
  if (!state) return;
  const set = (el, value) => { if (value !== undefined && value !== null) el.value = value; };
  set(els.bank, state.bank); set(els.accountNo, state.accountNo); set(els.accountName, state.accountName); set(els.amount, state.amount);
  set(els.addInfo, state.addInfo); set(els.template, state.template); set(els.format, state.format); set(els.cardTitle, state.cardTitle);
  set(els.cardNote, state.cardNote); set(els.qrSize, state.qrSize || 320);
  if (typeof state.livePreview === 'boolean') els.livePreview.checked = state.livePreview;
  setTheme(state.theme || 'midnight'); refreshInputs();
  if (generate) schedulePreview(true);
}

function saveDraft(silent = false) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(getStudioState())); if (!silent) toast('Đã lưu cấu hình Studio trên máy này'); }
  catch { if (!silent) toast('Trình duyệt không cho phép lưu cấu hình'); }
}
function restoreDraft() {
  const state = safeJsonParse(localStorage.getItem(DRAFT_KEY) || 'null', null);
  if (state) applyStudioState(state, { generate: false });
}

function readHistory() {
  const list = safeJsonParse(localStorage.getItem(HISTORY_KEY) || '[]', []);
  return Array.isArray(list) ? list : [];
}
function writeHistory(list) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT))); } catch {} }
function addHistory() {
  const state = getStudioState();
  const bank = selectedBank();
  if (!bank || state.accountNo.length < 6 || !currentQrUrl) return;
  const signature = `${state.bank}|${state.accountNo}|${state.amount}|${state.addInfo}|${state.template}`;
  if (signature === lastHistorySignature) return;
  lastHistorySignature = signature;
  const item = { ...state, bankName: bankLabel(bank), qrUrl: currentQrUrl, createdAt: Date.now() };
  const next = [item, ...readHistory().filter((x) => `${x.bank}|${x.accountNo}|${x.amount}|${x.addInfo}|${x.template}` !== signature)];
  writeHistory(next);
}

function renderHistory() {
  const list = readHistory();
  if (!list.length) { els.historyList.innerHTML = '<div class="history-empty">Chưa có QR nào trong lịch sử cục bộ.</div>'; return; }
  els.historyList.innerHTML = list.map((item, index) => {
    const amount = item.amount ? `${money(item.amount)} ₫` : 'Không cố định số tiền';
    const when = new Intl.DateTimeFormat('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }).format(new Date(item.createdAt));
    return `<button class="history-item" type="button" data-history-index="${index}"><div><strong>${item.bankName || item.bank || 'Ngân hàng'} · ${item.accountNo}</strong><span>${amount}${item.addInfo ? ` · ${escapeHtml(item.addInfo)}` : ''}</span></div><time>${when}</time></button>`;
  }).join('');
}
function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function setTheme(theme) {
  currentTheme = ['midnight','mint','paper','sunset'].includes(theme) ? theme : 'midnight';
  els.cardCanvas.className = `card-canvas theme-${currentTheme}`;
  document.querySelectorAll('.theme-option').forEach((btn) => btn.classList.toggle('active', btn.dataset.theme === currentTheme));
}

function refreshSummary() {
  const bank = selectedBank();
  const accountNo = cleanAccount(els.accountNo.value);
  const amount = cleanAmount(els.amount.value);
  els.summaryBank.textContent = bankLabel(bank);
  els.summaryAccount.textContent = accountNo || '—';
  els.summaryAmount.textContent = amount ? `${money(amount)} ₫` : 'Tùy chọn';
  els.canvasBankBadge.textContent = bank ? bankLabel(bank).toUpperCase() : 'VIETQR';
  if (bank?.logo) { els.bankLogo.src = bank.logo; els.bankLogo.alt = `Logo ${bankLabel(bank)}`; els.bankLogo.hidden = false; }
  else els.bankLogo.hidden = true;
}

function refreshStudioCanvas() {
  els.canvasTitle.textContent = els.cardTitle.value.trim() || 'Quét mã để chuyển khoản';
  els.canvasNote.textContent = els.cardNote.value.trim() || 'Tạo bởi QR Banking Studio';
  const size = Math.max(240, Math.min(420, Number(els.qrSize.value) || 320));
  els.qrSizeValue.textContent = `${size}px`;
  els.cardCanvas.style.setProperty('--qr-size', `${size}px`);
}

function refreshInputs() {
  const cleanedAccount = cleanAccount(els.accountNo.value); if (els.accountNo.value !== cleanedAccount) els.accountNo.value = cleanedAccount;
  const cleanedAmount = cleanAmount(els.amount.value); if (els.amount.value !== cleanedAmount) els.amount.value = cleanedAmount;
  els.amountPreview.textContent = cleanedAmount ? `${money(cleanedAmount)} đồng` : 'Có thể bỏ trống để người chuyển tự nhập.';
  els.messageCount.textContent = els.addInfo.value.length;
  refreshSummary(); refreshStudioCanvas();
}

function setActionsEnabled(enabled) {
  [els.copyBtn, els.openBtn, els.shareBtn, els.downloadBtn].forEach((button) => { button.disabled = !enabled; });
}

function showQr(url) {
  if (!url) return clearQr();
  if (url === currentQrUrl && !els.qrImage.hidden) return;
  currentQrUrl = url;
  els.readyBadge.textContent = 'Đang tải'; els.readyBadge.classList.remove('is-ready'); setActionsEnabled(false);
  els.qrImage.onload = () => {
    els.qrPlaceholder.hidden = true; els.qrImage.hidden = false; els.readyBadge.textContent = 'Sẵn sàng quét';
    els.readyBadge.classList.add('is-ready'); setActionsEnabled(true); addHistory(); saveDraft(true);
  };
  els.qrImage.onerror = () => {
    els.formError.textContent = 'Không tải được ảnh QR. Kiểm tra kết nối hoặc thử lại sau.'; els.formError.hidden = false; clearQr(false);
  };
  els.qrImage.src = url;
}

function clearQr(clearUrl = true) {
  if (clearUrl) currentQrUrl = '';
  els.qrImage.hidden = true; els.qrImage.removeAttribute('src'); els.qrPlaceholder.hidden = false;
  els.readyBadge.textContent = 'Chờ dữ liệu'; els.readyBadge.classList.remove('is-ready'); setActionsEnabled(false);
}

function generateQr({ showErrors = false } = {}) {
  refreshInputs();
  const error = validate();
  if (error) {
    if (showErrors) { els.formError.textContent = error; els.formError.hidden = false; }
    else els.formError.hidden = true;
    clearQr(); return false;
  }
  els.formError.hidden = true; showQr(buildQrUrl()); return true;
}

function schedulePreview(force = false) {
  window.clearTimeout(previewTimer);
  if (!force && !els.livePreview.checked) return;
  previewTimer = window.setTimeout(() => generateQr({ showErrors: false }), force ? 0 : 380);
}

function toast(message) {
  els.toast.textContent = message; els.toast.classList.add('show'); window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => els.toast.classList.remove('show'), 1900);
}

function themeExportColors() {
  return {
    midnight: { bg:'#0a0e18', surface:'#101727', text:'#f8fbff', muted:'#8390a7', accent:'#7cf6c7', line:'#253047' },
    mint: { bg:'#dffaf0', surface:'#f6fffb', text:'#12362a', muted:'#5f7e72', accent:'#177a5b', line:'#b7ddd0' },
    paper: { bg:'#f5f4ef', surface:'#ffffff', text:'#161719', muted:'#777a7d', accent:'#111111', line:'#d8d7d0' },
    sunset: { bg:'#25132f', surface:'#351a3d', text:'#fff8fa', muted:'#c4a9c7', accent:'#ff9b78', line:'#503158' }
  }[currentTheme];
}

async function loadImageFromUrl(url) {
  const response = await fetch(url, { mode:'cors' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = objectUrl; });
  } finally { URL.revokeObjectURL(objectUrl); }
}

function roundRect(ctx,x,y,w,h,r) {
  const rr = Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath();
}
function fitText(ctx, text, maxWidth, startSize, minSize = 18, weight = 700) {
  let size = startSize; while (size > minSize) { ctx.font = `${weight} ${size}px Inter, Arial, sans-serif`; if (ctx.measureText(text).width <= maxWidth) break; size -= 2; } return size;
}

async function exportPoster() {
  if (!currentQrUrl) return;
  els.downloadBtn.disabled = true; els.downloadBtn.textContent = 'Đang xuất…';
  try {
    const qr = await loadImageFromUrl(currentQrUrl);
    const state = getStudioState(); const bank = selectedBank(); const colors = themeExportColors();
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440; const ctx = canvas.getContext('2d');
    ctx.fillStyle = colors.bg; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = colors.accent; ctx.font = '800 22px Arial, sans-serif'; ctx.fillText('QR BANKING STUDIO', 76, 96);
    const title = state.cardTitle || 'Quét mã để chuyển khoản'; fitText(ctx,title,800,54,32,800); ctx.fillStyle = colors.text; ctx.fillText(title,76,160);
    ctx.textAlign='right'; ctx.font='700 20px Arial, sans-serif'; ctx.fillStyle=colors.muted; ctx.fillText(bankLabel(bank).toUpperCase(),1004,96); ctx.textAlign='left';

    ctx.fillStyle=colors.surface; roundRect(ctx,76,220,928,800,34); ctx.fill();
    const maxQr=760; const scale=Math.min(maxQr/qr.width,maxQr/qr.height); const qw=qr.width*scale, qh=qr.height*scale; const qx=(1080-qw)/2, qy=240+(760-qh)/2;
    ctx.fillStyle='#fff'; roundRect(ctx,qx-18,qy-18,qw+36,qh+36,24); ctx.fill(); ctx.drawImage(qr,qx,qy,qw,qh);

    const cells=[['NGÂN HÀNG',bankLabel(bank)],['TÀI KHOẢN',state.accountNo],['SỐ TIỀN',state.amount?`${money(state.amount)} ₫`:'Tùy chọn']];
    const y=1066,w=292,gap=26; cells.forEach((cell,i)=>{ const x=76+i*(w+gap); ctx.strokeStyle=colors.line; ctx.lineWidth=2; roundRect(ctx,x,y,w,130,22); ctx.stroke(); ctx.fillStyle=colors.muted; ctx.font='700 16px Arial, sans-serif'; ctx.fillText(cell[0],x+22,y+40); fitText(ctx,cell[1]||'—',w-44,26,18,800); ctx.fillStyle=colors.text; ctx.fillText(cell[1]||'—',x+22,y+84); });
    const note=state.cardNote || 'Tạo bởi QR Banking Studio'; ctx.fillStyle=colors.muted; ctx.font='500 20px Arial, sans-serif'; ctx.textAlign='center'; ctx.fillText(note,540,1270); ctx.font='500 15px Arial, sans-serif'; ctx.fillText('VietQR payment card · Generated locally in your browser',540,1320); ctx.textAlign='left';

    const blob = await new Promise((resolve) => canvas.toBlob(resolve,'image/png',1));
    if (!blob) throw new Error('Không tạo được ảnh');
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`vietqr-${bank?.code || bank?.bin || 'bank'}-${state.accountNo}.png`; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast('Đã xuất poster PNG');
  } catch (error) {
    console.warn('Không xuất được poster:',error); toast('Không xuất được poster, hãy dùng “Mở QR gốc”');
  } finally { els.downloadBtn.disabled = !currentQrUrl; els.downloadBtn.textContent='Xuất poster PNG'; }
}

els.form.addEventListener('submit', (event) => { event.preventDefault(); generateQr({ showErrors:true }); });

['bank','accountNo','accountName','amount','addInfo','template','format','cardTitle','cardNote','qrSize'].forEach((id) => {
  $(id).addEventListener('input', () => { refreshInputs(); schedulePreview(); });
  $(id).addEventListener('change', () => { refreshInputs(); schedulePreview(); });
});

els.livePreview.addEventListener('change', () => { saveDraft(true); if (els.livePreview.checked) schedulePreview(true); });

document.querySelectorAll('.amount-presets button').forEach((button) => button.addEventListener('click', () => {
  els.amount.value = button.dataset.amount || ''; refreshInputs(); schedulePreview();
}));
document.querySelectorAll('.theme-option').forEach((button) => button.addEventListener('click', () => { setTheme(button.dataset.theme); refreshStudioCanvas(); saveDraft(true); }));

els.copyBtn.addEventListener('click', async () => {
  if (!currentQrUrl) return; try { await navigator.clipboard.writeText(currentQrUrl); toast('Đã copy link QR'); } catch { window.prompt('Copy link QR:',currentQrUrl); }
});
els.openBtn.addEventListener('click', () => { if (currentQrUrl) window.open(currentQrUrl,'_blank','noopener,noreferrer'); });
els.shareBtn.addEventListener('click', async () => {
  if (!currentQrUrl) return;
  const state=getStudioState(); const shareData={ title:'QR Banking Studio', text:`${bankLabel(selectedBank())} · ${state.accountNo}${state.amount?` · ${money(state.amount)} ₫`:''}`, url:currentQrUrl };
  try { if (navigator.share) await navigator.share(shareData); else { await navigator.clipboard.writeText(currentQrUrl); toast('Thiết bị không hỗ trợ Share, đã copy link'); } } catch (error) { if (error?.name !== 'AbortError') toast('Không thể chia sẻ lúc này'); }
});
els.downloadBtn.addEventListener('click', exportPoster);
els.saveDraftBtn.addEventListener('click', () => saveDraft(false));

els.resetBtn.addEventListener('click', () => {
  els.form.reset(); els.livePreview.checked=true; setTheme('midnight'); els.bankLogo.hidden=true; els.formError.hidden=true; clearQr(); refreshInputs();
  try { localStorage.removeItem(DRAFT_KEY); } catch {} toast('Đã đặt lại Studio');
});

els.historyBtn.addEventListener('click', () => { renderHistory(); els.historyDialog.showModal(); });
els.closeHistoryBtn.addEventListener('click', () => els.historyDialog.close());
els.clearHistoryBtn.addEventListener('click', () => { writeHistory([]); lastHistorySignature=''; renderHistory(); toast('Đã xóa lịch sử cục bộ'); });
els.historyList.addEventListener('click', (event) => {
  const item = event.target.closest('[data-history-index]'); if (!item) return;
  const state=readHistory()[Number(item.dataset.historyIndex)]; if (!state) return; els.historyDialog.close(); applyStudioState(state,{generate:true}); toast('Đã khôi phục QR từ lịch sử');
});
els.historyDialog.addEventListener('click', (event) => { if (event.target === els.historyDialog) els.historyDialog.close(); });

loadBanks().then(() => { restoreDraft(); refreshInputs(); schedulePreview(true); });

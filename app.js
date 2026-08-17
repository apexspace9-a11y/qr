const BANKS_URL = 'https://api.vietqr.io/v2/banks';
const QR_BASE = 'https://img.vietqr.io/image';
const CACHE_KEY = 'qr-banking-studio-banks-v1';
const CACHE_TTL = 24 * 60 * 60 * 1000;

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
  form: $('qrForm'), bank: $('bank'), bankLogo: $('bankLogo'), bankHint: $('bankHint'),
  accountNo: $('accountNo'), accountName: $('accountName'), amount: $('amount'), addInfo: $('addInfo'),
  template: $('template'), format: $('format'), amountPreview: $('amountPreview'), messageCount: $('messageCount'),
  formError: $('formError'), resetBtn: $('resetBtn'), qrImage: $('qrImage'), qrPlaceholder: $('qrPlaceholder'),
  readyBadge: $('readyBadge'), summaryBank: $('summaryBank'), summaryAccount: $('summaryAccount'),
  summaryAmount: $('summaryAmount'), copyBtn: $('copyBtn'), openBtn: $('openBtn'), toast: $('toast')
};

let banks = [];
let currentQrUrl = '';

function cleanAccount(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 19);
}

function cleanAmount(value) {
  return value.replace(/\D/g, '').slice(0, 13);
}

function normalizeText(value, maxLength) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function money(value) {
  if (!value) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(value));
}

function selectedBank() {
  return banks.find((item) => String(item.bin) === els.bank.value) || null;
}

function readBankCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!cached || !Array.isArray(cached.data) || Date.now() - cached.savedAt > CACHE_TTL) return null;
    return cached.data;
  } catch {
    return null;
  }
}

function writeBankCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data })); } catch {}
}

async function loadBanks() {
  const cached = readBankCache();
  if (cached) {
    banks = cached;
    renderBanks('Danh sách ngân hàng lấy từ bộ nhớ đệm 24 giờ.');
    return;
  }

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
  const sorted = [...banks].sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name, 'vi'));
  els.bank.innerHTML = '<option value="">Chọn ngân hàng</option>' + sorted.map((bank) => {
    const name = bank.shortName || bank.code || bank.name;
    return `<option value="${bank.bin}">${name} · ${bank.bin}</option>`;
  }).join('');
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

  const template = els.template.value;
  const format = els.format.value;
  const url = `${QR_BASE}/${encodeURIComponent(bank.bin)}-${encodeURIComponent(accountNo)}-${encodeURIComponent(template)}.${format}`;
  return params.toString() ? `${url}?${params.toString()}` : url;
}

function refreshSummary() {
  const bank = selectedBank();
  const accountNo = cleanAccount(els.accountNo.value);
  const amount = cleanAmount(els.amount.value);

  els.summaryBank.textContent = bank ? (bank.shortName || bank.code || bank.name) : '—';
  els.summaryAccount.textContent = accountNo || '—';
  els.summaryAmount.textContent = amount ? `${money(amount)} ₫` : 'Tùy chọn';

  if (bank?.logo) {
    els.bankLogo.src = bank.logo;
    els.bankLogo.alt = `Logo ${bank.shortName || bank.code || 'ngân hàng'}`;
    els.bankLogo.hidden = false;
  } else {
    els.bankLogo.hidden = true;
  }
}

function refreshInputs() {
  const cleanedAccount = cleanAccount(els.accountNo.value);
  if (els.accountNo.value !== cleanedAccount) els.accountNo.value = cleanedAccount;

  const cleanedAmount = cleanAmount(els.amount.value);
  if (els.amount.value !== cleanedAmount) els.amount.value = cleanedAmount;

  els.amountPreview.textContent = cleanedAmount ? `${money(cleanedAmount)} đồng` : 'Có thể bỏ trống để người chuyển tự nhập.';
  els.messageCount.textContent = els.addInfo.value.length;
  refreshSummary();
}

function showQr(url) {
  currentQrUrl = url;
  els.qrImage.onload = () => {
    els.qrPlaceholder.hidden = true;
    els.qrImage.hidden = false;
    els.readyBadge.textContent = 'Sẵn sàng quét';
    els.readyBadge.classList.add('is-ready');
    els.copyBtn.disabled = false;
    els.openBtn.disabled = false;
  };
  els.qrImage.onerror = () => {
    els.formError.textContent = 'Không tải được ảnh QR. Kiểm tra kết nối hoặc thử lại sau.';
    els.formError.hidden = false;
    clearQr(false);
  };
  els.qrImage.src = url;
}

function clearQr(clearUrl = true) {
  if (clearUrl) currentQrUrl = '';
  els.qrImage.hidden = true;
  els.qrImage.removeAttribute('src');
  els.qrPlaceholder.hidden = false;
  els.readyBadge.textContent = 'Chờ dữ liệu';
  els.readyBadge.classList.remove('is-ready');
  els.copyBtn.disabled = true;
  els.openBtn.disabled = true;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => els.toast.classList.remove('show'), 1800);
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  refreshInputs();
  const error = validate();
  if (error) {
    els.formError.textContent = error;
    els.formError.hidden = false;
    clearQr();
    return;
  }
  els.formError.hidden = true;
  const url = buildQrUrl();
  showQr(url);
});

['bank', 'accountNo', 'accountName', 'amount', 'addInfo', 'template', 'format'].forEach((id) => {
  $(id).addEventListener('input', refreshInputs);
  $(id).addEventListener('change', refreshInputs);
});

els.copyBtn.addEventListener('click', async () => {
  if (!currentQrUrl) return;
  try {
    await navigator.clipboard.writeText(currentQrUrl);
    toast('Đã copy link QR');
  } catch {
    window.prompt('Copy link QR:', currentQrUrl);
  }
});

els.openBtn.addEventListener('click', () => {
  if (currentQrUrl) window.open(currentQrUrl, '_blank', 'noopener,noreferrer');
});

els.resetBtn.addEventListener('click', () => {
  els.form.reset();
  els.bankLogo.hidden = true;
  els.formError.hidden = true;
  clearQr();
  refreshInputs();
  toast('Đã đặt lại biểu mẫu');
});

loadBanks().then(refreshInputs);

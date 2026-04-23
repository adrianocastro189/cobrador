/* ============================================================
   COBRADOR — app.js
   SPA com localStorage, sem dependências externas.
   ============================================================ */

'use strict';

// ============================================================
// CONSTANTES DE STORAGE
// ============================================================
const STORAGE = {
  PATIENTS: 'cobrador_patients',
  SETTINGS: 'cobrador_settings',
};

// ============================================================
// DEFAULTS DE CONFIGURAÇÃO
// ============================================================
const DEFAULT_SETTINGS = {
  mensagemAviso:
    'Oi *{nome}* 👋, este é um lembrete automático de que sua mensalidade no 🤸🏻‍♀️ *Pilates* 🤸🏻‍♀️ vence em *{dias} dia(s)*.\nO valor de sua mensalidade é 💰*R$ {valor}*💰 e você pode fazer o pagamento através do PIX 32XXXXXXXXX.\n────────\nObrigada.',
  mensagemAtraso:
    'Oi *{nome}* 👋, este é um lembrete automático de que sua mensalidade no 🤸🏻‍♀️ *Pilates* 🤸🏻‍♀️ já venceu.\nO valor de sua mensalidade é 💰*R$ {valor}*💰 e você pode fazer o pagamento através do PIX 32XXXXXXXXX.\n────────\nObrigada.',
  frequenciaAlertas: '10,7,5,4,3,2,1',
};

// ============================================================
// FUNÇÕES DE STORAGE
// ============================================================
function loadPatients() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.PATIENTS)) || [];
  } catch (_) {
    return [];
  }
}

function savePatients(patients) {
  localStorage.setItem(STORAGE.PATIENTS, JSON.stringify(patients));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.SETTINGS));
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : { ...DEFAULT_SETTINGS };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(settings));
}

// ============================================================
// ESTADO GLOBAL
// ============================================================
const state = {
  page: 'pacientes', // 'pacientes' | 'apuracao' | 'configuracoes' | 'form'
  editingId: null,   // null = novo paciente; string = ID do paciente sendo editado
  patients: loadPatients(),
  settings: loadSettings(),
};

// ============================================================
// UTILITÁRIOS
// ============================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Retorna "YYYY-MM" do mês atual */
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Verifica se um paciente já pagou NO MÊS CORRENTE */
function isPaid(patient) {
  return patient.pagouEsseMes === true && patient.mesPagamento === currentMonth();
}

/**
 * Retorna quantos dias faltam (ou quantos passaram, negativo) para o
 * vencimento do paciente, ignorando fronteiras de mês.
 * Exemplo: diaPagamento=15, hoje=23 → -8 (atrasado)
 *          diaPagamento=25, hoje=23 →  2 (falta 2 dias)
 */
function diasAteVencimento(patient) {
  const diaAtual = new Date().getDate();
  return patient.diaPagamento - diaAtual;
}

/** Lista de dias configurados para alerta */
function getAlertDays() {
  return state.settings.frequenciaAlertas
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d));
}

/** Formata número como "1.234,56" */
function formatarValor(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Limpa o telefone e garante prefixo 55 (Brasil) */
function normalizarTelefone(tel) {
  let digits = String(tel).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!digits.startsWith('55')) digits = '55' + digits;
  return digits;
}

/** Gera o link wa.me com mensagem pré-preenchida */
function gerarLinkWhatsApp(patient, dias) {
  const tel = normalizarTelefone(patient.telefone);
  const s = state.settings;
  let mensagem;

  if (dias < 0) {
    // Atrasado
    mensagem = s.mensagemAtraso
      .replace(/\{nome\}/g, patient.nome)
      .replace(/\{valor\}/g, formatarValor(patient.mensalidade));
  } else {
    // Aviso de vencimento próximo (inclui dia zero = hoje vence)
    mensagem = s.mensagemAviso
      .replace(/\{nome\}/g, patient.nome)
      .replace(/\{dias\}/g, dias)
      .replace(/\{valor\}/g, formatarValor(patient.mensalidade));
  }

  return `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`;
}

/** Escapa HTML para evitar XSS ao inserir dados do usuário no DOM */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================
// CRUD DE PACIENTES
// ============================================================
function addPatient(data) {
  const mes = currentMonth();
  const patient = {
    id: generateId(),
    nome: data.nome.trim(),
    telefone: data.telefone.trim(),
    mensalidade: parseFloat(data.mensalidade) || 0,
    diaPagamento: parseInt(data.diaPagamento, 10) || 1,
    pagouEsseMes: !!data.pagouEsseMes,
    mesPagamento: data.pagouEsseMes ? mes : null,
  };
  state.patients.push(patient);
  savePatients(state.patients);
  return patient;
}

function updatePatient(id, data) {
  const idx = state.patients.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const old = state.patients[idx];
  const mes = currentMonth();
  state.patients[idx] = {
    ...old,
    nome: data.nome.trim(),
    telefone: data.telefone.trim(),
    mensalidade: parseFloat(data.mensalidade) || 0,
    diaPagamento: parseInt(data.diaPagamento, 10) || 1,
    pagouEsseMes: !!data.pagouEsseMes,
    // Preserva o mês original de pagamento se já existia; caso contrário define o atual
    mesPagamento: data.pagouEsseMes
      ? old.mesPagamento || mes
      : old.mesPagamento,
  };
  savePatients(state.patients);
}

function deletePatient(id) {
  state.patients = state.patients.filter((p) => p.id !== id);
  savePatients(state.patients);
}

function confirmarPagamento(id) {
  const patient = state.patients.find((p) => p.id === id);
  if (!patient) return;
  patient.pagouEsseMes = true;
  patient.mesPagamento = currentMonth();
  savePatients(state.patients);
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
function navigate(page, editingId = null) {
  state.page = page;
  state.editingId = editingId;

  // Atualiza botões do nav
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  const nav = document.getElementById('bottom-nav');
  nav.style.display = page === 'form' ? 'none' : 'flex';

  render();
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'success') {
  document.querySelector('.toast')?.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 2800);
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
function render() {
  const app = document.getElementById('app');

  const pages = {
    pacientes: renderPacientes,
    apuracao: renderApuracao,
    configuracoes: renderConfiguracoes,
    form: renderForm,
  };

  app.innerHTML = (pages[state.page] || renderPacientes)();
  attachListeners();
}

// ============================================================
// TELA: PACIENTES
// ============================================================
function renderPacientes() {
  const sorted = [...state.patients].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR')
  );

  const body =
    sorted.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon">👥</div>
           <p>Nenhum paciente cadastrado ainda.</p>
           <p class="text-muted">Toque em <strong>+ Novo Paciente</strong> para começar.</p>
         </div>`
      : sorted.map(renderPatientCard).join('');

  return `
    <div class="page-header">
      <h1>Pacientes</h1>
      <button class="btn-primary" id="btn-new-patient">+ Novo</button>
    </div>
    <div class="page-content">${body}</div>
  `;
}

function renderPatientCard(patient) {
  const paid = isPaid(patient);
  const confirmBtn = !paid
    ? `<button class="btn-success btn-confirm" data-id="${patient.id}">
         ✓ Confirmar Pagamento
       </button>`
    : '';

  return `
    <div class="card patient-card">
      <div class="patient-header">
        <div>
          <div class="patient-name">${escHtml(patient.nome)}</div>
          <div class="patient-phone">${escHtml(patient.telefone)}</div>
        </div>
        <span class="status-badge ${paid ? 'badge-paid' : 'badge-pending'}">
          ${paid ? '✓ Pago' : 'Pendente'}
        </span>
      </div>

      <div class="patient-info">
        <div class="info-item">
          <span class="info-label">Mensalidade</span>
          <span class="info-value">R$&nbsp;${formatarValor(patient.mensalidade)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Dia de pag.</span>
          <span class="info-value">Todo dia ${patient.diaPagamento}</span>
        </div>
      </div>

      <div class="patient-actions">
        ${confirmBtn}
        <div class="action-buttons">
          <button class="btn-secondary btn-edit" data-id="${patient.id}">✏️ Editar</button>
          <button class="btn-danger btn-delete" data-id="${patient.id}">🗑 Excluir</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// TELA: FORMULÁRIO DE PACIENTE
// ============================================================
function renderForm() {
  const editing = state.editingId
    ? state.patients.find((p) => p.id === state.editingId)
    : null;

  const title = editing ? 'Editar Paciente' : 'Novo Paciente';
  const paid = editing ? isPaid(editing) : false;

  return `
    <div class="page-header">
      <button class="btn-back" id="btn-back">← Voltar</button>
      <h1>${title}</h1>
    </div>
    <div class="page-content">
      <form id="patient-form" class="form">

        <div class="form-group">
          <label for="f-nome">Nome Completo</label>
          <input
            type="text" id="f-nome" name="nome"
            placeholder="Nome do paciente"
            value="${editing ? escHtml(editing.nome) : ''}"
            autocomplete="off" required>
        </div>

        <div class="form-group">
          <label for="f-telefone">Telefone / WhatsApp</label>
          <input
            type="tel" id="f-telefone" name="telefone"
            placeholder="Ex: 32999999999"
            value="${editing ? escHtml(editing.telefone) : ''}"
            autocomplete="off" required>
        </div>

        <div class="form-group">
          <label for="f-mensalidade">Valor da Mensalidade (R$)</label>
          <input
            type="number" id="f-mensalidade" name="mensalidade"
            placeholder="Ex: 150.00"
            step="0.01" min="0"
            value="${editing ? editing.mensalidade : ''}"
            inputmode="decimal" required>
        </div>

        <div class="form-group">
          <label for="f-dia">Dia de Pagamento</label>
          <input
            type="number" id="f-dia" name="diaPagamento"
            placeholder="Ex: 15"
            min="1" max="31" step="1"
            value="${editing ? editing.diaPagamento : ''}"
            inputmode="numeric" required>
        </div>

        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input
              type="checkbox" id="f-pago" name="pagouEsseMes"
              ${paid ? 'checked' : ''}>
            <span>Pagamento realizado este mês</span>
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary btn-full">
            ${editing ? 'Salvar Alterações' : 'Cadastrar Paciente'}
          </button>
        </div>

      </form>
    </div>
  `;
}

// ============================================================
// TELA: APURAÇÃO
// ============================================================
function renderApuracao() {
  const alertDays = getAlertDays();
  const hoje = new Date();
  const items = [];

  for (const patient of state.patients) {
    if (isPaid(patient)) continue;

    const dias = diasAteVencimento(patient);

    if (dias < 0) {
      // Atrasado — sempre aparece
      items.push({ patient, dias, tipo: 'atrasado' });
    } else if (dias === 0 || alertDays.includes(dias)) {
      // Vence hoje (sempre mostra) ou dentro do período de alerta configurado
      items.push({ patient, dias, tipo: 'aviso' });
    }
  }

  // Ordem: atrasados primeiro, depois por dias crescentes
  items.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'atrasado' ? -1 : 1;
    return a.dias - b.dias;
  });

  const dataFormatada = hoje.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const body =
    items.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon">✅</div>
           <p>Nenhum alerta no momento.</p>
           <p class="text-muted">Todos os pagamentos estão em dia ou fora do período de alerta.</p>
         </div>`
      : items.map(renderApuracaoItem).join('');

  return `
    <div class="page-header">
      <h1>Apuração</h1>
      <span class="header-date">${dataFormatada}</span>
    </div>
    <div class="page-content">${body}</div>
  `;
}

function renderApuracaoItem({ patient, dias, tipo }) {
  const isAtrasado = tipo === 'atrasado';
  const link = gerarLinkWhatsApp(patient, dias);

  let statusLabel;
  if (isAtrasado) {
    const atraso = Math.abs(dias);
    statusLabel = `Atrasado há ${atraso} dia${atraso !== 1 ? 's' : ''}`;
  } else if (dias === 0) {
    statusLabel = 'Vence hoje!';
  } else {
    statusLabel = `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`;
  }

  return `
    <a href="${link}" target="_blank" rel="noopener"
       class="apuracao-item ${isAtrasado ? 'item-atrasado' : 'item-aviso'}">
      <div class="apuracao-name">${escHtml(patient.nome)}</div>
      <div class="apuracao-info">
        <span class="apuracao-status">${statusLabel}</span>
        <span class="apuracao-valor">R$&nbsp;${formatarValor(patient.mensalidade)}</span>
      </div>
      <div class="apuracao-cta">
        <span>Abrir no WhatsApp</span>
        <span>→</span>
      </div>
    </a>
  `;
}

// ============================================================
// TELA: CONFIGURAÇÕES
// ============================================================
function renderConfiguracoes() {
  const s = state.settings;

  return `
    <div class="page-header">
      <h1>Configurações</h1>
    </div>
    <div class="page-content">

      <form id="settings-form" class="form">

        <div class="section-title">Alertas</div>

        <div class="form-group">
          <label for="s-freq">Frequência de Alertas (dias antes do vencimento)</label>
          <input
            type="text" id="s-freq" name="frequenciaAlertas"
            placeholder="Ex: 10,7,5,4,3,2,1"
            value="${escHtml(s.frequenciaAlertas)}">
          <span class="form-hint">
            Separe por vírgula os dias em que o paciente deve aparecer na Apuração.
          </span>
        </div>

        <div class="section-title">Mensagens</div>

        <div class="form-group">
          <label for="s-aviso">Mensagem de Aviso (pagamento próximo)</label>
          <span class="form-hint">
            Placeholders: <code>{nome}</code>, <code>{dias}</code>, <code>{valor}</code>
          </span>
          <textarea id="s-aviso" name="mensagemAviso">${escHtml(s.mensagemAviso)}</textarea>
        </div>

        <div class="form-group">
          <label for="s-atraso">Mensagem de Atraso (pagamento vencido)</label>
          <span class="form-hint">
            Placeholders: <code>{nome}</code>, <code>{valor}</code>
          </span>
          <textarea id="s-atraso" name="mensagemAtraso">${escHtml(s.mensagemAtraso)}</textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary btn-full">Salvar Configurações</button>
        </div>

      </form>

      <div class="section-title" style="margin-top:24px">Backup de Dados</div>

      <div class="card">
        <div class="data-actions">
          <button class="btn-secondary" id="btn-export" style="flex:1">📤 Exportar</button>
          <label class="btn-file-label" for="import-file">
            📥 Importar
            <input type="file" id="import-file" accept=".json" style="display:none">
          </label>
        </div>
        <p class="form-hint">
          Exporte um arquivo .json para fazer backup ou transferir dados para outro celular.
        </p>
      </div>

    </div>
  `;
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function attachListeners() {
  // Navegação inferior
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  switch (state.page) {
    case 'pacientes':     listenPacientes(); break;
    case 'form':          listenForm(); break;
    case 'configuracoes': listenConfiguracoes(); break;
    // 'apuracao' usa apenas <a> tags, sem listeners extras
  }
}

function listenPacientes() {
  document.getElementById('btn-new-patient')?.addEventListener('click', () => {
    navigate('form', null);
  });

  document.querySelectorAll('.btn-confirm').forEach((btn) => {
    btn.addEventListener('click', () => {
      confirmarPagamento(btn.dataset.id);
      render();
      showToast('Pagamento confirmado! ✅');
    });
  });

  document.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => navigate('form', btn.dataset.id));
  });

  document.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const patient = state.patients.find((p) => p.id === btn.dataset.id);
      if (!patient) return;
      if (confirm(`Excluir "${patient.nome}"?\nEsta ação não pode ser desfeita.`)) {
        deletePatient(btn.dataset.id);
        render();
        showToast('Paciente excluído.');
      }
    });
  });
}

function listenForm() {
  document.getElementById('btn-back')?.addEventListener('click', () => {
    navigate('pacientes');
  });

  document.getElementById('patient-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
      nome:         f.nome.value,
      telefone:     f.telefone.value,
      mensalidade:  f.mensalidade.value,
      diaPagamento: f.diaPagamento.value,
      pagouEsseMes: f.pagouEsseMes.checked,
    };

    if (state.editingId) {
      updatePatient(state.editingId, data);
      showToast('Paciente atualizado! ✏️');
    } else {
      addPatient(data);
      showToast('Paciente cadastrado! 👤');
    }

    navigate('pacientes');
  });
}

function listenConfiguracoes() {
  document.getElementById('settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    state.settings = {
      frequenciaAlertas: f.frequenciaAlertas.value.trim(),
      mensagemAviso:     f.mensagemAviso.value,
      mensagemAtraso:    f.mensagemAtraso.value,
    };
    saveSettings(state.settings);
    showToast('Configurações salvas! ⚙️');
  });

  document.getElementById('btn-export')?.addEventListener('click', exportarDados);

  document.getElementById('import-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importarDados(file);
    e.target.value = ''; // permite reimportar o mesmo arquivo
  });
}

// ============================================================
// EXPORT / IMPORT
// ============================================================
function exportarDados() {
  const payload = {
    versao: '1.0',
    exportadoEm: new Date().toISOString(),
    pacientes: state.patients,
    configuracoes: state.settings,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const data = new Date().toISOString().split('T')[0];

  a.href     = url;
  a.download = `cobrador-backup-${data}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Backup exportado! 📤');
}

function importarDados(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (!data.pacientes && !data.configuracoes) {
        throw new Error('Formato inválido');
      }

      const qtd = data.pacientes?.length ?? 0;
      const ok  = confirm(
        `Importar ${qtd} paciente${qtd !== 1 ? 's' : ''}?\n\n` +
        'Os dados atuais serão SUBSTITUÍDOS pelo backup.\nEsta ação não pode ser desfeita.'
      );

      if (!ok) return;

      if (data.pacientes) {
        state.patients = data.pacientes;
        savePatients(state.patients);
      }
      if (data.configuracoes) {
        state.settings = { ...DEFAULT_SETTINGS, ...data.configuracoes };
        saveSettings(state.settings);
      }

      render();
      showToast(`${qtd} paciente${qtd !== 1 ? 's' : ''} importado${qtd !== 1 ? 's' : ''}! 📥`);
    } catch (_) {
      showToast('Erro ao importar. Verifique o arquivo.', 'error');
    }
  };

  reader.readAsText(file);
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  render();
});

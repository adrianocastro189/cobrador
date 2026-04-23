# CLAUDE.md — Guia de Manutenção do Cobrador

Este arquivo documenta a arquitetura e as convenções do projeto para auxiliar Claude (ou qualquer desenvolvedor) em manutenções futuras.

---

## Visão Geral

**Cobrador** é um web app estático — uma SPA (Single Page Application) em JavaScript puro, sem frameworks nem dependências externas. Roda inteiramente no navegador do usuário, com dados persistidos no `localStorage`. É hospedado no GitHub Pages e funciona como PWA instalável no celular.

Contexto de uso: profissional de saúde (pilates) que precisa gerenciar mensalidades de pacientes e enviar cobranças via WhatsApp.

---

## Estrutura de Arquivos

```
cobrador/
├── index.html          # Shell HTML do app — quase nada além de meta tags e os <script>/<link>
├── manifest.json       # PWA: nome, ícones, cor, modo standalone
├── sw.js               # Service Worker: cache-first para uso offline
├── css/
│   └── style.css       # Todo o CSS. Mobile-first, sem pré-processador.
├── js/
│   └── app.js          # Toda a lógica. Um único arquivo JS.
└── icons/
    ├── icon-192.png    # Ícone PWA (gerado via Pillow/Python)
    └── icon-512.png
```

Não há `package.json`, bundler, transpiler nem processo de build. O que está no repositório é exatamente o que vai para produção.

---

## Arquitetura do app.js

O arquivo é organizado em seções claramente delimitadas por comentários `// ===`. A ordem é importante:

```
CONSTANTES DE STORAGE   → chaves do localStorage
DEFAULT_SETTINGS        → valores padrão das configurações
FUNÇÕES DE STORAGE      → load/save para localStorage
ESTADO GLOBAL           → objeto `state` (único source of truth)
UTILITÁRIOS             → funções puras sem efeitos colaterais
CRUD DE PACIENTES       → operações que modificam state.patients
NAVEGAÇÃO               → função navigate() que troca de tela
TOAST                   → feedback visual não-bloqueante
RENDER PRINCIPAL        → função render() que despacha para sub-renders
TELA: PACIENTES         → renderPacientes() + renderPatientCard()
TELA: FORMULÁRIO        → renderForm()
TELA: APURAÇÃO          → renderApuracao() + renderApuracaoItem()
TELA: CONFIGURAÇÕES     → renderConfiguracoes()
EVENT LISTENERS         → attachListeners() + listen*() por tela
EXPORT / IMPORT         → exportarDados() + importarDados()
INIT                    → DOMContentLoaded → render()
```

### Padrão de renderização

O app não usa nenhum framework reativo. O ciclo é simples e manual:

```
1. Evento do usuário (clique, submit...)
2. Muta state e/ou chama save*() para persistir
3. Chama render() — que reescreve app.innerHTML por completo
4. attachListeners() — reanexa todos os event listeners à nova DOM
```

Consequência importante: **não há estado no DOM**. Tudo está em `state`. Qualquer dado que precise sobreviver a um re-render tem que estar em `state.patients` ou `state.settings`.

### Objeto state

```js
const state = {
  page:      string,   // 'pacientes' | 'apuracao' | 'configuracoes' | 'form'
  editingId: string|null, // ID do paciente em edição; null = novo cadastro
  patients:  Patient[],
  settings:  Settings,
};
```

`state` é inicializado uma única vez no topo do arquivo, carregando do localStorage. Não é reinicializado em nenhum outro momento.

---

## Modelos de Dados

### Patient

```js
{
  id:           string,  // gerado por generateId() — base36 + random
  nome:         string,
  telefone:     string,  // campo livre, sem máscara
  mensalidade:  number,  // valor float em reais
  diaPagamento: number,  // 1–31
  pagouEsseMes: boolean,
  mesPagamento: string|null,  // "YYYY-MM" do mês em que pagou; null se nunca
}
```

### Settings

```js
{
  mensagemAviso:    string,  // template com {nome}, {dias}, {valor}
  mensagemAtraso:   string,  // template com {nome}, {valor}
  frequenciaAlertas: string, // ex: "10,7,5,4,3,2,1" (vírgula-separado)
}
```

### Formato de backup (JSON exportado)

```js
{
  versao:       "1.0",
  exportadoEm:  "ISO8601",
  pacientes:    Patient[],
  configuracoes: Settings,
}
```

---

## Lógica de Negócio Crítica

### isPaid(patient) — pagamento do mês vigente

```js
function isPaid(patient) {
  return patient.pagouEsseMes === true && patient.mesPagamento === currentMonth();
}
```

`currentMonth()` retorna `"YYYY-MM"`. O reset mensal é **implícito**: quando o mês vira, `currentMonth()` retorna um valor diferente de `mesPagamento`, e o paciente volta a aparecer como pendente automaticamente — sem nenhum job, cron ou listener. Os dados em disco não são alterados; apenas a avaliação muda.

### diasAteVencimento(patient) — cálculo de dias

```js
function diasAteVencimento(patient) {
  return patient.diaPagamento - new Date().getDate();
}
// resultado > 0: falta n dias   (azul na apuração)
// resultado = 0: vence hoje     (azul, sempre aparece)
// resultado < 0: atrasado       (vermelho na apuração)
```

**Importante:** o cálculo é puramente intra-mês. Ele não cruza fronteiras de mês — e não precisa, porque o campo `pagouEsseMes` já trata isso. Se um paciente com dia 5 já pagou em março, ele não aparece até abril (quando `isPaid` volta a ser false).

### Lógica de aparição na Apuração

```
Para cada paciente não pago:
  dias = diaPagamento - diaAtual
  if dias < 0       → aparece em VERMELHO (atrasado)
  if dias === 0     → aparece em AZUL (vence hoje — sempre)
  if dias está na lista de frequência → aparece em AZUL
  caso contrário    → não aparece
```

A lista de frequência é parseada de `state.settings.frequenciaAlertas` por `getAlertDays()`.

### Normalização de telefone para WhatsApp

```js
function normalizarTelefone(tel) {
  let digits = String(tel).replace(/\D/g, '');  // remove tudo que não é número
  if (digits.startsWith('0')) digits = digits.slice(1); // ex: "0XX" → remove o 0
  if (!digits.startsWith('55')) digits = '55' + digits; // adiciona DDI Brasil
  return digits;
}
// "32999020189"      → "5532999020189"
// "(32) 9 9902-0189" → "5532999020189"
// "+55 32 99902..."  → "5532999020189"
```

### Substituição de placeholders nas mensagens

```js
mensagem
  .replace(/\{nome\}/g, patient.nome)
  .replace(/\{dias\}/g, dias)
  .replace(/\{valor\}/g, formatarValor(patient.mensalidade))
```

Usa regex com flag `g` para substituir todas as ocorrências, não só a primeira. `formatarValor` usa `toLocaleString('pt-BR')`, gerando "1.234,56".

---

## CSS — Convenções

- Todas as cores são CSS custom properties em `:root`. Nunca use valores hexadecimais soltos.
- Layout mobile-first. Não há breakpoints — o app é só para celular.
- A navegação inferior tem altura `--nav-h: 68px`. O `#app` tem `padding-bottom` correspondente para o conteúdo não ficar embaixo da nav.
- Suporte a safe area (notch e home indicator do iPhone) via `env(safe-area-inset-bottom)` em `@supports`.
- Botões têm `transform: scale(0.97)` no `:active` para feedback tátil.

---

## Como Adicionar uma Nova Tela

1. Adicione o valor de `page` na documentação do `state` (comentário na linha).
2. Crie `renderNovaTela()` retornando uma string HTML com a estrutura padrão:
   ```js
   function renderNovaTela() {
     return `
       <div class="page-header"><h1>Título</h1></div>
       <div class="page-content">...</div>
     `;
   }
   ```
3. Registre no mapa da `render()`:
   ```js
   const pages = {
     pacientes: renderPacientes,
     novaTela: renderNovaTela,  // ← adicione aqui
     ...
   };
   ```
4. Adicione o botão de navegação no `index.html` se for uma tela principal:
   ```html
   <button class="nav-btn" data-page="novaTela">
     <span class="nav-icon">🆕</span>
     <span class="nav-label">Nova</span>
   ```
5. Se a tela tiver interatividade, crie `listenNovaTela()` e chame-a no `switch` dentro de `attachListeners()`.

---

## Como Adicionar um Novo Campo ao Paciente

1. Adicione o campo ao modelo `Patient` (atualizar o comentário de documentação acima).
2. Adicione o `<input>` em `renderForm()`.
3. Leia o valor em `listenForm()` dentro do objeto `data`.
4. Inclua o campo em `addPatient()` e `updatePatient()`.
5. Exiba o campo em `renderPatientCard()` se relevante.
6. Se o campo afeta a Apuração, atualize `renderApuracao()` / `renderApuracaoItem()`.

---

## Como Adicionar um Novo Placeholder nas Mensagens

1. Documente o novo placeholder na tela de Configurações (`renderConfiguracoes()`), no `form-hint`.
2. Substitua-o em `gerarLinkWhatsApp()`:
   ```js
   mensagem = mensagem.replace(/\{novoPlaceholder\}/g, valor);
   ```

---

## Deploy — GitHub Pages

O app roda diretamente da branch `main`, sem build step.

**Configuração (uma única vez):**
GitHub → Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save.

**Para atualizar:** faça commit e push. O GitHub Pages reflete em ~1 minuto.

**URL:** `https://<usuario>.github.io/<repositório>/`

**Cache do Service Worker:** ao fazer uma atualização, incremente a versão em `sw.js`:
```js
const CACHE = 'cobrador-v2'; // era v1
```
Isso força o navegador a baixar os novos assets na próxima visita.

---

## Armadilhas Conhecidas

| Situação | Comportamento | Motivo |
|---|---|---|
| Trocar de celular sem exportar | Dados perdidos | localStorage é local ao dispositivo/browser |
| Limpar dados do browser | Dados perdidos | Mesma razão |
| Pagamento com dia 29, 30 ou 31 | Pode marcar como atrasado em meses curtos | Cálculo intra-mês simples; sem tratamento de borda |
| Número de telefone fora do padrão brasileiro | Link WhatsApp pode falhar | `normalizarTelefone` assume DDI 55 |
| Importar arquivo JSON malformado | Toast de erro, nenhuma mutação | Try/catch em `importarDados` |

---

## Decisões de Arquitetura

**Por que JavaScript puro?** O app é hospedado em GitHub Pages sem processo de build. Adicionar React/Vue exigiria bundler (Vite, etc.) e um workflow de CI/CD para build automático. Para a escala e complexidade deste app, JS puro é mais simples de manter e mais rápido no celular.

**Por que um único app.js?** Mantém o número de requisições HTTP baixo e elimina a necessidade de módulos ES6 com CORS (que exigem servidor HTTP — `file://` não funciona). Para o tamanho atual do app, a legibilidade é boa com as seções comentadas.

**Por que localStorage e não IndexedDB?** Os dados são simples (lista de objetos pequenos) e o volume esperado é baixo (dezenas de pacientes, no máximo). localStorage é síncrono, mais simples de usar e mais do que suficiente. IndexedDB faria sentido se houvesse histórico de pagamentos, relatórios, ou centenas de registros.

**Por que o reset mensal é implícito?** Evita a necessidade de um job agendado (não existe em JS puro sem service worker). A avaliação no momento da leitura é sempre correta e não exige nenhuma migração de dados quando o mês vira.

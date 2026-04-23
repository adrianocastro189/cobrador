# 💰 Cobrador

Aplicativo de gerenciamento de mensalidades para profissionais de saúde. Cadastre suas pacientes, acompanhe os pagamentos e envie cobranças diretamente pelo WhatsApp — tudo pelo celular, sem precisar de internet ou conta em nenhum serviço.

🔗 **Acesse o app:** `https://adrianocastro189.github.io/cobrador/`

---

## 📱 Instalando como app no celular

O Cobrador pode ser instalado na tela inicial do seu celular e funcionar como um aplicativo de verdade (sem barra do navegador, abre rápido, funciona offline).

**No Android (Chrome):**
1. Abra o link do app no Chrome
2. Toque nos três pontinhos no canto superior direito
3. Toque em **"Adicionar à tela inicial"**
4. Confirme — o ícone vai aparecer na sua tela 🎉

**No iPhone (Safari):**
1. Abra o link do app no Safari
2. Toque no botão de compartilhar (quadradinho com setinha pra cima)
3. Role e toque em **"Adicionar à Tela de Início"**
4. Confirme — pronto! 🎉

> 💡 Após instalado, o app abre diretamente sem precisar do navegador e funciona mesmo sem internet.

---

## 🗂️ Telas do app

O app tem três telas acessíveis pela barra de navegação na parte inferior.

### 👥 Pacientes

A tela principal. Mostra a lista de todas as suas pacientes em ordem alfabética.

Cada cartão exibe:
- Nome e telefone
- Valor da mensalidade e dia de vencimento
- Situação do pagamento: **✓ Pago** (verde) ou **Pendente** (amarelo)

**O que você pode fazer aqui:**

- **➕ Novo** — cadastra uma nova paciente
- **✓ Confirmar Pagamento** — marca o pagamento do mês com um único toque, sem precisar abrir o cadastro
- **✏️ Editar** — abre o formulário de edição
- **🗑 Excluir** — remove a paciente (pede confirmação antes)

> 💡 O status "Pago/Pendente" reseta automaticamente todo mês — você não precisa fazer nada para isso.

---

### 📋 Apuração

Aqui ficam as pacientes que precisam de atenção **hoje**. O app calcula automaticamente quem deve receber um lembrete com base nos dias configurados.

- 🔵 **Botão azul** → pagamento se aproximando (ex: "Vence em 3 dias" ou "Vence hoje!")
- 🔴 **Botão vermelho** → pagamento em atraso (ex: "Atrasado há 5 dias")

Ao tocar no botão da paciente, o WhatsApp abre direto com a mensagem de cobrança já preenchida — é só enviar! 📨

> 💡 Se uma paciente não aparece aqui, é porque o dia de vencimento dela ainda está fora do período de alerta. Configure a frequência de alertas nas Configurações.

---

### ⚙️ Configurações

#### Frequência de Alertas
Define em quais dias (contados antes do vencimento) a paciente aparece na Apuração.

Exemplo: `10,7,5,4,3,2,1` significa que ela vai aparecer quando faltarem 10, 7, 5, 4, 3, 2 ou 1 dia(s) para vencer.

#### Mensagem de Aviso
Mensagem enviada quando o pagamento está próximo. Você pode personalizar o texto usando os **placeholders** entre chaves, que são preenchidos automaticamente:

| Placeholder | O que aparece |
|---|---|
| `{nome}` | Nome da paciente |
| `{dias}` | Quantos dias faltam para vencer |
| `{valor}` | Valor da mensalidade |

#### Mensagem de Atraso
Mensagem para quem já passou da data. Suporta `{nome}` e `{valor}`.

> 💡 Lembre-se de tocar em **Salvar Configurações** depois de editar!

---

## 💾 Backup dos seus dados

Os dados ficam salvos **no seu celular**, não em nenhum servidor. Isso significa que se você trocar de celular ou limpar o navegador, os dados somem — a não ser que você faça backup.

### 📤 Exportar

Em **Configurações → Exportar**, o app baixa um arquivo `.json` com todos os dados. Você pode:
- Mandar o arquivo para si mesma pelo WhatsApp ou e-mail
- Guardar no Google Drive ou iCloud
- Usar para restaurar no mesmo celular ou em outro

### 📥 Importar

Em **Configurações → Importar**, selecione o arquivo `.json` que você exportou. Os dados atuais serão **substituídos** pelos dados do arquivo.

> ⚠️ A importação substitui tudo. Se quiser combinar dados de dois celulares, exporte um, edite o JSON manualmente (é texto simples) e importe o resultado.

---

## 📅 Como o pagamento mensal funciona

- Cada paciente tem um **dia de pagamento** configurado (ex: todo dia 15)
- O campo **"Pago esse mês"** indica se ela já pagou no mês atual
- **Esse campo reseta automaticamente** quando o mês vira — você não precisa fazer nada
- Para registrar um pagamento, basta tocar em **✓ Confirmar Pagamento** na lista de pacientes

---

## 📞 Sobre os números de telefone

O campo de telefone é livre — você pode digitar do jeito que quiser:
- `32999020189`
- `(32) 9 9902-0189`
- `32 9 9902 0189`

O app limpa o número automaticamente e adiciona o código do Brasil (+55) na hora de abrir o WhatsApp.

---

## 🛠️ Para quem vai dar manutenção no código

Consulte o arquivo `CLAUDE.md` na raiz do repositório. Ele documenta a arquitetura, os modelos de dados, a lógica de negócio e como adicionar novas funcionalidades.

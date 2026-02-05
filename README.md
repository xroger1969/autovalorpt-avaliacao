# AutoValorPT — Notificação de novo pedido (GitHub Pages)

Este repositório já está preparado com a opção **mais simples mantendo HTML próprio**:

- `index.html` (formulário estático no GitHub Pages)
- `Code.gs` (backend mínimo em Google Apps Script)

Quando alguém submete:
1. Cria-se uma pasta no Google Drive para as fotos.
2. Guarda-se o registo numa Google Sheet.
3. É enviado um e-mail automático para `c.vasconcelos1969@gmail.com` com aviso de **novo pedido** e link para a pasta.

---

## Opção 1 (ainda mais simples, sem código): Google Forms

Se aceitares usar Google Forms diretamente, este é o caminho mais rápido e fiável:

1. Criar Google Form com campos: nome, e-mail, contacto, observações e upload de ficheiros.
2. Em **Respostas**, ligar a uma Google Sheet.
3. No menu de notificações/add-ons, ativar alerta por e-mail para novas respostas.
4. Publicar o link do Form no teu site (botão "Pedir avaliação").

> Vantagem: não precisas manter backend, nem lidar com deploy do Apps Script.

---

## Opção 2 (manter formulário HTML): Apps Script mínimo

### 1) Preparar Google Drive e Google Sheet

1. Cria uma pasta principal no Drive (onde irão ficar as subpastas de cada pedido).
2. Copia o ID da pasta da URL.
3. Cria uma Google Sheet nova e copia o ID da URL.

### 2) Configurar `Code.gs`

No `Code.gs`, preencher:

- `SHEET_ID`
- `DRIVE_PARENT_FOLDER_ID`
- `NOTIFICATION_EMAIL` (já está `c.vasconcelos1969@gmail.com`)

### 3) Publicar o Apps Script como Web App

1. Abrir script.google.com e colar o conteúdo de `Code.gs`.
2. **Deploy > New deployment > Web app**.
3. Executar como: **Me**.
4. Quem tem acesso: **Anyone**.
5. Deploy e copiar URL `/exec`.

### 4) Atualizar `index.html`

No topo do `<script>` do `index.html`, atualizar:

```js
const WEBAPP_URL = "COLE_AQUI_A_URL_DO_WEBAPP_EXEC";
```

### 5) Publicar no GitHub Pages

1. Fazer commit/push deste `index.html`.
2. Ativar GitHub Pages (branch principal, raiz).
3. Testar submissão real com 1–2 fotos.

---

## Notas importantes

- Não é usado SMTP no frontend.
- Não há password de Gmail no HTML.
- O e-mail é enviado no backend do Google (Apps Script / GmailApp), que é a opção mais fiável para este cenário.

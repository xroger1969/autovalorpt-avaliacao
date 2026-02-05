/**
 * AutoValorPT - Web App (Google Apps Script)
 *
 * Fluxo esperado do front-end:
 * 1) action=init   -> cria pasta de submissão + registo em Sheet
 * 2) action=upload -> guarda cada imagem na pasta criada
 */

// =========================
// CONFIGURAÇÃO
// =========================
const SHEET_ID = 'ID_DA_TUA_SHEET_AQUI';
const SHEET_NAME = 'Submissoes';
const DRIVE_PARENT_FOLDER_ID = 'ID_DA_TUA_PASTA_DRIVE_AQUI';
const NOTIFICATION_EMAIL = 'teu-email@dominio.com';
const EMAIL_SUBJECT_PREFIX = '[AutoValorPT]';

// =========================
// TESTE MANUAL DE EMAIL
// Executar 1x no editor para autorizar permissões
// =========================
function testEmail() {
  const subject = `${EMAIL_SUBJECT_PREFIX} Teste de envio`;
  const body = [
    'Este é um email de teste do Apps Script.',
    `Projeto: ${ScriptApp.getScriptId()}`,
    `Data/hora: ${new Date().toISOString()}`
  ].join('\n');

  GmailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  Logger.log(`Email de teste enviado para: ${NOTIFICATION_EMAIL}`);
}

function doPost(e) {
  try {
    console.log('doPost chamado');
    const params = (e && e.parameter) ? e.parameter : {};
    const action = (params.action || '').toLowerCase();
    console.log(`action=${action}`);

    if (!action) {
      return jsonResponse({ ok: false, error: 'Parâmetro "action" em falta.' });
    }

    if (action === 'init') {
      return handleInit_(params);
    }

    if (action === 'upload') {
      return handleUpload_(params);
    }

    return jsonResponse({ ok: false, error: `Ação inválida: ${action}` });
  } catch (error) {
    console.log(`Erro doPost: ${error && error.stack ? error.stack : error}`);
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}

function handleInit_(params) {
  console.log('handleInit_ iniciado');

  const sheet = getOrCreateSheet_();
  const parent = DriveApp.getFolderById(DRIVE_PARENT_FOLDER_ID);

  const submissionId = Utilities.getUuid();
  const ts = new Date();
  const folderName = `Submissao_${formatDate_(ts)}_${submissionId.substring(0, 8)}`;
  const folder = parent.createFolder(folderName);

  const row = [
    ts,
    submissionId,
    folder.getId(),
    folder.getUrl(),
    params.nome || '',
    params.email || '',
    params.contacto || '',
    params.marca || '',
    params.modelo || '',
    params.ano || '',
    params.km || '',
    params.combustivel || '',
    params.caixa || '',
    params.versao || '',
    params.matricula || '',
    params.observacoes || '',
    params.totalFotos || '',
    'INICIADO'
  ];

  sheet.appendRow(row);

  const notifyEmail = (params.notificationEmail || NOTIFICATION_EMAIL || '').trim();
  sendNotificationEmail_(notifyEmail, {
    submissionId,
    timestamp: ts,
    folderName,
    folderUrl: folder.getUrl(),
    params
  });

  console.log(`Init concluído | submissionId=${submissionId} | folderId=${folder.getId()}`);

  return jsonResponse({
    ok: true,
    submissionId,
    folderId: folder.getId()
  });
}

function handleUpload_(params) {
  console.log('handleUpload_ iniciado');

  const submissionId = (params.submissionId || '').trim();
  const folderId = (params.folderId || '').trim();
  const fileName = sanitizeFilename_(params.filename || 'foto.jpg');
  const mimeType = (params.mimeType || 'image/jpeg').trim();
  const base64 = (params.fileBase64 || '').trim();

  if (!submissionId || !folderId || !base64) {
    return jsonResponse({ ok: false, error: 'Dados insuficientes para upload (submissionId/folderId/fileBase64).' });
  }

  const folder = DriveApp.getFolderById(folderId);
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);

  console.log(`Upload concluído | submissionId=${submissionId} | fileId=${file.getId()} | name=${fileName}`);

  return jsonResponse({
    ok: true,
    fileId: file.getId(),
    fileUrl: file.getUrl()
  });
}

function sendNotificationEmail_(to, context) {
  if (!to) {
    console.log('Sem email de notificação configurado. A continuar sem envio.');
    return;
  }

  const subject = `${EMAIL_SUBJECT_PREFIX} Nova submissão: ${context.params.nome || 'Sem nome'} (${context.submissionId.substring(0, 8)})`;
  const body = [
    'Nova submissão recebida no AutoValorPT.',
    '',
    `ID: ${context.submissionId}`,
    `Data: ${context.timestamp.toISOString()}`,
    `Nome: ${context.params.nome || ''}`,
    `Email: ${context.params.email || ''}`,
    `Contacto: ${context.params.contacto || ''}`,
    `Viatura: ${(context.params.marca || '').trim()} ${(context.params.modelo || '').trim()}`.trim(),
    `Ano: ${context.params.ano || ''}`,
    `KM: ${context.params.km || ''}`,
    `Combustível: ${context.params.combustivel || ''}`,
    `Caixa: ${context.params.caixa || ''}`,
    `Versão: ${context.params.versao || ''}`,
    `Matrícula: ${context.params.matricula || ''}`,
    `Observações: ${context.params.observacoes || ''}`,
    `Total fotos (decl): ${context.params.totalFotos || ''}`,
    '',
    `Pasta Drive: ${context.folderName}`,
    `URL pasta: ${context.folderUrl}`
  ].join('\n');

  console.log(`A enviar email para ${to}`);
  GmailApp.sendEmail(to, subject, body);
  console.log('Email enviado com sucesso');
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'timestamp',
      'submissionId',
      'folderId',
      'folderUrl',
      'nome',
      'email',
      'contacto',
      'marca',
      'modelo',
      'ano',
      'km',
      'combustivel',
      'caixa',
      'versao',
      'matricula',
      'observacoes',
      'totalFotos',
      'estado'
    ]);
  }

  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeFilename_(name) {
  return String(name)
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || 'foto.jpg';
}

function formatDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
}

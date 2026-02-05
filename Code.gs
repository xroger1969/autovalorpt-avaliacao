/**
 * AutoValorPT - Backend mínimo com Google Apps Script
 *
 * Fluxo do front-end:
 * 1) action=init   -> cria pasta no Drive + registo em Sheet + envia email "novo pedido"
 * 2) action=upload -> guarda cada imagem na pasta criada
 */

const SHEET_ID = 'ID_DA_TUA_SHEET_AQUI';
const SHEET_NAME = 'Submissoes';
const DRIVE_PARENT_FOLDER_ID = 'ID_DA_TUA_PASTA_DRIVE_AQUI';
const NOTIFICATION_EMAIL = 'c.vasconcelos1969@gmail.com';
const EMAIL_SUBJECT_PREFIX = '[AutoValorPT]';

function doPost(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = String(params.action || '').toLowerCase();

    if (action === 'init') return handleInit_(params);
    if (action === 'upload') return handleUpload_(params);

    return jsonResponse({ ok: false, error: 'Ação inválida. Usa init ou upload.' });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}

function handleInit_(params) {
  const sheet = getOrCreateSheet_();
  const parent = DriveApp.getFolderById(DRIVE_PARENT_FOLDER_ID);

  const submissionId = Utilities.getUuid();
  const timestamp = new Date();
  const folderName = `Submissao_${formatDate_(timestamp)}_${submissionId.substring(0, 8)}`;
  const folder = parent.createFolder(folderName);

  sheet.appendRow([
    timestamp,
    submissionId,
    folder.getId(),
    folder.getUrl(),
    params.nome || '',
    params.email || '',
    params.contacto || '',
    params.observacoes || '',
    params.totalFotos || '',
    'INICIADO'
  ]);

  const notifyEmail = (params.notificationEmail || NOTIFICATION_EMAIL || '').trim();
  sendNotificationEmail_(notifyEmail, {
    submissionId,
    timestamp,
    folderName,
    folderUrl: folder.getUrl(),
    params
  });

  return jsonResponse({
    ok: true,
    submissionId,
    folderId: folder.getId()
  });
}

function handleUpload_(params) {
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

  return jsonResponse({ ok: true, fileId: file.getId(), fileUrl: file.getUrl() });
}

function sendNotificationEmail_(to, context) {
  if (!to) return;

  const subject = `${EMAIL_SUBJECT_PREFIX} novo pedido: ${context.params.nome || 'Sem nome'} (${context.submissionId.substring(0, 8)})`;
  const body = [
    'Novo pedido recebido no AutoValorPT.',
    '',
    `ID: ${context.submissionId}`,
    `Data: ${context.timestamp.toISOString()}`,
    `Nome: ${context.params.nome || ''}`,
    `Email: ${context.params.email || ''}`,
    `Contacto: ${context.params.contacto || ''}`,
    `Observações: ${context.params.observacoes || ''}`,
    `Total fotos (decl): ${context.params.totalFotos || ''}`,
    '',
    `Pasta Drive: ${context.folderName}`,
    `Link das fotos: ${context.folderUrl}`
  ].join('\n');

  GmailApp.sendEmail(to, subject, body);
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'timestamp',
      'submissionId',
      'folderId',
      'folderUrl',
      'nome',
      'email',
      'contacto',
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

const fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto');
const repo = require('./files.repository');
const { transaction } = require('../../shared/transactions');
const { assert } = require('../../shared/errors');
const { placement, owner, mutable, facultyReviewer } = require('../../shared/scope');
const { audit } = require('../../shared/audit');
const { notify } = require('../../shared/notifications');
const schema = require('./files.schemas');
async function list(c, actor, id) {
  await placement(c, actor, id);
  const items = await repo.rows(
    c,
    'SELECT * FROM placement_requirements WHERE placement_id=? ORDER BY id',
    [id],
  );
  for (const r of items)
    r.uploads = await repo.rows(
      c,
      'SELECT id,original_name,mime_type,size_bytes,version,created_at FROM uploaded_files WHERE placement_requirement_id=? ORDER BY version DESC',
      [r.id],
    );
  return items;
}
async function authorizeUpload(c, actor, id) {
  const { p, r } = await repo.requirement(c, actor, id);
  owner(actor, p);
  mutable(p);
  assert(
    ['pending', 'rejected'].includes(r.status),
    409,
    'IMMUTABLE_RECORD',
    'Requirement must be pending or rejected to upload',
  );
  return { p, r };
}
async function safeFile(root, key) {
  assert(/^[a-f0-9-]{36}$/.test(key), 404, 'FILE_NOT_FOUND', 'File not found');
  const rootReal = await fs.realpath(root);
  const target = path.resolve(root, key);
  assert(target.startsWith(path.resolve(root) + path.sep), 404, 'FILE_NOT_FOUND', 'File not found');
  let stat;
  try {
    stat = await fs.lstat(target);
  } catch (e) {
    if (e.code === 'ENOENT')
      assert(false, 404, 'FILE_NOT_FOUND', 'Private file is missing; contact the administrator');
    throw e;
  }
  assert(!stat.isSymbolicLink() && stat.isFile(), 404, 'FILE_NOT_FOUND', 'File not found');
  const real = await fs.realpath(target);
  assert(real.startsWith(rootReal + path.sep), 404, 'FILE_NOT_FOUND', 'File not found');
  return target;
}
async function upload(pool, actor, id, file, env, dependencies = {}) {
  assert(file, 422, 'FILE_REQUIRED', 'Choose a file');
  let finalPath;
  try {
    const detected = await (await import('file-type')).fileTypeFromFile(file.path);
    const allowed = {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    };
    assert(
      detected &&
        allowed[detected.mime] &&
        file.mimetype === detected.mime &&
        allowed[detected.mime].includes(path.extname(file.originalname).toLowerCase()),
      422,
      'INVALID_FILE_TYPE',
      'Upload a genuine PDF, JPEG or PNG with matching extension and MIME type',
    );
    const buffer = await fs.readFile(file.path),
      sha256 = crypto.createHash('sha256').update(buffer).digest('hex'),
      key = crypto.randomUUID();
    finalPath = path.join(env.UPLOAD_ROOT, key);
    await fs.rename(file.path, finalPath);
    const result = await transaction(pool, async (c) => {
      const { p, r } = await repo.requirement(c, actor, id, true);
      owner(actor, p);
      mutable(p);
      assert(
        ['pending', 'rejected'].includes(r.status),
        409,
        'IMMUTABLE_RECORD',
        'Requirement cannot accept a new upload',
      );
      const latest = await repo.one(
        c,
        'SELECT COALESCE(MAX(version),0) AS version FROM uploaded_files WHERE placement_requirement_id=?',
        [id],
      );
      const fid = await (dependencies.insert || repo.insert)(c, 'uploaded_files', {
        placement_requirement_id: id,
        uploaded_by: actor.id,
        storage_key: key,
        original_name:
          path
            .basename(file.originalname)
            .replace(/[\x00-\x1f\x7f]/g, '')
            .slice(0, 255) || 'document',
        mime_type: detected.mime,
        size_bytes: file.size,
        sha256,
        version: Number(latest.version) + 1,
      });
      await repo.update(c, 'placement_requirements', id, {
        current_upload_id: fid,
        status: 'submitted',
        submitted_at: new Date(),
        verified_by: null,
        verified_at: null,
        remarks: null,
      });
      await audit(c, actor, 'requirement.submitted', 'placement_requirement', id, {
        fileId: fid,
        version: Number(latest.version) + 1,
      });
      await notify(
        c,
        p.faculty_user_id,
        'requirement.submitted',
        'placement',
        p.id,
        'A student document needs review',
      );
      return repo.one(c, 'SELECT * FROM placement_requirements WHERE id=?', [id]);
    });
    finalPath = null;
    return result;
  } finally {
    await fs.rm(file.path, { force: true });
    if (finalPath) await fs.rm(finalPath, { force: true });
  }
}
async function review(pool, actor, id, body, reopen = false) {
  body = (reopen ? schema.reopen : schema.review).parse(body);
  return transaction(pool, async (c) => {
    const { p, r } = await repo.requirement(c, actor, id, true);
    facultyReviewer(actor, p);
    mutable(p);
    assert(
      r.status === (reopen ? 'approved' : 'submitted'),
      409,
      'INVALID_TRANSITION',
      'Requirement is not in a reviewable state',
    );
    if (reopen || body.decision === 'rejected')
      assert(body.remarks, 422, 'REMARKS_REQUIRED', 'A reason is required');
    if (!reopen) {
      const file = await repo.one(
        c,
        'SELECT id FROM uploaded_files WHERE id=? AND placement_requirement_id=?',
        [r.current_upload_id, id],
      );
      assert(
        file,
        409,
        'UPLOAD_REQUIRED',
        'The current upload does not belong to this requirement',
      );
    }
    await repo.update(c, 'placement_requirements', id, {
      status: reopen ? 'rejected' : body.decision,
      verified_by: actor.id,
      verified_at: new Date(),
      remarks: body.remarks || null,
    });
    await audit(
      c,
      actor,
      reopen ? 'requirement.reopened' : 'requirement.reviewed',
      'placement_requirement',
      id,
      body,
    );
    await notify(
      c,
      p.student_user_id,
      'requirement.reviewed',
      'placement',
      p.id,
      'Your document was ' + (reopen ? 'reopened' : body.decision),
    );
    return repo.one(c, 'SELECT * FROM placement_requirements WHERE id=?', [id]);
  });
}
async function download(c, actor, id, env) {
  const file = await repo.one(c, 'SELECT * FROM uploaded_files WHERE id=?', [id]);
  assert(file, 404, 'NOT_FOUND', 'File not found');
  await repo.requirement(c, actor, file.placement_requirement_id);
  return { file, path: await safeFile(env.UPLOAD_ROOT, file.storage_key) };
}
module.exports = { list, authorizeUpload, safeFile, upload, review, download };

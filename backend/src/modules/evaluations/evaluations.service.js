const repo = require('./evaluations.repository');
const { transaction } = require('../../shared/transactions');
const { placement, facultyReviewer } = require('../../shared/scope');
const { assert } = require('../../shared/errors');
const { audit } = require('../../shared/audit');
const { notify } = require('../../shared/notifications');
const { grade } = require('../../shared/time');
const schema = require('./evaluations.schemas');
async function create(pool, actor, body) {
  body = schema.create.parse(body);
  return transaction(pool, async (c) => {
    const p = await placement(c, actor, body.placementId, true);
    assert(p.status === 'active', 409, 'PLACEMENT_NOT_ACTIVE', 'Evaluate an active placement');
    const evaluator = p.deployment_type === 'company' ? p.supervisor_user_id : p.faculty_user_id;
    assert(actor.id === evaluator, 403, 'FORBIDDEN', 'The assigned evaluator creates evaluations');
    const latest = await repo.one(
      c,
      'SELECT MAX(rubric_version) AS version FROM evaluation_criteria WHERE is_active=1',
    );
    assert(latest.version, 422, 'RUBRIC_REQUIRED', 'Publish a valid rubric first');
    const criteria = await repo.rows(
      c,
      'SELECT * FROM evaluation_criteria WHERE rubric_version=? AND is_active=1 ORDER BY sort_order,id FOR UPDATE',
      [latest.version],
    );
    assert(
      criteria.length && criteria.every((x) => Number(x.max_score) > 0),
      422,
      'INVALID_RUBRIC',
      'Rubric maxima must be positive',
    );
    const id = await repo.insert(c, 'evaluations', {
      placement_id: p.id,
      evaluator_id: evaluator,
      type: body.type,
      rubric_version: latest.version,
    });
    for (const item of criteria)
      await repo.insert(c, 'evaluation_scores', {
        evaluation_id: id,
        criterion_id: item.id,
        label_snapshot: item.label,
        max_score_snapshot: item.max_score,
        score: null,
      });
    await audit(c, actor, 'evaluation.created', 'evaluation', id, {
      type: body.type,
      rubricVersion: latest.version,
    });
    return { id };
  });
}
function complete(scores) {
  assert(
    scores.length > 0 &&
      scores.every(
        (x) =>
          x.score !== null &&
          Number(x.score) >= 0 &&
          Number(x.score) <= Number(x.max_score_snapshot),
      ),
    422,
    'INCOMPLETE_SCORES',
    'Every criterion requires a score within its maximum',
  );
}
async function detail(pool, actor, id) {
  const { e, scores } = await repo.detail(pool, actor, id);
  return { ...e, scores, percentage: grade(scores) };
}
async function edit(pool, actor, id, body) {
  body = schema.edit.parse(body);
  return transaction(pool, async (c) => {
    const { p, e, scores } = await repo.detail(c, actor, id, true);
    assert(p.status === 'active', 409, 'IMMUTABLE_RECORD', 'Placement is closed');
    assert(e.evaluator_id === actor.id, 403, 'FORBIDDEN', 'Only the author can edit draft scores');
    assert(e.status === 'draft', 409, 'IMMUTABLE_RECORD', 'Only draft evaluations can be edited');
    const incoming = new Set();
    for (const item of body.scores) {
      assert(
        !incoming.has(item.criterionId),
        422,
        'DUPLICATE_CRITERION',
        'Criteria may appear only once',
      );
      incoming.add(item.criterionId);
      const old = scores.find((x) => x.criterion_id === item.criterionId);
      assert(old, 422, 'UNKNOWN_CRITERION', 'Criterion is not part of this snapshot');
      assert(
        item.score === null || item.score <= Number(old.max_score_snapshot),
        422,
        'INVALID_SCORE',
        'Score exceeds its maximum',
      );
      await repo.update(c, 'evaluation_scores', old.id, {
        score: item.score,
        remarks: item.remarks || null,
      });
    }
    await repo.update(c, 'evaluations', id, { remarks: body.remarks || null });
    await audit(c, actor, 'evaluation.updated', 'evaluation', id, {
      criterionCount: body.scores.length,
    });
    return detail(c, actor, id);
  });
}
async function action(pool, actor, id, finalize = false) {
  return transaction(pool, async (c) => {
    const { p, e, scores } = await repo.detail(c, actor, id, true);
    assert(p.status === 'active', 409, 'IMMUTABLE_RECORD', 'Placement is closed');
    if (finalize) {
      facultyReviewer(actor, p);
      assert(
        e.status === 'submitted',
        409,
        'INVALID_TRANSITION',
        'Submit the evaluation before finalization',
      );
    } else {
      assert(actor.id === e.evaluator_id, 403, 'FORBIDDEN', 'Only the author can submit');
      assert(
        e.status === 'draft',
        409,
        'INVALID_TRANSITION',
        'Only draft evaluations can be submitted',
      );
    }
    complete(scores);
    await repo.update(
      c,
      'evaluations',
      id,
      finalize
        ? { status: 'finalized', finalized_by: actor.id, finalized_at: new Date() }
        : { status: 'submitted', submitted_at: new Date() },
    );
    await audit(
      c,
      actor,
      finalize ? 'evaluation.finalized' : 'evaluation.submitted',
      'evaluation',
      id,
      { percentage: grade(scores) },
    );
    await notify(
      c,
      finalize ? p.student_user_id : p.faculty_user_id,
      finalize ? 'evaluation.finalized' : 'evaluation.submitted',
      'placement',
      p.id,
      finalize ? 'An evaluation has been published' : 'An evaluation is ready for final review',
    );
    return detail(c, actor, id);
  });
}
module.exports = { create, detail, edit, action, complete };

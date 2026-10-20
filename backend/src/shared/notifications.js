const { insert } = require('./repository');
async function notify(c, recipient, event, type, id, message) {
  if (recipient)
    await insert(c, 'notifications', {
      recipient_id: recipient,
      event_type: event,
      entity_type: type,
      entity_id: id,
      message,
    });
}
module.exports = { notify };

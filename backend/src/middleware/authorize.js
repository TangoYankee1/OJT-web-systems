const { assert } = require('../shared/errors');
function roles(...allowed) {
  return (req, res, next) => {
    assert(
      allowed.includes(req.actor.role),
      403,
      'FORBIDDEN',
      'This action is not available to your role',
    );
    next();
  };
}
module.exports = { roles };

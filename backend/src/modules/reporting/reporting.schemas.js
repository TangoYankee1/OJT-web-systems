const { z, id } = require('../../middleware/validate');
module.exports = { dashboard: z.object({ academicTermId: id.optional() }).strict() };

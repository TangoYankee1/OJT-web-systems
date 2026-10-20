const { z, text, password } = require('../../middleware/validate');
module.exports = {
  login: z
    .object({
      email: z.string().trim().toLowerCase().pipe(z.email()),
      password: z.string().min(1).max(200),
    })
    .strict(),
  change: z.object({ currentPassword: z.string().min(1).max(200), newPassword: password }).strict(),
};

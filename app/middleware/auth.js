'use strict';

module.exports = () => {
  return async (ctx, next) => {
    const user = ctx.session.user;
    if (!user) {
      ctx.status = 401;
    }
    await next();
  };
};

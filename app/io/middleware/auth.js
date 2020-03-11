'use strict';

module.exports = () => {
  return async (ctx, next) => {
    ctx.socket.emit('res', '连接成功auth');
    await next();
  };
};

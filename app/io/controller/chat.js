'use strict';

const Controller = require('egg').Controller;

class ChatController extends Controller {
  async index() {
    this.ctx.socket.emit('msg', 'hello');
  }
  async join() {
    const { ctx } = this;
    const id = ctx.socket.id;
    console.log('socket-id:', id);
    ctx.socket.join('all');
    console.log(ctx.session.user);
    if (ctx.session.user) {
      const userId = ctx.session.user._id;
      await ctx.app.redis.set(userId, id);
    }
  }
  async message() {
    const message = this.ctx.args[0];
    const { userId, msg } = message;
    const user = this.ctx.session.user;
    if (userId === 'groupall') {
      this.ctx.socket.to('all').emit('msg', { ...user, msg });
      return;
    }
    const socketId = await this.ctx.app.redis.get(userId);
    console.dir({ ...message, socketId });
    this.ctx.socket.to(socketId).emit('msg', { ...user, msg });
  }
}

module.exports = ChatController;

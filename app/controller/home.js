'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = 'hi, egg';
  }
  async userInfo() {
    const user = this.ctx.session.user;
    if (user) {
      this.ctx.body = user;
    } else {
      this.ctx.status = 401;
    }
  }
  async join() {
    const { ctx } = this;
    const name = ctx.request.body.name;
    this.ctx.validate({
      name: {
        type: 'string',
        trim: true,
        max: 8,
        min: 1,
        format: /^[\u4e00-\u9fa5a-zA-Z0-9]+$/,
      },
    });
    const user = await ctx.service.user.getUserByName(name);
    if (user) {
      ctx.status = 403;
      ctx.body = {
        msg: '用户已存在',
      };
      return;
    }
    const newUser = await ctx.service.user.createUser(name);
    console.log('join', newUser);
    ctx.session.user = newUser;
    ctx.body = newUser;
  }
  async userList() {
    const { ctx } = this;
    const list = await ctx.service.user.getUsers();
    list.push({
      name: '所有用户',
      _id: 'groupall',
    });
    ctx.body = list;
  }
}

module.exports = HomeController;

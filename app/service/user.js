'use strict';
const Service = require('egg').Service;

class UserService extends Service {
  async getUserByName(name) {
    return await this.ctx.model.User.findOne({ name });
  }
  async createUser(name) {
    return await this.ctx.model.User.create({ name });
  }
  async getUsers() {
    return await this.ctx.model.User.find();
  }
}
module.exports = UserService;

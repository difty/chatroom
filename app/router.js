'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller, io, middleware } = app;
  const auth = middleware.auth();

  router.get('/', controller.home.index);
  router.post('/join', controller.home.join);
  router.get('/list', auth, controller.home.userList);
  router.get('/userInfo', auth, controller.home.userInfo);
  io.of('/').route('message', io.controller.chat.message);
  io.of('/').route('join', io.controller.chat.join);
};

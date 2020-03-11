/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1582529862634_5677';

  // add your middleware config here
  config.middleware = [];

  // add your user config here
  const userConfig = {
    cors: {
      origin: [ 'http://127.0.0.1:3000' ],
      credentials: true,
      allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
    },
    redis: {
      client: {
        port: 6379,
        host: '127.0.0.1',
        password: '',
        db: 0,
      },
    },
    mongoose: {
      client: {
        url: 'mongodb://127.0.0.1/chat',
        options: {}, // 要加这个，不加启动报错？
      },
    },
    io: {
      namespace: {
        '/': {
          connectionMiddleware: [ 'auth' ],
          packetMiddleware: [ 'filter' ],
        },
      },
    },
  };

  return {
    ...config,
    ...userConfig,
  };
};

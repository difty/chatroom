## Node.js 入门 —— 基于 egg.js 和 socket.io 的聊天小应用

初学 node 还是在实战中学的较快，本项目是基于 egg.js，用这个原因是使用 express 和 koa 做了个 blog 的应用，想尝试下 egg.js 而已……

### server 端

首先使用脚手架直接生成项目 `npm init egg --type=simple`，然后在 config 里的 plugin.js 配置需要的插件，这里需要这几个

```js
  cors: {
    enable: true,
    package: 'egg-cors',
  },
  mongoose: {
    enable: true,
    package: 'egg-mongoose',
  },
  redis: {
    enable: true,
    package: 'egg-redis',
  },
  validate: {
    enable: true,
    package: 'egg-validate',
  },
  io: {
    enable: true,
    package: 'egg-socket.io',
  },
```

同时还需要在对每个插件进行配置

```js
const userConfig = {
  cors: {
    origin: ['http://127.0.0.1:3000'],
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
        connectionMiddleware: ['auth'],
        packetMiddleware: ['filter'],
      },
    },
  },
};
```

因为 server 端和 client 都在本地，端口不同，所以会跨域，这里使用 cors 插件来处理跨域请求，可以在配置里增加白名单，实际上该插件就是给响应头加上了 access-control-allow-origin 的头，redis 和 MongoDB 需要自行安装好，这里采用了默认的配置。

egg.js 里使用了比较好的目录结构，我们需要关注的有这么几块：

1. router 即路由信息，一般是用来提供接口给前端，当然这里的插件允许配置 socket 的路由，方便处理 socket 的事件

2. controller 控制器，用来处理逻辑，返回响应

3. service 一般来封装业务逻辑，避免 controller 过重，同时方便复用

4. model 定义数据结构

#### router

```js
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
```

定义 router 的时候一般跟着路径和对应的 controller，你也可以带上其他中间件，比如上面的 auth 就是一个中间件，用来处理用户登录，egg 里都是基于目录结构的，中间件放在目录下就可以直接调用

#### model

model 这里比较简单，就一个用户信息，里面一个用户名和用户 ID，使用 mongoose 来创建 UserModel

```js
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const UserSchema = new Schema({
    name: {
      type: String,
      required: true,
    },
    __v: { type: Number, select: false },
  });
  return mongoose.model('User', UserSchema);
};
```

#### service

这里 service 层只是用来获取用户信息，也比较简单

```js
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
```

使用了 mongoose 的一些方法，把与用户相关的操作集中在一起，方便多处调用

#### Controller

```js
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
```

controller 是整个程序的重点，对照着路由来看，这里分别提供了路由的处理方式，使用 ctx.body 或 ctx.status 就可以处理返回，加入聊天的时候输入用户名，join 方法会通过 validate 来校验是否合法，然后在数据库查询有无该用户名，如果有就返回 403 告诉用户已存在，如果没有，就写入数据库，然后写入 session，egg.js 已经集成了 session 的功能，cookie 里会有 `EGG_SESS` 用来处理，这里是把 session 对象加密后存在 cookie 里。

```js
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
```

对于 socket 的事件，类似于普通 http 路由一样，同样的方式来处理，这里 ctx 对象多了 socket 属性，客户端建立 socket 连接后，会有一个 socket id，通过该 id 来发送消息给对应客户端，`ctx.socket.join('all')` 这里使用这句把建立连接的所有用户都加入到 `all` 这个 room 里，这样可以群聊，这个是 socketIO 的功能。 message 方法用来处理客户端与服务端进行通信，当是群聊时，给在 room 里的所有人发送消息，否则是给单独某个人发送。

服务端就开发完了，虽然很简单，但是还是集成了很多功能，可以在此基础上进行扩展。

### client 端

client 端采用 react，不是重点，所以界面比较简单，着重实现功能

因为 eggjs 开启了防止 csrf 攻击，回在 cookie 里写入一个 csrfToken 的字段，需要每次访问接口的时候读取这个值，添加到 header 里，这里直接使用 axios 来封装一下。

```js
import axios from 'axios';
import Cookies from 'js-cookie';
const instance = axios.create({
  baseURL: 'http://127.0.0.1:7002/',
  withCredentials: true,
});
instance.interceptors.request.use(function(config) {
  const csrfToken = Cookies.get('csrfToken');
  config.headers['x-csrf-token'] = csrfToken;
  return config;
});
export default instance;
```

```js
const initSocket = () => {
  const socket = io('http://127.0.0.1:7002/');
  socket.on('connect', () => {
    const id = socket.id;
    socket.on('msg', handleMsg);
    socket.emit('join');
  });
  socketRef.current = socket;
};
```

这里是建立 socket 连接，监听 msg 事件来接收服务端返回的消息。

整个例子虽然不算复杂，但是麻雀虽小五脏俱全，后续可以在此基础上进一步扩展其他功能。如果需要，可以查看完整[服务端代码](https://github.com/difty/chatroom)，[web 端代码](https://github.com/difty/chat)。

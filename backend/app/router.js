'use strict';

/**
 * 路由主入口 - 分层加载模式
 * @param {Egg.Application} app - egg 实例
 */
module.exports = app => {
  // 1. 加载 B 端管理端路由 (Admin)
  require('./router/admin')(app);

  // 2. 加载 C 端租客端路由 (App)
  require('./router/app')(app);

  // 3. 加载系统公共路由 (Common)
  require('./router/common')(app);
};

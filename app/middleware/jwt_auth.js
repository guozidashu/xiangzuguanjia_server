'use strict';

/**
 * JWT 身份验证中间件
 * @param {Object} options - 中间件配置 (由 config.default.js 传入)
 * @return {Function} middleware
 */
module.exports = options => {
  return async function jwtAuth(ctx, next) {
    // 1. 从 Header 中获取 Token (格式: Authorization: Bearer <token>)
    const token = ctx.header.authorization ? ctx.header.authorization.split(' ')[1] : null;

    if (!token) {
      return ctx.helper.fail(ctx, 401, '未发现身份令牌，请先登录');
    }

    try {
      // 2. 解码并验证 Token
      const decoded = ctx.app.jwt.verify(token, ctx.app.config.jwt.secret);
      
      // 3. 将用户信息挂载到 ctx.state.user，供后续使用
      ctx.state.user = decoded;
      
      // 4. 执行下一个中间件
      await next();
    } catch (err) {
      // Token 过期或非法
      const msg = err.name === 'TokenExpiredError' ? '登录已过期，请重新登录' : '身份验证失败，请重新登录';
      return ctx.helper.fail(ctx, 401, msg);
    }
  };
};

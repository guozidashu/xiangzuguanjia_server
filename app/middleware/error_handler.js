'use strict';

/**
 * 全局错误拦截中间件
 * 捕获所有业务异常与代码错误，并格式化为标准的 JSON 返回。
 */
module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      await next();
    } catch (err) {
      // 1. 触发 Egg 全局错误日志
      ctx.app.emit('error', err, ctx);

      // 2. 提取 HTTP 状态码与异常明细
      const status = err.status || 500;

      // 3. 生产环境脱敏 500 错误
      const message = (status === 500 && ctx.app.config.env === 'prod')
        ? '服务器繁忙，请稍后再试'
        : err.message;

      // 4. 使用统一的 helper.fail 格式返回结果
      // 注意：ctx.helper.fail 会自动设置 ctx.status
      ctx.helper.fail(ctx, status, message, err.errors);
    }
  };
};

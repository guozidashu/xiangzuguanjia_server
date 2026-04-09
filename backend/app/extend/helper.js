'use strict';

module.exports = {
  /**
   * 递归将对象的所有 Key 转换为下划线格式 (Standard Snake Case Converter)
   */
  toSnakeCase(obj) {
    if (Array.isArray(obj)) {
      return obj.map(v => this.toSnakeCase(v));
    } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
      return Object.keys(obj).reduce((result, key) => {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        result[snakeKey] = this.toSnakeCase(obj[key]);
        return result;
      }, {});
    }
    return obj;
  },

  /**
   * 统一成功响应 (Standard Success Response)
   * @param {Object} ctx - Controller context
   * @param {any} data - Result data
   * @param {string} message - User-friendly message
   */
  success(ctx, data = null, message = 'success') {
    ctx.body = {
      code: 200,
      data: this.toSnakeCase(data), // 强制开启下划线转换开关
      message,
    };
    ctx.status = 200;
  },

  /**
   * 统一业务/系统失败响应 (Standard Failure Response)
   * @param {Object} ctx - Controller context
   * @param {number} code - Business error code or HTTP status
   * @param {string} message - Error reason
   * @param {any} errors - Detailed validation errors
   */
  fail(ctx, code = 500, message = 'Internal Server Error', errors = null) {
    ctx.body = {
      code,
      message,
      ...(errors ? { errors } : {}),
    };
    ctx.status = code;
  },
};

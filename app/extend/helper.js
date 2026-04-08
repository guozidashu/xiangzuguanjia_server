'use strict';

module.exports = {
  /**
   * 统一成功响应 (Standard Success Response)
   * @param {Object} ctx - Controller context
   * @param {any} data - Result data
   * @param {string} message - User-friendly message
   */
  success(ctx, data = null, message = 'success') {
    ctx.body = {
      code: 200,
      data,
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

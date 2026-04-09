'use strict';

const Controller = require('egg').Controller;

class AuthController extends Controller {
  /**
   * 租客手机号注册 (POST /api/app/auth/register)
   */
  async register() {
    const { ctx, service } = this;
    const { phone, password, source } = ctx.request.body;

    const rules = {
      phone: 'string',
      password: 'string',
      source: 'number?',
    };

    try {
      ctx.validate(rules, ctx.request.body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '注册参数校验失败', err.errors);
    }

    const result = await service.app.auth.registerByPhone({ phone, password, source });
    ctx.helper.success(ctx, result, '注册成功');
  }

  /**
   * 租客账号密码登录 (POST /api/app/auth/login)
   */
  async login() {
    const { ctx, service } = this;
    const { phone, password } = ctx.request.body;

    if (!phone || !password) return ctx.helper.fail(ctx, 400, '手机号与密码不能为空');

    const result = await service.app.auth.loginByPassword(phone, password);
    ctx.helper.success(ctx, result, '登录成功');
  }

  /**
   * 微信小程序登录 (POST /api/app/auth/wx_mp_login)
   */
  async wxMpLogin() {
    const { ctx, service } = this;
    const { code } = ctx.request.body;

    if (!code) return ctx.helper.fail(ctx, 400, '缺少小程序授权 Code');

    const result = await service.app.auth.loginByWechatMini(code);
    ctx.helper.success(ctx, result, '小程序授权登录成功');
  }

  /**
   * 微信公众号授权登录 (POST /api/app/auth/wx_oa_login)
   */
  async wxOaLogin() {
    const { ctx, service } = this;
    const { code } = ctx.request.body;

    if (!code) return ctx.helper.fail(ctx, 400, '缺少公众号授权 Code');

    const result = await service.app.auth.loginByWechatOA(code);
    ctx.helper.success(ctx, result, '公众号授权登录成功');
  }
}

module.exports = AuthController;

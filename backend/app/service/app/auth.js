'use strict';

const Service = require('egg').Service;

class AuthService extends Service {
  /**
   * 租客手机号注册
   * @param {Object} payload - { phone, password, source }
   */
  async registerByPhone(payload) {
    const { ctx, app } = this;
    const { phone, password, source = 1 } = payload;

    // 1. 检查手机号是否已存在
    const exists = await ctx.model.TenantUser.findOne({ where: { phone } });
    if (exists) ctx.throw(422, '该手机号已注册，请直接登录');

    // 2. 密码哈希加密
    const passwordHash = await ctx.genHash(password);

    // 3. 创建账号
    const user = await ctx.model.TenantUser.create({
      phone,
      password_hash: passwordHash,
      register_source: source,
      status: 1,
    });

    return this._createToken(user);
  }

  /**
   * 租客账号密码登录
   * @param {String} phone - 手机号
   * @param {String} password - 明文密码
   */
  async loginByPassword(phone, password) {
    const { ctx } = this;
    
    const user = await ctx.model.TenantUser.findOne({ where: { phone } });
    if (!user) ctx.throw(401, '用户不存在');
    if (user.status !== 1) ctx.throw(403, '账号已冻结');

    const isMatch = await ctx.compareHash(password, user.password_hash);
    if (!isMatch) ctx.throw(401, '手机号或密码错误');

    // 更新最后登录时间
    await user.update({ last_login_time: new Date() });

    return this._createToken(user);
  }

  /**
   * 微信小程序登录 (Code 换取 Session)
   * @param {String} code - 小程序登录 code
   */
  async loginByWechatMini(code) {
    const { ctx, app } = this;
    
    // 1. 请求微信服务器 (此处为逻辑示意，需配置 appid 和 secret)
    // const { openid, unionid } = await this._getWxSession(code);
    const mockWxResult = { openid: `mock_openid_${code}`, unionid: `mock_unionid_${code}` };
    const { openid, unionid } = mockWxResult;

    // 2. 查找或创建租客账号
    let user = await ctx.model.TenantUser.findOne({
      where: { [app.Sequelize.Op.or]: [{ openid }, { union_id: unionid }] },
    });

    if (!user) {
      user = await ctx.model.TenantUser.create({
        openid,
        union_id: unionid,
        register_source: 1, // 小程序
        status: 1,
      });
    }

    await user.update({ last_login_time: new Date() });

    return this._createToken(user);
  }

  /**
   * 微信公众号登录 (OAuth2 Code 换取用户信息)
   */
  async loginByWechatOA(code) {
    const { ctx } = this;
    // 逻辑类同小程序，通常通过 union_id 实现多端身份统一
    const mockOAResult = { openid: `oa_openid_${code}`, unionid: `mock_unionid_global` };
    const { openid, unionid } = mockOAResult;

    let user = await ctx.model.TenantUser.findOne({ where: { union_id: unionid } });
    
    if (!user) {
      user = await ctx.model.TenantUser.create({
        union_id: unionid,
        register_source: 3, // 公众号
        status: 1,
      });
    }

    return this._createToken(user);
  }

  /**
   * 生成租客端专用 JWT Token
   * @private
   */
  _createToken(user) {
    const { app } = this;
    const token = app.jwt.sign({
      uid: user.id,
      identity: 'tenant', // 标识为租客端身份
    }, app.config.jwt.secret, { expiresIn: '7d' });

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    };
  }
}

module.exports = AuthService;

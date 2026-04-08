'use strict';

const Controller = require('egg').Controller;

class AuthController extends Controller {
  /**
   * B 端员工登录
   * POST /api/v1/auth/login
   */
  async login() {
    const { ctx, app } = this;
    const { phone, password } = ctx.request.body;

    // 1. 查询员工 (及所属机构)
    const staff = await ctx.model.OrgStaff.findOne({
      where: { phone, status: 1 },
      include: [{ model: ctx.model.Org, as: 'organization' }],
    });

    if (!staff) {
      return ctx.helper.fail(ctx, 401, '用户不存在或已被禁用');
    }

    // 2. 验证密码 (实际生产应使用 bcrypt.compare)
    const isMatch = (password === staff.password_hash);
    if (!isMatch) {
      return ctx.helper.fail(ctx, 401, '用户名、密码错误或账号状态异常');
    }

    // 3. 签发 Token (载荷包含身份标识 + 租户隔离ID)
    const token = app.jwt.sign({
      uid: staff.id,
      orgId: staff.org_id,
    }, app.config.jwt.secret);

    ctx.helper.success(ctx, {
      token,
      staff: {
        name: staff.name,
        role: staff.role_name,
        orgName: staff.organization.name,
      },
    }, '登录成功');
  }

  /**
   * 获取当前登录人员信息
   * POST /api/v1/auth/info
   */
  async info() {
    const { ctx } = this;
    const staff = await ctx.model.OrgStaff.findByPk(ctx.state.user.uid, {
      attributes: ['id', 'name', 'phone', 'role_name'],
      include: [{ model: ctx.model.Org, as: 'organization', attributes: ['name', 'logo'] }],
    });

    if (!staff) {
      return ctx.helper.fail(ctx, 404, '用户信息不存在');
    }

    ctx.helper.success(ctx, staff);
  }
}

module.exports = AuthController;

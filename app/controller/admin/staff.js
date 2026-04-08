'use strict';

const Controller = require('egg').Controller;

class StaffController extends Controller {
  /**
   * 分页获取员工列表 (POST /api/v1/staffs/list)
   */
  async index() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    
    const result = await service.admin.staff.list(body);
    
    ctx.helper.success(ctx, result, '员工列表查询成功');
  }

  /**
   * 创建员工账号 (POST /api/v1/staffs/create)
   */
  async create() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      name: 'string',
      phone: 'string',
      role_name: 'string?',
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '参数缺失或格式有误', err.errors);
    }

    const staff = await service.admin.staff.create(body);
    ctx.helper.success(ctx, staff, '员工账号已创建');
  }

  /**
   * 更新员工信息 (POST /api/v1/staffs/update)
   */
  async update() {
    const { ctx, service } = this;
    const { id, ...data } = ctx.request.body;

    if (!id) return ctx.helper.fail(ctx, 400, '缺少 ID');

    const result = await service.admin.staff.update(id, data);
    ctx.helper.success(ctx, result, '员工信息已更新');
  }

  /**
   * 指派功能权限码集合 (POST /api/v1/staffs/set_permissions)
   */
  async setPermissions() {
    const { ctx, service } = this;
    const { staffId, permissionCodes } = ctx.request.body;

    if (!staffId || !Array.isArray(permissionCodes)) {
      return ctx.helper.fail(ctx, 400, '参数错误，权限码需为阵列');
    }

    const result = await service.admin.staff.setPermissions(staffId, permissionCodes);
    ctx.helper.success(ctx, result, '功能权限点指派成功');
  }
}

module.exports = StaffController;

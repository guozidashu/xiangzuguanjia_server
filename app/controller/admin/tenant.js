'use strict';

const Controller = require('egg').Controller;

class TenantController extends Controller {
  /**
   * 租客列表 (POST /api/v1/admin/tenants/list)
   */
  async index() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const result = await service.admin.tenant.list(body);
    ctx.helper.success(ctx, result);
  }

  /**
   * 租客详情 (POST /api/v1/admin/tenants/detail)
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.request.body;
    if (!id) return ctx.helper.fail(ctx, 400, '缺少租客 ID');

    const result = await service.admin.tenant.detail(id);
    ctx.helper.success(ctx, result);
  }

  /**
   * 更新租客资料 (POST /api/v1/admin/tenants/update)
   */
  async update() {
    const { ctx, service } = this;
    const { id, ...data } = ctx.request.body;
    if (!id) return ctx.helper.fail(ctx, 400, '缺少租客 ID');

    const result = await service.admin.tenant.update(id, data);
    ctx.helper.success(ctx, result, '资料已更新');
  }

  /**
   * 禁用/删除租客 (POST /api/v1/admin/tenants/delete)
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.request.body;
    if (!id) return ctx.helper.fail(ctx, 400, '缺少租客 ID');

    await service.admin.tenant.delete(id);
    ctx.helper.success(ctx, null, '租客已禁用');
  }
}

module.exports = TenantController;

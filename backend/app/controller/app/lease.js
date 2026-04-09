'use strict';

const Controller = require('egg').Controller;

class LeaseController extends Controller {
  /**
   * 我的租约列表 (跨机构聚合) (POST /api/app/leases/list)
   */
  async index() {
    const { ctx, service } = this;
    const list = await service.app.lease.myLeases();
    ctx.helper.success(ctx, list, '我的合同查询成功');
  }

  /**
   * 租约详情 (POST /api/app/leases/detail)
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.request.body;

    if (!id) return ctx.helper.fail(ctx, 400, '缺少租约 ID');

    const lease = await service.app.lease.detail(id);
    ctx.helper.success(ctx, lease);
  }
}

module.exports = LeaseController;

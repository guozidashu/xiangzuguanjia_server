'use strict';

const Controller = require('egg').Controller;

class SupportController extends Controller {
  /**
   * 租客发起在线报修 (POST /api/app/support/work-orders/create)
   */
  async createWorkOrder() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      lease_id: 'number',
      title: 'string',
      description: 'string',
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '报修参数校验失败', err.errors);
    }

    const record = await service.app.support.createWorkOrder(body);
    ctx.helper.success(ctx, record, '报修工单已提交');
  }

  /**
   * 我的工单列表 (POST /api/app/support/work-orders/list)
   */
  async index() {
    const { ctx, service } = this;
    const list = await service.app.support.myWorkOrders();
    ctx.helper.success(ctx, list);
  }
}

module.exports = SupportController;

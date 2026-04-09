'use strict';

const Controller = require('egg').Controller;

class SupportController extends Controller {
  /**
   * 提交退房结算申请 (POST /api/v1/support/checkouts)
   */
  async applyCheckout() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      lease_id: 'number',
      checkout_date: 'string',
      penalty_amount: 'number?',
      damage_amount: 'number?',
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '参数校验异常', err.errors);
    }

    const checkout = await service.admin.support.applyCheckout(body);

    ctx.helper.success(ctx, checkout, '退租结算处理成功');
  }

  /**
   * 创建维修工单 (POST /api/v1/support/work-orders)
   */
  async createWorkOrder() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      room_id: 'number',
      title: 'string',
      description: 'string',
      urgency_level: 'number?',
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '参数校验异常', err.errors);
    }

    const order = await service.admin.support.createWorkOrder(body);

    ctx.helper.success(ctx, order, '工单创建成功');
  }
}

module.exports = SupportController;

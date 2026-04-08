'use strict';

const Controller = require('egg').Controller;

class FinancialController extends Controller {
  /**
   * 我的账单列表 (跨机构聚合) (POST /api/app/bills/list)
   */
  async index() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    
    const bills = await service.app.financial.myBills(body);
    ctx.helper.success(ctx, bills, '查询成功');
  }

  /**
   * 账单详情 (POST /api/app/bills/detail)
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.request.body;

    if (!id) return ctx.helper.fail(ctx, 400, '缺少账单 ID');

    const bill = await service.app.financial.detail(id);
    ctx.helper.success(ctx, bill);
  }

  /**
   * 获取账单可用的支付方式 (POST /api/app/bills/payment_methods)
   */
  async listMethods() {
    const { ctx, service } = this;
    const { id } = ctx.request.body;
    if (!id) return ctx.helper.fail(ctx, 400, '缺少账单 ID');

    const methods = await service.app.financial.listAvailableMethods(id);
    ctx.helper.success(ctx, methods);
  }

  /**
   * 发起支付 (微信服务商模式) (POST /api/app/bills/pay)
   */
  async pay() {
    const { ctx, service } = this;
    const { id, account_id } = ctx.request.body;

    if (!id || !account_id) return ctx.helper.fail(ctx, 400, '缺少参数');

    const result = await service.app.financial.preparePayment(id, account_id);
    ctx.helper.success(ctx, result, '微信下单成功');
  }
}

module.exports = FinancialController;

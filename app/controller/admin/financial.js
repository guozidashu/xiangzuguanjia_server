'use strict';

const Controller = require('egg').Controller;

class FinancialController extends Controller {
  /**
   * 确认收款核销 (POST /api/v1/financial/collect)
   */
  async collectPayment() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      paymentAccountId: 'number',
      amount: 'number',
      billIds: 'array',
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '参数校验异常', err.errors);
    }

    const result = await service.admin.financial.collectPayment(body);
    ctx.helper.success(ctx, result, '收款并核销成功');
  }

  /**
   * 查看租约对账单 (POST /api/v1/leases/ledger)
   */
  async getLeaseLedger() {
    const { ctx, service } = this;
    const { leaseId } = ctx.request.body;

    if (!leaseId) return ctx.helper.fail(ctx, 400, '缺少租约 ID');

    const ledger = await service.admin.financial.getLeaseLedger(leaseId);
    ctx.helper.success(ctx, ledger);
  }

  /**
   * 手动创建账单 (POST /api/v1/financial/bills/create)
   */
  async createManualBill() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      lease_id: 'number',
      room_id: 'number',
      bill_type: 'number',
      amount_due: 'number',
      due_date: 'string',
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '必填字段缺失', err.errors);
    }

    const bill = await service.admin.financial.createManualBill(body);
    ctx.helper.success(ctx, bill, '账单登记成功');
  }

  /**
   * 调整账单金额 (POST /api/v1/financial/bills/modify)
   */
  async modifyBillAmount() {
    const { ctx, service } = this;
    const { id, amount } = ctx.request.body;

    if (!id || amount === undefined) return ctx.helper.fail(ctx, 400, '参数不全');

    const result = await service.admin.financial.modifyBillAmount(id, amount);
    ctx.helper.success(ctx, result, '账单金额已修正');
  }

  /**
   * 账单拆分 (POST /api/v1/financial/bills/split)
   */
  async splitBill() {
    const { ctx, service } = this;
    const { id, splits } = ctx.request.body;

    if (!id || !Array.isArray(splits)) return ctx.helper.fail(ctx, 400, '参数错误');

    const result = await service.admin.financial.splitBill(id, splits);
    ctx.helper.success(ctx, result, '账单拆分成功');
  }

  /**
   * 账单延期 (POST /api/v1/financial/bills/extend)
   */
  async extendBill() {
    const { ctx, service } = this;
    const { id, newDate } = ctx.request.body;

    if (!id || !newDate) return ctx.helper.fail(ctx, 400, '参数不全');

    const result = await service.admin.financial.extendDueDate(id, newDate);
    ctx.helper.success(ctx, result, '账单还款期限已调整');
  }

  /**
   * 账单列表 (POST /api/v1/bills/list)
   */
  async index() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const result = await service.admin.financial.list(body);
    ctx.helper.success(ctx, result);
  }

  /**
   * 账户收款汇总统计 (POST /api/v1/financial/accounts/stats)
   */
  async accountStats() {
    const { ctx, service } = this;
    const result = await service.admin.financial.getAccountStats();
    ctx.helper.success(ctx, result);
  }

  /**
   * 资金流水明细列表 (POST /api/v1/financial/transactions/list)
   */
  async transactionList() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const result = await service.admin.financial.listTransactions(body);
    ctx.helper.success(ctx, result);
  }

  /**
   * 押金台账库 (POST /api/v1/financial/deposits/list)
   */
  async depositList() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const result = await service.admin.financial.listDeposits(body);
    ctx.helper.success(ctx, result);
  }

  /**
   * 手动调整押金 (POST /api/v1/financial/deposits/adjust)
   */
  async adjustDeposit() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      depositId: 'number',
      amount: 'number',
      type: [ 'add', 'deduct' ],
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '参数不全或格式错误', err.errors);
    }

    const result = await service.admin.financial.adjustDeposit(body);
    ctx.helper.success(ctx, result, '押金调整成功');
  }
}

module.exports = FinancialController;

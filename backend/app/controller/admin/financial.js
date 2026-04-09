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
      payment_account_id: 'number',
      amount: 'number',
      bill_ids: 'array',
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
    const { lease_id } = ctx.request.body;

    if (!lease_id) return ctx.helper.fail(ctx, 400, '缺少租约 ID');

    const ledger = await service.admin.financial.getLeaseLedger(lease_id);
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
    const { id, new_date } = ctx.request.body;

    if (!id || !new_date) return ctx.helper.fail(ctx, 400, '参数不全');

    const result = await service.admin.financial.extendDueDate(id, new_date);
    ctx.helper.success(ctx, result, '账单还款期限已调整');
  }

  /**
   * 账单列表 (POST /api/v1/bills/list)
   */
  async index() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const params = {
      page: body.page || 1,
      page_size: body.page_size || 10,
      lease_id: body.lease_id,
      room_id: body.room_id,
      status: body.status,
      bill_type: body.bill_type,
    };

    const result = await service.admin.financial.list(params);
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

    const params = {
      page: body.page || 1,
      page_size: body.page_size || 10,
      account_id: body.account_id,
      bill_id: body.bill_id,
    };

    const result = await service.admin.financial.listTransactions(params);
    ctx.helper.success(ctx, result);
  }

  /**
   * 押金台账库 (POST /api/v1/financial/deposits/list)
   */
  async depositList() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const params = {
      page: body.page || 1,
      page_size: body.page_size || 10,
      lease_id: body.lease_id,
      status: body.status,
    };

    const result = await service.admin.financial.listDeposits(params);
    ctx.helper.success(ctx, result);
  }

  /**
   * 手动调整押金 (POST /api/v1/financial/deposits/adjust)
   */
  async adjustDeposit() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      deposit_id: 'number',
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

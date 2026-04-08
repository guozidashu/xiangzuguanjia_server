'use strict';

const Service = require('egg').Service;
const dayjs = require('dayjs');

class FinancialService extends Service {
  /**
   * 为租约生成初始账单与押金本
   * @param {Object} lease - 租约实例
   * @param {Object} t - 事务实例
   */
  async createLeaseInitialLedger(lease, t) {
    const { ctx } = this;

    // 1. 生成押金记录 (押金本)
    // 默认按照 押1 逻辑，实际可扩展从 payload 传参与 room.rent_price
    await ctx.model.LeaseDeposit.create({
      org_id: lease.org_id,
      lease_id: lease.id,
      tenant_id: lease.tenant_id,
      deposit_type: 1, // 房屋押金
      amount_expected: lease.rent_price,
      status: 0,
    }, { transaction: t });

    // 2. 生成对应的押金账单 (待支付账单)
    await ctx.model.Bill.create({
      org_id: lease.org_id,
      lease_id: lease.id,
      tenant_id: lease.tenant_id,
      room_id: lease.room_id,
      bill_type: 2, // 押金科目
      bill_period: '签署押金',
      amount_due: lease.rent_price,
      due_date: lease.start_date,
      status: 0,
    }, { transaction: t });

    // 3. 生成首期租金账单
    await ctx.model.Bill.create({
      org_id: lease.org_id,
      lease_id: lease.id,
      tenant_id: lease.tenant_id,
      room_id: lease.room_id,
      bill_type: 1, // 租金科目
      bill_period: dayjs(lease.start_date).format('YYYY-MM'),
      amount_due: lease.rent_price,
      due_date: lease.start_date,
      status: 0,
    }, { transaction: t });
  }

  /**
   * 确认线下收款并核销账单 (Payment Reconciliation)
   * @param {Object} params - { paymentAccountId, amount, billIds, tradeTime, remark }
   */
  async collectPayment(params) {
    const { ctx } = this;
    const { orgId } = ctx;
    const { paymentAccountId, amount, billIds, tradeTime, remark } = params;

    return await ctx.model.transaction(async t => {
      // 1. 获取收款账户信息计算手续费
      const account = await ctx.model.PaymentAccount.findOne({
        where: { id: paymentAccountId, org_id: orgId },
        transaction: t,
      });

      if (!account) ctx.throw(404, '收款账户不存在');

      const fee = (amount * account.fee_rate).toFixed(2);
      const netAmount = (amount - fee).toFixed(2);

      // 2. 创建资金流水记录 (资金归集)
      const record = await ctx.model.PaymentRecord.create({
        org_id: orgId,
        trade_type: 1, // 进账
        payment_account_id: paymentAccountId,
        amount,
        handling_fee: fee,
        net_amount: netAmount,
        related_bill_ids: billIds.join(','),
        trade_no: `OFFLINE_${dayjs().valueOf()}`,
        trade_time: tradeTime || new Date(),
        operator_id: ctx.state.user.uid,
        remark,
      }, { transaction: t });

      // 3. 逐个核销账单 (简易全额核销逻辑)
      for (const billId of billIds) {
        const bill = await ctx.model.Bill.findOne({
          where: { id: billId, org_id: orgId },
          transaction: t,
        });

        if (bill && bill.status !== 2) {
          await bill.update({
            amount_paid: bill.amount_due,
            status: 2, // 已结清
            paid_time: record.trade_time,
          }, { transaction: t });

          // 如果是押金账单，同步更新押金本状态
          if (bill.bill_type === 2) {
            await ctx.model.LeaseDeposit.update(
              { amount_paid: bill.amount_due, status: 1 },
              { where: { lease_id: bill.lease_id, org_id: orgId }, transaction: t }
            );
          }
        }
      }

      return record;
    });
  }

  /**
   * 获取租约的一览式账本 (Ledger)
   */
  async getLeaseLedger(leaseId) {
    const { ctx } = this;
    const [ bills, deposits ] = await Promise.all([
      ctx.model.Bill.findAll({ where: { lease_id: leaseId, org_id: ctx.orgId } }),
      ctx.model.LeaseDeposit.findAll({ where: { lease_id: leaseId, org_id: ctx.orgId } }),
    ]);

    return { bills, deposits };
  }

  /**
   * 手动创建账单 (Manual Billing)
   */
  async createManualBill(params) {
    const { ctx } = this;
    const { orgId } = ctx;
    
    return await ctx.model.Bill.create({
      ...params,
      org_id: orgId,
      status: 0,
    });
  }

  /**
   * 修改账单金额 (仅限未支付状态)
   */
  async modifyBillAmount(billId, newAmount) {
    const { ctx } = this;
    const bill = await ctx.model.Bill.findOne({
      where: { id: billId, org_id: ctx.orgId },
    });

    if (!bill || bill.status !== 0) {
      ctx.throw(422, '账单不存在或已进入支付流程，无法修改金额');
    }

    return await bill.update({ amount_due: newAmount });
  }

  /**
   * 账单延期 (修改应付日期)
   */
  async extendDueDate(billId, newDate) {
    const { ctx } = this;
    const bill = await ctx.model.Bill.findOne({
      where: { id: billId, org_id: ctx.orgId },
    });

    if (!bill) ctx.throw(404, '账单不存在');
    
    return await bill.update({ due_date: newDate });
  }

  /**
   * 拆分账单 (Split Bill)
   * @param {Number} billId - 原账单ID
   * @param {Array} splits - [{ amount: 100, due_date: '...' }, ...]
   */
  async splitBill(billId, splits) {
    const { ctx } = this;
    const { orgId } = ctx;

    return await ctx.model.transaction(async t => {
      const originalBill = await ctx.model.Bill.findOne({
        where: { id: billId, org_id: orgId },
        transaction: t,
      });

      if (!originalBill || originalBill.status !== 0) {
        ctx.throw(422, '原账单不存在或不可拆分');
      }

      const totalSplit = splits.reduce((sum, item) => sum + Number(item.amount), 0);
      if (Math.abs(totalSplit - originalBill.amount_due) > 0.01) {
        ctx.throw(422, '拆分总额不等于原账单金额');
      }

      // 1. 创建子账单
      for (const part of splits) {
        await ctx.model.Bill.create({
          org_id: orgId,
          lease_id: originalBill.lease_id,
          tenant_id: originalBill.tenant_id,
          room_id: originalBill.room_id,
          bill_type: originalBill.bill_type,
          bill_period: `${originalBill.bill_period}(拆)`,
          amount_due: part.amount,
          due_date: part.due_date || originalBill.due_date,
          remark: `由账单 [${billId}] 拆分生成`,
          status: 0,
        }, { transaction: t });
      }

      // 2. 作废原账单
      return await originalBill.update({ status: 3, remark: '已拆分作废' }, { transaction: t });
    });
  }

  /**
   * 账单列表 (Admin)
   * @param {Object} params - { page, pageSize, status, billType, tenantId, roomId }
   */
  async list(params) {
    const { ctx, app } = this;
    const { orgId } = ctx;
    const { page = 1, pageSize = 10, status, billType, tenantId, roomId } = params;
    const today = dayjs().startOf('day').toDate();

    const where = { org_id: orgId };
    if (status !== undefined) where.status = status;
    if (billType !== undefined) where.bill_type = billType;
    if (tenantId) where.tenant_id = tenantId;
    if (roomId) where.room_id = roomId;

    const { rows, count } = await ctx.model.Bill.findAndCountAll({
      where,
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize),
      include: [
        { model: ctx.model.Tenant, as: 'tenant', attributes: [ 'name', 'phone' ] },
        { model: ctx.model.Room, as: 'room', include: [{ model: ctx.model.Project, as: 'project' }] },
      ],
      order: [[ 'due_date', 'ASC' ], [ 'created_at', 'DESC' ]],
    });

    // 动态计算逾期状态
    const list = rows.map(bill => {
      const b = bill.toJSON();
      b.is_overdue = b.status === 0 && dayjs(b.due_date).isBefore(dayjs());
      return b;
    });

    return { list, total: count, page, pageSize };
  }

  /**
   * 获取各收款账户的资金汇总统计 (Admin)
   */
  async getAccountStats() {
    const { ctx, app } = this;
    const { orgId } = ctx;

    // 1. 获取所有配置的账户
    const accounts = await ctx.model.PaymentAccount.findAll({
      where: { org_id: orgId },
    });

    // 2. 统计每个账户的流水总额 (进账累加)
    const stats = await ctx.model.PaymentRecord.findAll({
      where: { 
        org_id: orgId,
        trade_type: 1, // 仅统计进账
        payment_account_id: { [app.Sequelize.Op.ne]: null }
      },
      attributes: [
        'payment_account_id',
        [ app.Sequelize.fn('SUM', app.Sequelize.col('amount')), 'total_amount' ],
        [ app.Sequelize.fn('SUM', app.Sequelize.col('net_amount')), 'total_net_amount' ],
        [ app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'trade_count' ]
      ],
      group: [ 'payment_account_id' ],
    });

    // 3. 组合数据
    return accounts.map(acc => {
      const stat = stats.find(s => s.payment_account_id === acc.id);
      return {
        id: acc.id,
        account_name: acc.account_name,
        account_type: acc.account_type,
        provider: acc.provider,
        total_amount: stat ? parseFloat(stat.get('total_amount')) : 0,
        total_net_amount: stat ? parseFloat(stat.get('total_net_amount')) : 0,
        trade_count: stat ? parseInt(stat.get('trade_count')) : 0,
      };
    });
  }

  /**
   * 资金流水明细列表 (Admin)
   * @param {Object} params - { page, pageSize, payment_account_id, trade_type, startDate, endDate }
   */
  async listTransactions(params) {
    const { ctx, app } = this;
    const { orgId } = ctx;
    const { page = 1, pageSize = 10, payment_account_id, trade_type, startDate, endDate } = params;
    const { Op } = app.Sequelize;

    const where = { org_id: orgId };
    if (payment_account_id) where.payment_account_id = payment_account_id;
    if (trade_type) where.trade_type = trade_type;
    
    if (startDate || endDate) {
      where.trade_time = {};
      if (startDate) where.trade_time[Op.gte] = startDate;
      if (endDate) where.trade_time[Op.lte] = endDate;
    }

    const { rows, count } = await ctx.model.PaymentRecord.findAndCountAll({
      where,
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize),
      include: [
        { model: ctx.model.PaymentAccount, as: 'account', attributes: [ 'account_name' ] },
        { model: ctx.model.OrgStaff, as: 'operator', attributes: [ 'name' ] },
      ],
      order: [[ 'trade_time', 'DESC' ], [ 'created_at', 'DESC' ]],
    });

    return { list: rows, total: count, page, pageSize };
  }

  /**
   * 押金台账列表 (Admin)
   * @param {Object} params - { page, pageSize, tenantName, roomNumber, status, depositType }
   */
  async listDeposits(params) {
    const { ctx, app } = this;
    const { orgId } = ctx;
    const { page = 1, pageSize = 10, tenantName, roomNumber, status, depositType } = params;
    const { Op } = app.Sequelize;

    const where = { org_id: orgId };
    if (status !== undefined) where.status = status;
    if (depositType !== undefined) where.deposit_type = depositType;

    const tenantWhere = {};
    if (tenantName) tenantWhere.name = { [Op.like]: `%${tenantName}%` };

    const leaseWhere = {};
    if (roomNumber) {
      leaseWhere['$lease.room.room_number$'] = { [Op.like]: `%${roomNumber}%` };
    }

    const { rows, count } = await ctx.model.LeaseDeposit.findAndCountAll({
      where,
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize),
      include: [
        { 
          model: ctx.model.Tenant, 
          as: 'tenant', 
          where: Object.keys(tenantWhere).length > 0 ? tenantWhere : undefined,
          attributes: [ 'name', 'phone' ] 
        },
        { 
          model: ctx.model.Lease, 
          as: 'lease',
          include: [
            { model: ctx.model.Room, as: 'room', attributes: [ 'room_number' ] }
          ]
        },
      ],
      order: [[ 'created_at', 'DESC' ]],
    });

    return { list: rows, total: count, page, pageSize };
  }

  /**
   * 调整押金本 (Admin)
   * @param {Object} params - { depositId, amount, type, remark } 
   * type: add/deduct
   */
  async adjustDeposit(params) {
    const { ctx } = this;
    const { orgId } = ctx;
    const { depositId, amount, type, remark } = params;

    return await ctx.model.transaction(async t => {
      const deposit = await ctx.model.LeaseDeposit.findOne({
        where: { id: depositId, org_id: orgId },
        transaction: t,
      });

      if (!deposit) ctx.throw(404, '押金记录不存在');

      const oldPaid = parseFloat(deposit.amount_paid);
      const oldDeducted = parseFloat(deposit.amount_deducted);
      const changeVal = parseFloat(amount);

      if (type === 'deduct') {
        // 扣除押金
        const newDeducted = oldDeducted + changeVal;
        const newStatus = (oldPaid - newDeducted <= 0) ? 3 : 2; // 3-结清, 2-部分抵扣
        await deposit.update({
          amount_deducted: newDeducted,
          status: newStatus,
          remark: remark || `手动扣除: ${changeVal}`,
        }, { transaction: t });
      } else if (type === 'add') {
        // 手动补加实收
        const newPaid = oldPaid + changeVal;
        const newStatus = (newPaid >= deposit.amount_expected) ? 1 : deposit.status;
        await deposit.update({
          amount_paid: newPaid,
          status: newStatus,
          remark: remark || `手动补收: ${changeVal}`,
        }, { transaction: t });
      }

      return deposit;
    });
  }
}

module.exports = FinancialService;

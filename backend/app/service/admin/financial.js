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
   * @param {Object} params - { payment_account_id, amount, bill_ids, trade_time, remark }
   */
  async collectPayment(params) {
    const { ctx } = this;
    const { org_id } = ctx;
    const { payment_account_id, amount, bill_ids, trade_time, remark } = params;

    return await ctx.model.transaction(async t => {
      // 1. 获取收款账户信息计算手续费
      const account = await ctx.model.PaymentAccount.findOne({
        where: { id: payment_account_id, org_id },
        transaction: t,
      });

      if (!account) ctx.throw(404, '收款账户不存在');

      const fee = (amount * account.fee_rate).toFixed(2);
      const net_amount = (amount - fee).toFixed(2);

      // 2. 创建资金流水记录 (资金归集)
      const record = await ctx.model.PaymentRecord.create({
        org_id,
        trade_type: 1, // 进账
        payment_account_id,
        amount,
        handling_fee: fee,
        net_amount,
        related_bill_ids: bill_ids.join(','),
        trade_no: `OFFLINE_${dayjs().valueOf()}`,
        trade_time: trade_time || new Date(),
        operator_id: ctx.state.user.uid,
        remark,
      }, { transaction: t });

      // 3. 逐个核销账单 (简易全额核销逻辑)
      for (const bill_id of bill_ids) {
        const bill = await ctx.model.Bill.findOne({
          where: { id: bill_id, org_id },
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
              { where: { lease_id: bill.lease_id, org_id }, transaction: t }
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
  async getLeaseLedger(lease_id) {
    const { ctx } = this;
    const [ bills, deposits ] = await Promise.all([
      ctx.model.Bill.findAll({ where: { lease_id, org_id: ctx.org_id } }),
      ctx.model.LeaseDeposit.findAll({ where: { lease_id, org_id: ctx.org_id } }),
    ]);

    return { bills, deposits };
  }

  /**
   * 手动创建账单 (Manual Billing)
   */
  async createManualBill(params) {
    const { ctx } = this;
    const { org_id } = ctx;
    
    return await ctx.model.Bill.create({
      ...params,
      org_id,
      status: 0,
    });
  }

  /**
   * 修改账单金额 (仅限未支付状态)
   */
  async modifyBillAmount(bill_id, new_amount) {
    const { ctx } = this;
    const bill = await ctx.model.Bill.findOne({
      where: { id: bill_id, org_id: ctx.org_id },
    });

    if (!bill || bill.status !== 0) {
      ctx.throw(422, '账单不存在或已进入支付流程，无法修改金额');
    }

    return await bill.update({ amount_due: new_amount });
  }

  /**
   * 账单延期 (修改应付日期)
   */
  async extendDueDate(bill_id, new_date) {
    const { ctx } = this;
    const bill = await ctx.model.Bill.findOne({
      where: { id: bill_id, org_id: ctx.org_id },
    });

    if (!bill) ctx.throw(404, '账单不存在');
    
    return await bill.update({ due_date: new_date });
  }

  /**
   * 拆分账单 (Split Bill)
   * @param {Number} bill_id - 原账单ID
   * @param {Array} splits - [{ amount: 100, due_date: '...' }, ...]
   */
  async splitBill(bill_id, splits) {
    const { ctx } = this;
    const { org_id } = ctx;

    return await ctx.model.transaction(async t => {
      const original_bill = await ctx.model.Bill.findOne({
        where: { id: bill_id, org_id },
        transaction: t,
      });

      if (!original_bill || original_bill.status !== 0) {
        ctx.throw(422, '原账单不存在或不可拆分');
      }

      const total_split = splits.reduce((sum, item) => sum + Number(item.amount), 0);
      if (Math.abs(total_split - original_bill.amount_due) > 0.01) {
        ctx.throw(422, '拆分总额不等于原账单金额');
      }

      // 1. 创建子账单
      for (const part of splits) {
        await ctx.model.Bill.create({
          org_id,
          lease_id: original_bill.lease_id,
          tenant_id: original_bill.tenant_id,
          room_id: original_bill.room_id,
          bill_type: original_bill.bill_type,
          bill_period: `${original_bill.bill_period}(拆)`,
          amount_due: part.amount,
          due_date: part.due_date || original_bill.due_date,
          remark: `由账单 [${bill_id}] 拆分生成`,
          status: 0,
        }, { transaction: t });
      }

      // 2. 作废原账单
      return await original_bill.update({ status: 3, remark: '已拆分作废' }, { transaction: t });
    });
  }

  /**
   * 账单列表 (Admin)
   * @param {Object} params - { page, page_size, status, bill_type, tenant_id, room_id }
   */
  async list(params) {
    const { ctx } = this;
    const { org_id } = ctx;
    const { page = 1, page_size = 10, status, bill_type, tenant_id, room_id } = params;

    const where = { org_id };
    if (status !== undefined) where.status = status;
    if (bill_type !== undefined) where.bill_type = bill_type;
    if (tenant_id) where.tenant_id = tenant_id;
    if (room_id) where.room_id = room_id;

    const { rows, count } = await ctx.model.Bill.findAndCountAll({
      where,
      offset: (page - 1) * page_size,
      limit: parseInt(page_size),
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

    return { 
      list, 
      total: count, 
      page: parseInt(page), 
      page_size: parseInt(page_size) 
    };
  }

  /**
   * 获取各收款账户的资金汇总统计 (Admin)
   */
  async getAccountStats() {
    const { ctx, app } = this;
    const { org_id } = ctx;

    // 1. 获取所有配置的账户
    const accounts = await ctx.model.PaymentAccount.findAll({
      where: { org_id },
    });

    // 2. 统计每个账户的流水总额 (进账累加)
    const stats = await ctx.model.PaymentRecord.findAll({
      where: { 
        org_id,
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
   * @param {Object} params - { page, page_size, payment_account_id, trade_type, start_date, end_date }
   */
  async listTransactions(params) {
    const { ctx, app } = this;
    const { org_id } = ctx;
    const { page = 1, page_size = 10, payment_account_id, trade_type, start_date, end_date } = params;
    const { Op } = app.Sequelize;

    const where = { org_id };
    if (payment_account_id) where.payment_account_id = payment_account_id;
    if (trade_type) where.trade_type = trade_type;
    
    if (start_date || end_date) {
      where.trade_time = {};
      if (start_date) where.trade_time[Op.gte] = start_date;
      if (end_date) where.trade_time[Op.lte] = end_date;
    }

    const { rows, count } = await ctx.model.PaymentRecord.findAndCountAll({
      where,
      offset: (page - 1) * page_size,
      limit: parseInt(page_size),
      include: [
        { model: ctx.model.PaymentAccount, as: 'account', attributes: [ 'account_name' ] },
        { model: ctx.model.OrgStaff, as: 'operator', attributes: [ 'name' ] },
      ],
      order: [[ 'trade_time', 'DESC' ], [ 'created_at', 'DESC' ]],
    });

    return { 
      list: rows, 
      total: count, 
      page: parseInt(page), 
      page_size: parseInt(page_size) 
    };
  }

  /**
   * 押金台账列表 (Admin)
   * @param {Object} params - { page, page_size, tenant_name, room_number, status, deposit_type }
   */
  async listDeposits(params) {
    const { ctx, app } = this;
    const { org_id } = ctx;
    const { page = 1, page_size = 10, tenant_name, room_number, status, deposit_type } = params;
    const { Op } = app.Sequelize;

    const where = { org_id };
    if (status !== undefined) where.status = status;
    if (deposit_type !== undefined) where.deposit_type = deposit_type;

    const tenant_where = {};
    if (tenant_name) tenant_where.name = { [Op.like]: `%${tenant_name}%` };

    const lease_where = {};
    if (room_number) {
      lease_where['$lease.room.room_number$'] = { [Op.like]: `%${room_number}%` };
    }

    const { rows, count } = await ctx.model.LeaseDeposit.findAndCountAll({
      where,
      offset: (page - 1) * page_size,
      limit: parseInt(page_size),
      include: [
        { 
          model: ctx.model.Tenant, 
          as: 'tenant', 
          where: Object.keys(tenant_where).length > 0 ? tenant_where : undefined,
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

    return { 
      list: rows, 
      total: count, 
      page: parseInt(page), 
      page_size: parseInt(page_size) 
    };
  }

  /**
   * 调整押金本 (Admin)
   * @param {Object} params - { deposit_id, amount, type, remark } 
   * type: add/deduct
   */
  async adjustDeposit(params) {
    const { ctx } = this;
    const { org_id } = ctx;
    const { deposit_id, amount, type, remark } = params;

    return await ctx.model.transaction(async t => {
      const deposit = await ctx.model.LeaseDeposit.findOne({
        where: { id: deposit_id, org_id },
        transaction: t,
      });

      if (!deposit) ctx.throw(404, '押金记录不存在');

      const old_paid = parseFloat(deposit.amount_paid);
      const old_deducted = parseFloat(deposit.amount_deducted);
      const change_val = parseFloat(amount);

      if (type === 'deduct') {
        // 扣除押金
        const new_deducted = old_deducted + change_val;
        const new_status = (old_paid - new_deducted <= 0) ? 3 : 2; // 3-结清, 2-部分抵扣
        await deposit.update({
          amount_deducted: new_deducted,
          status: new_status,
          remark: remark || `手动扣除: ${change_val}`,
        }, { transaction: t });
      } else if (type === 'add') {
        // 手动补加实收
        const new_paid = old_paid + change_val;
        const new_status = (new_paid >= deposit.amount_expected) ? 1 : deposit.status;
        await deposit.update({
          amount_paid: new_paid,
          status: new_status,
          remark: remark || `手动补收: ${change_val}`,
        }, { transaction: t });
      }

      return deposit;
    });
  }
}

module.exports = FinancialService;

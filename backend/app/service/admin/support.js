'use strict';

const Service = require('egg').Service;

class SupportService extends Service {
  /**
   * 处理退租结算逻辑 (Lease Termination & Settlement)
   * @param {Object} payload - { lease_id, actual_end_date, checkout_type, readings, damage_amount, penalty_amount, remark }
   */
  async applyCheckout(params) {
    const { ctx } = this;
    const { lease_id, actual_end_date, checkout_type, readings, damage_amount, penalty_amount, remark } = params;
    const { org_id } = ctx;

    return await ctx.model.transaction(async t => {
      // 1. 获取核心数据并核验机构权限
      const lease = await ctx.model.Lease.findOne({
        where: { id: lease_id, org_id },
        transaction: t,
        include: [{ model: ctx.model.Room, as: 'room' }],
      });
      if (!lease || lease.status !== 1) ctx.throw(422, '租约不可结算退租');

      // 2. 财务汇算：已缴押金
      const deposits = await ctx.model.LeaseDeposit.findAll({
        where: { lease_id, deposit_type: 1, org_id },
        transaction: t,
      });
      const total_deposit_paid = deposits.reduce((sum, d) => sum + Number(d.amount_paid), 0);

      // 3. 财务汇算：待缴欠费
      const unpaid_bills = await ctx.model.Bill.findAll({
        where: { lease_id, status: 0, org_id },
        transaction: t,
      });
      const total_unpaid = unpaid_bills.reduce((sum, b) => sum + Number(b.amount_due), 0);

      // 4. 水电清算 (简易逻辑：当前读数 - 初始读数)
      let utility_deduction = 0;
      if (readings.electric !== undefined && lease.initial_electric_reading !== null) {
        const diff = Number(readings.electric) - Number(lease.initial_electric_reading);
        if (diff > 0) utility_deduction += diff * (lease.electric_price || 0);
      }
      if (readings.water !== undefined && lease.initial_water_reading !== null) {
        const diff = Number(readings.water) - Number(lease.initial_water_reading);
        if (diff > 0) utility_deduction += diff * (lease.water_price || 0);
      }

      // 5. 计算应退金额
      const final_refund = total_deposit_paid - total_unpaid - utility_deduction - Number(damage_amount) - Number(penalty_amount);

      // 6. 创建结算明细
      const checkout = await ctx.model.LeaseCheckout.create({
        org_id,
        lease_id,
        checkout_type,
        checkout_date: actual_end_date || new Date(),
        final_electric_reading: readings.electric,
        final_water_reading: readings.water,
        deposit_refundable: total_deposit_paid,
        unpaid_bills_amount: total_unpaid + utility_deduction,
        penalty_amount,
        damage_amount,
        final_refund_amount: final_refund,
        review_status: 1, // 直接设为待审核或已办结
        remark,
      }, { transaction: t });

      // 7. 同步更新关联账单状态 (结清/抵扣)
      await ctx.model.Bill.update({ status: 3, remark: `已在退房结算[${checkout.id}]中抵扣` }, {
        where: { lease_id, status: 0, org_id },
        transaction: t,
      });

      // 8. 释放房源状态
      await ctx.model.Room.update({ status: 0 }, { 
        where: { id: lease.room_id }, 
        transaction: t 
      });

      // 9. 更新租约状态
      await lease.update({ 
        status: 3, 
        checkout_date: actual_end_date || new Date() 
      }, { transaction: t });

      // 10. 记录房态流转日志
      await ctx.model.RoomStatusLog.create({
        org_id,
        room_id: lease.room_id,
        new_status: 0,
        trigger_event: 'LEAVE_APPLY',
        related_table: 'lease_checkouts',
        related_id: checkout.id,
        operator_id: ctx.state.user.uid,
      }, { transaction: t });

      return checkout;
    });
  }

  /**
   * 报修处理
   */
  async handleRepair(params) {
    const { ctx } = this;
    const { room_id, content } = params;
    const { org_id } = ctx;

    // 获取当前租客
    const lease = await ctx.model.Lease.findOne({
      where: { room_id, org_id, status: 1 },
    });

    const repair = await ctx.model.WorkOrder.create({
      org_id,
      room_id,
      tenant_id: lease ? lease.tenant_id : null,
      type: 1, // 故障报修
      content,
      status: 0, // 待处理
    });

    return repair;
  }

  /**
   * 创建租后服务/维修工单
   * @param {Object} payload - { room_id, title, description, urgency_level }
   */
  async createWorkOrder(payload) {
    const { ctx } = this;
    const { org_id } = ctx;
    const { room_id, title, description, urgency_level } = payload;

    // 自动寻找当前房间的有效租约 (若有)
    const active_lease = await ctx.model.Lease.findOne({
      where: { room_id, org_id, status: 1 },
    });

    const order = await ctx.model.WorkOrder.create({
      room_id,
      title,
      description,
      urgency_level,
      org_id,
      lease_id: active_lease ? active_lease.id : null,
      tenant_user_id: active_lease ? active_lease.tenant_user_id : null,
      status: 0, // 待接单
    });

    return order;
  }
}

module.exports = SupportService;

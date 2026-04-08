'use strict';

const Service = require('egg').Service;

class SupportService extends Service {
  /**
   * 处理退租结算逻辑 (Lease Termination & Settlement)
   * @param {Object} payload - { leaseId, checkoutDate, penaltyAmount, damageAmount }
   */
  async applyCheckout(payload) {
    const { ctx } = this;
    const { orgId } = ctx;
    const { leaseId, checkoutDate, penaltyAmount = 0, damageAmount = 0 } = payload;

    return await ctx.model.transaction(async t => {
      // 1. 锁住租约防止重复操作
      const lease = await ctx.model.Lease.findOne({
        where: { id: leaseId, org_id: orgId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!lease || lease.status !== 1) {
        ctx.throw(422, '该租约不存在或不处于生效中，无法结算');
      }

      // 2. 汇总押金账本情况
      const deposit = await ctx.model.LeaseDeposit.findOne({
        where: { lease_id: leaseId, deposit_type: 1, org_id: orgId },
        transaction: t,
      });

      if (!deposit) ctx.throw(404, '未找到关联押金本，请核查');

      // 3. 计算最终结算额 (租客实收 = 已纳押金 - 违约扣款 - 损耗扣款 - 历史欠费)
      // 暂不处理历史欠费 bill 对冲，仅处理押金抵扣逻辑
      const refundable = parseFloat(deposit.amount_paid);
      const totalDeduction = parseFloat(penaltyAmount) + parseFloat(damageAmount);
      const finalRefund = (refundable - totalDeduction).toFixed(2);

      // 4. 生成结算单
      const checkout = await ctx.model.LeaseCheckout.create({
        org_id: orgId,
        lease_id: leaseId,
        checkout_type: 1, // 正常退租
        checkout_date: checkoutDate || new Date(),
        deposit_refundable: refundable,
        penalty_amount: penaltyAmount,
        damage_amount: damageAmount,
        final_refund_amount: finalRefund,
        review_status: 1, // 简易流程下默认过审
        remark: '系统自动结算生成',
      }, { transaction: t });

      // 5. 关闭租约并释放房源
      await lease.update({
        status: 3, // 已退租
        checkout_date: checkoutDate || new Date(),
      }, { transaction: t });

      await ctx.model.Room.update(
        { status: 0 }, // 变更为“空置”
        { where: { id: lease.room_id }, transaction: t }
      );

      // 6. 更新押金本状态
      await deposit.update({
        amount_deducted: totalDeduction,
        amount_refunded: Math.max(0, finalRefund),
        status: 3, // 已结清
      }, { transaction: t });

      // 7. 记录房态生命周期流水
      await ctx.model.RoomStatusLog.create({
        org_id: orgId,
        room_id: lease.room_id,
        old_status: 1,
        new_status: 0,
        trigger_event: 'LEASE_CHECKOUT',
        related_table: 'lease_checkouts',
        related_id: checkout.id,
        operator_id: ctx.state.user.uid,
      }, { transaction: t });

      return checkout;
    });
  }

  /**
   * 创建租后服务/维修工单
   * @param {Object} payload - { roomId, title, description, urgencyLevel }
   */
  async createWorkOrder(payload) {
    const { ctx } = this;
    const { orgId } = ctx;

    // 自动寻找当前房间的有效租约 (若有)
    const activeLease = await ctx.model.Lease.findOne({
      where: { room_id: payload.roomId, org_id: orgId, status: 1 },
    });

    const order = await ctx.model.WorkOrder.create({
      ...payload,
      org_id: orgId,
      lease_id: activeLease ? activeLease.id : null,
      tenant_user_id: activeLease ? activeLease.tenant_user_id : null,
      status: 0, // 待接单
    });

    return order;
  }
}

module.exports = SupportService;

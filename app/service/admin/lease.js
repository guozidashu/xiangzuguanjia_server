'use strict';

const Service = require('egg').Service;

class LeaseService extends Service {
  /**
   * 新签租约 (Sign New Lease)
   * @param {Object} payload - { tenantData, leaseData }
   */
  async sign(payload) {
    const { ctx } = this;
    const { tenantData, leaseData } = payload;
    const { orgId } = ctx;

    return await ctx.model.transaction(async t => {
      // 1. 获取或创建租客信息
      let tenant = await ctx.model.Tenant.findOne({
        where: { org_id: orgId, phone: tenantData.phone },
        transaction: t,
      });

      if (!tenant) {
        tenant = await ctx.model.Tenant.create({
          ...tenantData,
          org_id: orgId,
        }, { transaction: t });
      }

      // 2. 检查房间状态 (确保房间当前为空置 0 或 预定 2)
      const room = await ctx.model.Room.findOne({
        where: { id: leaseData.room_id, org_id: orgId },
        transaction: t,
      });

      if (!room || ![ 0, 2 ].includes(room.status)) {
        ctx.throw(422, '房间当前状态不可签约');
      }

      // 3. 创建租约记录
      const lease = await ctx.model.Lease.create({
        ...leaseData,
        org_id: orgId,
        tenant_id: tenant.id,
        status: 1, // 直接设为生效中（实际业务可能先待签约）
      }, { transaction: t });

      // 4. 更新房间状态为“已租 (1)”
      const oldStatus = room.status;
      await room.update({ status: 1 }, { transaction: t });

      // 5. 记录房态变动流转
      await ctx.model.RoomStatusLog.create({
        org_id: orgId,
        room_id: room.id,
        old_status: oldStatus,
        new_status: 1,
        trigger_event: 'LEASE_SIGN',
        related_table: 'leases',
        related_id: lease.id,
        operator_id: ctx.state.user.uid,
      }, { transaction: t });

      // 6. 自动化出账：生成首期账单与押金本
      await ctx.service.admin.financial.createLeaseInitialLedger(lease, t);

      return { tenant, lease };
    });
  }

  /**
   * 续租租约 (Renew Lease)
   * @param {Number} oldLeaseId - 原租约ID
   * @param {Object} newLeaseData - 新租约参数
   */
  async renew(oldLeaseId, newLeaseData) {
    const { ctx } = this;
    const { orgId } = ctx;

    return await ctx.model.transaction(async t => {
      const oldLease = await ctx.model.Lease.findOne({
        where: { id: oldLeaseId, org_id: orgId },
        transaction: t,
      });

      if (!oldLease || oldLease.status !== 1) {
        ctx.throw(422, '原租约状态异常，无法续租');
      }

      // 1. 创建新租约，关联前序 ID
      const newLease = await ctx.model.Lease.create({
        ...newLeaseData,
        org_id: orgId,
        tenant_id: oldLease.tenant_id,
        room_id: oldLease.room_id,
        previous_lease_id: oldLease.id,
        change_type: 1, // 续租
        status: 1,
      }, { transaction: t });

      // 2. 将旧租约标记为“已结清/已续租过往状态 (可定义为状态 2 已到期或专门状态)”
      // 这里暂时将其设为 2 已到期 (或根据业务逻辑决定是否立即失效)
      await oldLease.update({ status: 2 }, { transaction: t });

      return newLease;
    });
  }

  /**
   * 获取租约详情 (带关联数据)
   */
  async detail(id) {
    const { ctx } = this;
    const lease = await ctx.model.Lease.findOne({
      where: { id, org_id: ctx.orgId },
      include: [
        { model: ctx.model.Room, as: 'room', include: [{ model: ctx.model.Project, as: 'project' }] },
        { model: ctx.model.Tenant, as: 'tenant' },
        { model: ctx.model.OrgStaff, as: 'manager', attributes: [ 'name', 'phone' ] },
        { model: ctx.model.LeaseCoTenant, as: 'co_tenants' },
        { model: ctx.model.LeaseDocument, as: 'documents' },
      ],
    });

    if (!lease) {
      ctx.throw(404, '租约不存在');
    }

    return lease;
  }

  /**
   * 换房 (Change Room)
   * 逻辑：终止原合同 -> 释放原房源 -> 占用新房源 -> 创建新合同链接
   */
  async changeRoom(params) {
    const { ctx } = this;
    const { oldLeaseId, newRoomId, newStartDate, newRentPrice } = params;
    const { orgId } = ctx;

    return await ctx.model.transaction(async t => {
      // 1. 获取原租约并校验
      const oldLease = await ctx.model.Lease.findOne({
        where: { id: oldLeaseId, org_id: orgId },
        transaction: t,
      });
      if (!oldLease || oldLease.status !== 1) ctx.throw(422, '原租约不在生效状态，无法换房');

      // 2. 检查并锁定新房间
      const newRoom = await ctx.model.Room.findOne({
        where: { id: newRoomId, org_id: orgId },
        transaction: t,
      });
      if (!newRoom || newRoom.status !== 0) ctx.throw(422, '新房间非空置状态');

      // 3. 释放原房间
      await ctx.model.Room.update({ status: 0 }, { 
        where: { id: oldLease.room_id }, 
        transaction: t 
      });

      // 4. 占用新房间
      await newRoom.update({ status: 1 }, { transaction: t });

      // 5. 终止原合同 (状态标记为 3 已结清/已退租)
      await oldLease.update({ status: 3, actual_end_date: newStartDate }, { transaction: t });

      // 6. 创建新合同 (换房产生的合同)
      const newLease = await ctx.model.Lease.create({
        org_id: orgId,
        tenant_id: oldLease.tenant_id,
        room_id: newRoomId,
        start_date: newStartDate,
        end_date: oldLease.end_date, // 默认继承原到期日
        rent_price: newRentPrice || oldLease.rent_price,
        previous_lease_id: oldLease.id,
        change_type: 2, // 换房
        status: 1,
      }, { transaction: t });

      // 7. 同步生成新房的首期账单
      await ctx.service.admin.financial.createLeaseInitialLedger(newLease, t);

      return newLease;
    });
  }

  /**
   * 退租财务清算 (Termination with Financial Settlement)
   * @param {Number} id - 租约ID
   * @param {Object} payload - { actualEndDate, checkoutType, readings, damageAmount, penaltyAmount, remark }
   */
  async terminate(id, payload) {
    const { ctx } = this;
    const { orgId } = ctx;
    const { 
      actualEndDate = new Date(), 
      checkoutType = 1, 
      readings = {}, 
      damageAmount = 0, 
      penaltyAmount = 0, 
      remark 
    } = payload;

    return await ctx.model.transaction(async t => {
      // 1. 获取核心数据
      const lease = await ctx.model.Lease.findOne({
        where: { id, org_id: orgId },
        transaction: t,
        include: [{ model: ctx.model.Room, as: 'room' }],
      });
      if (!lease || lease.status !== 1) ctx.throw(422, '租约不可结算退租');

      // 2. 财务汇总：已收押金
      const deposits = await ctx.model.LeaseDeposit.findAll({
        where: { lease_id: id, org_id: orgId },
        transaction: t,
      });
      const totalDepositPaid = deposits.reduce((sum, d) => sum + Number(d.amount_paid), 0);

      // 3. 财务汇总：待缴欠费 (不含水电)
      const unpaidBills = await ctx.model.Bill.findAll({
        where: { lease_id: id, status: 0, org_id: orgId },
        transaction: t,
      });
      const totalUnpaid = unpaidBills.reduce((sum, b) => sum + Number(b.amount_due), 0);

      // 4. 水电附加清算 (如有读数)
      let utilityCost = 0;
      if (readings.electric !== undefined && lease.initial_electric_reading !== null) {
        const diff = Number(readings.electric) - Number(lease.initial_electric_reading);
        if (diff > 0) utilityCost += diff * (lease.electric_price || 0);
      }
      if (readings.water !== undefined && lease.initial_water_reading !== null) {
        const diff = Number(readings.water) - Number(lease.initial_water_reading);
        if (diff > 0) utilityCost += diff * (lease.water_price || 0);
      }

      // 5. 计算最终退款金额 (应退 = 押金 - 欠费 - 水电 - 损扣 - 违约)
      const finalRefund = totalDepositPaid - totalUnpaid - utilityCost - Number(damageAmount) - Number(penaltyAmount);

      // 6. 创建结算明细单 (Checkout Record)
      const checkout = await ctx.model.LeaseCheckout.create({
        org_id: orgId,
        lease_id: id,
        checkout_type: checkoutType,
        checkout_date: actualEndDate,
        final_electric_reading: readings.electric,
        final_water_reading: readings.water,
        deposit_refundable: totalDepositPaid,
        unpaid_bills_amount: totalUnpaid + utilityCost,
        penalty_amount: penaltyAmount,
        damage_amount: damageAmount,
        final_refund_amount: finalRefund,
        review_status: 1, // 直接生效
        remark,
      }, { transaction: t });

      // 7. 变更关联状态 (账单结清、押金退还)
      await ctx.model.Bill.update({ status: 3, remark: `已在退房结算[${checkout.id}]中抵扣` }, {
        where: { lease_id: id, status: 0, org_id: orgId },
        transaction: t,
      });

      await ctx.model.LeaseDeposit.update({ 
        status: 2, // 已清算退还
        amount_refunded: finalRefund > 0 ? finalRefund : 0,
        remark: `退房结算[${checkout.id}]`,
      }, {
        where: { lease_id: id, org_id: orgId },
        transaction: t,
      });

      // 8. 房源与租约状态释放
      await ctx.model.Room.update({ status: 0 }, { 
        where: { id: lease.room_id }, 
        transaction: t 
      });

      await lease.update({ 
        status: 3, 
        checkout_date: actualEndDate,
      }, { transaction: t });

      // 9. 记录流水日志
      await ctx.model.RoomStatusLog.create({
        org_id: orgId,
        room_id: lease.room_id,
        new_status: 0,
        trigger_event: 'LEASE_FINANCE_TERMINATE',
        related_table: 'lease_checkouts',
        related_id: checkout.id,
        operator_id: ctx.state.user.uid,
      }, { transaction: t });

      return checkout;
    });
  }

  /**
   * 修改租约
   */
  async updateLease(id, data) {
    const { ctx } = this;
    const lease = await ctx.model.Lease.findOne({
      where: { id, org_id: ctx.orgId },
    });
    if (!lease) ctx.throw(404, '租约不存在');
    return await lease.update(data);
  }

  /**
   * 租约列表 (Admin)
   * @param {Object} params - { page, pageSize, status, tenantName, phone, projectId }
   */
  async list(params) {
    const { ctx, app } = this;
    const { orgId } = ctx;
    const { page = 1, pageSize = 10, status, tenantName, phone, projectId } = params;
    const { Op } = app.Sequelize;

    const where = { org_id: orgId };
    if (status !== undefined) where.status = status;

    const tenantWhere = {};
    if (tenantName) tenantWhere.name = { [Op.like]: `%${tenantName}%` };
    if (phone) tenantWhere.phone = { [Op.like]: `%${phone}%` };

    const roomWhere = {};
    if (projectId) roomWhere.project_id = projectId;

    const { rows, count } = await ctx.model.Lease.findAndCountAll({
      where,
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize),
      include: [
        { 
          model: ctx.model.Tenant, 
          as: 'tenant', 
          where: Object.keys(tenantWhere).length > 0 ? tenantWhere : undefined,
          required: Object.keys(tenantWhere).length > 0 
        },
        { 
          model: ctx.model.Room, 
          as: 'room', 
          where: Object.keys(roomWhere).length > 0 ? roomWhere : undefined,
          required: Object.keys(roomWhere).length > 0,
          include: [{ model: ctx.model.Project, as: 'project' }] 
        },
        { model: ctx.model.OrgStaff, as: 'manager', attributes: [ 'name' ] },
      ],
      order: [[ 'created_at', 'DESC' ]],
    });

    return { list: rows, total: count, page, pageSize };
  }
}

module.exports = LeaseService;

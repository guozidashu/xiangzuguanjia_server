'use strict';

const Service = require('egg').Service;

class LeaseService extends Service {
  /**
   * 新签租约 (Sign New Lease)
   * @param {Object} payload - { tenant_data, lease_data }
   */
  async sign(payload) {
    const { ctx } = this;
    const { tenant_data, lease_data } = payload;
    const { org_id } = ctx;

    return await ctx.model.transaction(async t => {
      // 1. 获取或创建租客信息
      let tenant = await ctx.model.Tenant.findOne({
        where: { org_id, phone: tenant_data.phone },
        transaction: t,
      });

      if (!tenant) {
        tenant = await ctx.model.Tenant.create({
          ...tenant_data,
          org_id,
        }, { transaction: t });
      }

      // 2. 检查房间状态 (确保房间当前为空置 0 或 预定 2)
      const room = await ctx.model.Room.findOne({
        where: { id: lease_data.room_id, org_id },
        transaction: t,
      });

      if (!room || ![ 0, 2 ].includes(room.status)) {
        ctx.throw(422, '房间当前状态不可签约');
      }

      // 3. 创建租约记录
      const lease = await ctx.model.Lease.create({
        ...lease_data,
        org_id,
        tenant_id: tenant.id,
        status: 1, // 直接设为生效中（实际业务可能先待签约）
      }, { transaction: t });

      // 4. 更新房间状态为“已租 (1)”
      const old_status = room.status;
      await room.update({ status: 1 }, { transaction: t });

      // 5. 记录房态变动流转
      await ctx.model.RoomStatusLog.create({
        org_id,
        room_id: room.id,
        old_status,
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
   * @param {Number} old_lease_id - 原租约ID
   * @param {Object} new_lease_data - 新租约参数
   */
  async renew(old_lease_id, new_lease_data) {
    const { ctx } = this;
    const { org_id } = ctx;

    return await ctx.model.transaction(async t => {
      const old_lease = await ctx.model.Lease.findOne({
        where: { id: old_lease_id, org_id },
        transaction: t,
      });

      if (!old_lease || old_lease.status !== 1) {
        ctx.throw(422, '原租约状态异常，无法续租');
      }

      // 1. 创建新租约，关联前序 ID
      const new_lease = await ctx.model.Lease.create({
        ...new_lease_data,
        org_id,
        tenant_id: old_lease.tenant_id,
        room_id: old_lease.room_id,
        previous_lease_id: old_lease.id,
        change_type: 1, // 续租
        status: 1,
      }, { transaction: t });

      // 2. 将旧租约标记为“已结清/已续租过往状态 (可定义为状态 2 已到期或专门状态)”
      // 这里暂时将其设为 2 已到期 (或根据业务逻辑决定是否立即失效)
      await old_lease.update({ status: 2 }, { transaction: t });

      return new_lease;
    });
  }

  /**
   * 获取租约详情 (带关联数据)
   */
  async detail(id) {
    const { ctx } = this;
    const lease = await ctx.model.Lease.findOne({
      where: { id, org_id: ctx.org_id },
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
    const { old_lease_id, new_room_id, new_start_date, new_rent_price } = params;
    const { org_id } = ctx;

    return await ctx.model.transaction(async t => {
      // 1. 获取原租约并校验
      const old_lease = await ctx.model.Lease.findOne({
        where: { id: old_lease_id, org_id },
        transaction: t,
      });
      if (!old_lease || old_lease.status !== 1) ctx.throw(422, '原租约不在生效状态，无法换房');

      // 2. 检查并锁定新房间
      const new_room = await ctx.model.Room.findOne({
        where: { id: new_room_id, org_id },
        transaction: t,
      });
      if (!new_room || new_room.status !== 0) ctx.throw(422, '新房间非空置状态');

      // 3. 释放原房间
      await ctx.model.Room.update({ status: 0 }, { 
        where: { id: old_lease.room_id }, 
        transaction: t 
      });

      // 4. 占用新房间
      await new_room.update({ status: 1 }, { transaction: t });

      // 5. 终止原合同 (状态标记为 3 已结清/已退租)
      await old_lease.update({ status: 3, actual_end_date: new_start_date }, { transaction: t });

      // 6. 创建新合同 (换房产生的合同)
      const new_lease = await ctx.model.Lease.create({
        org_id,
        tenant_id: old_lease.tenant_id,
        room_id: new_room_id,
        start_date: new_start_date,
        end_date: old_lease.end_date, // 默认继承原到期日
        rent_price: new_rent_price || old_lease.rent_price,
        previous_lease_id: old_lease.id,
        change_type: 2, // 换房
        status: 1,
      }, { transaction: t });

      // 7. 同步生成新房的首期账单
      await ctx.service.admin.financial.createLeaseInitialLedger(new_lease, t);

      return new_lease;
    });
  }

  /**
   * 退租财务清算 (Termination with Financial Settlement)
   * @param {Number} id - 租约ID
   * @param {Object} payload - { actual_end_date, checkout_type, readings, damage_amount, penalty_amount, remark }
   */
  async terminate(id, payload) {
    const { ctx } = this;
    const { org_id } = ctx;
    const { 
      actual_end_date = new Date(), 
      checkout_type = 1, 
      readings = {}, 
      damage_amount = 0, 
      penalty_amount = 0, 
      remark 
    } = payload;

    return await ctx.model.transaction(async t => {
      // 1. 获取核心数据
      const lease = await ctx.model.Lease.findOne({
        where: { id, org_id },
        transaction: t,
        include: [{ model: ctx.model.Room, as: 'room' }],
      });
      if (!lease || lease.status !== 1) ctx.throw(422, '租约不可结算退租');

      // 2. 财务汇总：已收押金
      const deposits = await ctx.model.LeaseDeposit.findAll({
        where: { lease_id: id, org_id },
        transaction: t,
      });
      const total_deposit_paid = deposits.reduce((sum, d) => sum + Number(d.amount_paid), 0);

      // 3. 财务汇总：待缴欠费 (不含水电)
      const unpaid_bills = await ctx.model.Bill.findAll({
        where: { lease_id: id, status: 0, org_id },
        transaction: t,
      });
      const total_unpaid = unpaid_bills.reduce((sum, b) => sum + Number(b.amount_due), 0);

      // 4. 水电附加清算 (如有读数)
      let utility_cost = 0;
      if (readings.electric !== undefined && lease.initial_electric_reading !== null) {
        const diff = Number(readings.electric) - Number(lease.initial_electric_reading);
        if (diff > 0) utility_cost += diff * (lease.electric_price || 0);
      }
      if (readings.water !== undefined && lease.initial_water_reading !== null) {
        const diff = Number(readings.water) - Number(lease.initial_water_reading);
        if (diff > 0) utility_cost += diff * (lease.water_price || 0);
      }

      // 5. 计算最终退款金额 (应退 = 押金 - 欠费 - 水电 - 损扣 - 违约)
      const final_refund = total_deposit_paid - total_unpaid - utility_cost - Number(damage_amount) - Number(penalty_amount);

      // 6. 创建结算明细单 (Checkout Record)
      const checkout = await ctx.model.LeaseCheckout.create({
        org_id,
        lease_id: id,
        checkout_type,
        checkout_date: actual_end_date,
        final_electric_reading: readings.electric,
        final_water_reading: readings.water,
        deposit_refundable: total_deposit_paid,
        unpaid_bills_amount: total_unpaid + utility_cost,
        penalty_amount: penalty_amount,
        damage_amount: damage_amount,
        final_refund_amount: final_refund,
        review_status: 1, // 直接生效
        remark,
      }, { transaction: t });

      // 7. 变更关联状态 (账单结清、押金退还)
      await ctx.model.Bill.update({ status: 3, remark: `已在退房结算[${checkout.id}]中抵扣` }, {
        where: { lease_id: id, status: 0, org_id },
        transaction: t,
      });

      await ctx.model.LeaseDeposit.update({ 
        status: 2, // 已清算退还
        amount_refunded: final_refund > 0 ? final_refund : 0,
        remark: `退房结算[${checkout.id}]`,
      }, {
        where: { lease_id: id, org_id },
        transaction: t,
      });

      // 8. 房源与租约状态释放
      await ctx.model.Room.update({ status: 0 }, { 
        where: { id: lease.room_id }, 
        transaction: t 
      });

      await lease.update({ 
        status: 3, 
        checkout_date: actual_end_date,
      }, { transaction: t });

      // 9. 记录流水日志
      await ctx.model.RoomStatusLog.create({
        org_id,
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
      where: { id, org_id: ctx.org_id },
    });
    if (!lease) ctx.throw(404, '租约不存在');
    return await lease.update(data);
  }

  /**
   * 租约列表 (Admin)
   * @param {Object} params - { page, page_size, status, tenant_name, phone, project_id }
   */
  async list(params) {
    const { ctx, app } = this;
    const { org_id } = ctx;
    const { page = 1, page_size = 10, status, tenant_name, phone, project_id } = params;
    const { Op } = app.Sequelize;

    const where = { org_id };
    if (status !== undefined) where.status = status;

    const tenant_where = {};
    if (tenant_name) tenant_where.name = { [Op.like]: `%${tenant_name}%` };
    if (phone) tenant_where.phone = { [Op.like]: `%${phone}%` };

    const room_where = {};
    if (project_id) room_where.project_id = project_id;

    const { rows, count } = await ctx.model.Lease.findAndCountAll({
      where,
      offset: (page - 1) * page_size,
      limit: parseInt(page_size),
      include: [
        { 
          model: ctx.model.Tenant, 
          as: 'tenant', 
          where: Object.keys(tenant_where).length > 0 ? tenant_where : undefined,
          required: Object.keys(tenant_where).length > 0 
        },
        { 
          model: ctx.model.Room, 
          as: 'room', 
          where: Object.keys(room_where).length > 0 ? room_where : undefined,
          required: Object.keys(room_where).length > 0,
          include: [{ model: ctx.model.Project, as: 'project' }] 
        },
        { model: ctx.model.OrgStaff, as: 'manager', attributes: [ 'name' ] },
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
}

module.exports = LeaseService;

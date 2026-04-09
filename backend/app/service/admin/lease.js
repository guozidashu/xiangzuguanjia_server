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

      // 2. 检查房间状态
      const room = await ctx.model.Room.findOne({
        where: { id: lease_data.room_id, org_id },
        transaction: t,
      });

      if (!room || ![0, 2].includes(room.status)) {
        ctx.throw(422, '房间当前状态不可签约');
      }

      // 3. 计算初始状态
      const dayjs = require('dayjs');
      const start = dayjs(lease_data.start_date);
      const is_future = start.isAfter(dayjs(), 'day');
      const initial_status = is_future ? 0 : 1;

      // 4. 创建租约主记录
      const lease = await ctx.model.Lease.create({
        org_id,
        tenant_id: tenant.id,
        room_id: lease_data.room_id,
        manager_id: lease_data.manager_id,
        start_date: lease_data.start_date,
        end_date: lease_data.end_date,
        status: initial_status,
      }, { transaction: t });

      // 5. 创建初始版本记录 (0: NEW)
      const version = await ctx.model.LeaseVersion.create({
        org_id,
        lease_id: lease.id,
        version_no: 1,
        change_type: 0, 
        room_id: lease_data.room_id,
        rent_price: lease_data.rent_price,
        deposit_amount: lease_data.deposit_amount || lease_data.rent_price, // 默认押一
        payment_cycle: lease_data.payment_cycle || 1,
        start_date: lease_data.start_date,
        end_date: lease_data.end_date,
        electric_price: lease_data.electric_price,
        water_price: lease_data.water_price,
        billing_type: lease_data.billing_type,
        initial_electric_reading: lease_data.initial_electric_reading,
        initial_water_reading: lease_data.initial_water_reading,
        allowed_payment_ids: lease_data.allowed_payment_ids,
        remark: lease_data.remark,
      }, { transaction: t });

      // 6. 关联版本回主表
      await lease.update({ current_version_id: version.id }, { transaction: t });

      // 7. 更新房间状态
      const old_status = room.status;
      await room.update({ status: 1 }, { transaction: t });

      // 8. 房态变动日志
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

      // 9. 自动化出账：生成首期账单与押金本 (传递版本信息)
      await ctx.service.admin.financial.createLeaseInitialLedger(lease, version, t);

      return { tenant, lease, version };
    });
  }

  /**
   * 续租租约 (Renew Lease)
   * @param {Number} old_lease_id - 原租约ID
   * @param {Object} new_lease_data - 新租约参数
   */
  async renew(lease_id, new_version_data) {
    const { ctx } = this;
    const { org_id } = ctx;

    return await ctx.model.transaction(async t => {
      // 1. 获取原租约及其当前版本
      const lease = await ctx.model.Lease.findOne({
        where: { id: lease_id, org_id },
        include: [{ model: ctx.model.LeaseVersion, as: 'current_version' }],
        transaction: t,
      });

      if (!lease || ![1, 4].includes(lease.status)) {
        ctx.throw(422, '租约当前状态异常，无法续租');
      }

      const last_version = lease.current_version;
      const next_version_no = (last_version ? last_version.version_no : 0) + 1;

      // 2. 创建新版本记录 (RENEW)
      const version = await ctx.model.LeaseVersion.create({
        ...new_version_data,
        org_id,
        lease_id: lease.id,
        version_no: next_version_no,
        change_type: 1, 
        room_id: lease.room_id, // 续租默认不换房
      }, { transaction: t });

      // 3. 更新租约主表
      await lease.update({
        current_version_id: version.id,
        status: 1, // 确保状态为生效中
      }, { transaction: t });

      // 4. (可选) 此处可调用财务服务生成新版本的后续账单，暂留空由具体业务触发
      
      return { lease, version };
    });
  }

  async detail(id) {
    const { ctx } = this;
    const lease = await ctx.model.Lease.findOne({
      where: { id, org_id: ctx.org_id },
      include: [
        { model: ctx.model.Room, as: 'room', include: [{ model: ctx.model.Project, as: 'project' }] },
        { model: ctx.model.Tenant, as: 'tenant' },
        { model: ctx.model.OrgStaff, as: 'manager', attributes: ['name', 'phone'] },
        { model: ctx.model.LeaseVersion, as: 'versions' },
        { model: ctx.model.LeaseVersion, as: 'current_version' },
        { model: ctx.model.LeaseCoTenant, as: 'co_tenants' },
        { model: ctx.model.LeaseDocument, as: 'documents' },
      ],
      order: [[{ model: ctx.model.LeaseVersion, as: 'versions' }, 'version_no', 'DESC']],
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
    const { old_lease_id, new_room_id, new_start_date, new_rent_price, transfer_fee = 0 } = params;
    const { org_id } = ctx;

    return await ctx.model.transaction(async t => {
      // 1. 获取原租约并校验
      const lease = await ctx.model.Lease.findOne({
        where: { id: old_lease_id, org_id },
        include: [{ model: ctx.model.LeaseVersion, as: 'current_version' }],
        transaction: t,
      });
      if (!lease || lease.status !== 1) ctx.throw(422, '原租约不在生效状态，无法换房');

      const old_room_id = lease.room_id;

      // 2. 检查并锁定新房间
      const new_room = await ctx.model.Room.findOne({
        where: { id: new_room_id, org_id },
        transaction: t,
      });
      if (!new_room || new_room.status !== 0) ctx.throw(422, '新房间非空置状态');

      // 3. 释放原房间
      await ctx.model.Room.update({ status: 0 }, {
        where: { id: old_room_id },
        transaction: t
      });

      // 4. 占用新房间
      await new_room.update({ status: 1 }, { transaction: t });

      // 5. 记录换房事件 (LeaseTransfer)
      await ctx.model.LeaseTransfer.create({
        org_id,
        lease_id: lease.id,
        from_room_id: old_room_id,
        to_room_id: new_room_id,
        transfer_date: new_start_date,
        fee: transfer_fee,
      }, { transaction: t });

      // 6. 创建新版本记录 (TRANSFER)
      const last_version = lease.current_version;
      const next_version_no = (last_version ? last_version.version_no : 0) + 1;

      const version = await ctx.model.LeaseVersion.create({
        ...last_version.toJSON(), // 继承原版本属性
        id: undefined, // 排除 ID
        version_no: next_version_no,
        change_type: 2, 
        room_id: new_room_id,
        start_date: new_start_date,
        rent_price: new_rent_price || last_version.rent_price,
        created_at: undefined,
        updated_at: undefined,
      }, { transaction: t });

      // 7. 更新租约主表
      await lease.update({
        room_id: new_room_id,
        current_version_id: version.id,
      }, { transaction: t });

      // 8. 同步生成新房的首期账单
      await ctx.service.admin.financial.createLeaseInitialLedger(lease, version, t);

      return { lease, version };
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
      // 1. 获取核心数据及其当前版本
      const lease = await ctx.model.Lease.findOne({
        where: { id, org_id },
        transaction: t,
        include: [
          { model: ctx.model.Room, as: 'room' },
          { model: ctx.model.LeaseVersion, as: 'current_version' }
        ],
      });
      if (!lease || lease.status !== 1) ctx.throw(422, '租约不可结算退租');

      const version = lease.current_version;

      // ... (财务汇总逻辑保持不变) ...
      const deposits = await ctx.model.LeaseDeposit.findAll({
        where: { lease_id: id, org_id },
        transaction: t,
      });
      const total_deposit_paid = deposits.reduce((sum, d) => sum + Number(d.amount_paid), 0);

      const unpaid_bills = await ctx.model.Bill.findAll({
        where: { lease_id: id, status: 0, org_id },
        transaction: t,
      });
      const total_unpaid = unpaid_bills.reduce((sum, b) => sum + Number(b.amount_due), 0);

      // 4. 水电附加清算 (从当前版本获取初始读数和单价)
      let utility_cost = 0;
      if (readings.electric !== undefined && version.initial_electric_reading !== null) {
        const diff = Number(readings.electric) - Number(version.initial_electric_reading);
        if (diff > 0) utility_cost += diff * (version.electric_price || 0);
      }
      if (readings.water !== undefined && version.initial_water_reading !== null) {
        const diff = Number(readings.water) - Number(version.initial_water_reading);
        if (diff > 0) utility_cost += diff * (version.water_price || 0);
      }

      // 5. 计算最终退款金额
      const final_refund = total_deposit_paid - total_unpaid - utility_cost - Number(damage_amount) - Number(penalty_amount);

      // 6. 创建结算明细单
      const checkout = await ctx.model.LeaseCheckout.create({
        org_id,
        project_id: lease.room ? lease.room.project_id : 0,
        lease_id: id,
        tenant_id: lease.tenant_id,
        checkout_type,
        checkout_date: actual_end_date,
        final_electric_reading: readings.electric,
        final_water_reading: readings.water,
        deposit_refundable: total_deposit_paid,
        unpaid_bills_amount: total_unpaid + utility_cost,
        penalty_amount: penalty_amount,
        damage_amount: damage_amount,
        final_refund_amount: final_refund,
        review_status: 1, 
        remark,
      }, { transaction: t });

      // 7. 变更关联状态
      await ctx.model.Bill.update({ status: 3, remark: `已在退房结算[${checkout.id}]中抵扣` }, {
        where: { lease_id: id, status: 0, org_id },
        transaction: t,
      });

      await ctx.model.LeaseDeposit.update({
        status: 2, 
        amount_refunded: final_refund > 0 ? final_refund : 0,
        remark: `退房结算[${checkout.id}]`,
      }, {
        where: { lease_id: id, org_id },
        transaction: t,
      });

      // 8. 创建终止版本记录 (TERMINATE)
      const next_version_no = version.version_no + 1;
      const term_version = await ctx.model.LeaseVersion.create({
        ...version.toJSON(),
        id: undefined,
        version_no: next_version_no,
        change_type: 4, 
        end_date: actual_end_date,
        remark: `退租结算终止: ${remark || ''}`,
        created_at: undefined,
        updated_at: undefined,
      }, { transaction: t });

      // 9. 房源与租约状态释放
      await ctx.model.Room.update({ status: 0 }, {
        where: { id: lease.room_id },
        transaction: t
      });

      await lease.update({
        status: 3,
        current_version_id: term_version.id,
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
   * @param {Object} params - { page, page_size, status, tenant_name, phone, project_id, filter }
   */
  async list(params) {
    const { ctx, app } = this;
    const { org_id } = ctx;
    const { page = 1, page_size = 10, status, tenant_name, phone, project_id, filter } = params;
    const { Op } = app.Sequelize;

    const where = { org_id };
    const version_where = {};

    // 权限与项目隔离：强制使用 ctx.project_id (若存在) 或入参 project_id
    const effective_project_id = ctx.project_id || project_id;

    if (status !== undefined && status !== '') where.status = status;

    // 处理快捷筛选 (filter)，现在需要通过关联版本过滤
    const now = new Date();
    const dayjs = require('dayjs');
    if (filter === 'this_month') {
      where.status = 1; // 仅看生效中
      version_where.end_date = { [Op.between]: [dayjs().startOf('month').toDate(), dayjs().endOf('month').toDate()] };
    } else if (filter === '30_days') {
      where.status = 1;
      version_where.end_date = { [Op.between]: [now, dayjs().add(30, 'day').toDate()] };
    } else if (filter === '15_days') {
      where.status = 1;
      version_where.end_date = { [Op.between]: [now, dayjs().add(15, 'day').toDate()] };
    }

    const tenant_where = {};
    if (tenant_name) tenant_where.name = { [Op.like]: `%${tenant_name}%` };
    if (phone) tenant_where.phone = { [Op.like]: `%${phone}%` };

    const room_where = {};
    if (effective_project_id) room_where.project_id = effective_project_id;

    // 1. 统计各状态数量 (需要 Join current_version 如果有 filter)
    const stats_rows = await ctx.model.Lease.findAll({
      where: { 
        ...where,
        ...(Object.keys(version_where).length > 0 ? {
          '$current_version.end_date$': version_where.end_date
        } : {})
      },
      attributes: [
        [app.Sequelize.col('leases.status'), 'status'],
        [app.Sequelize.fn('COUNT', app.Sequelize.col('leases.id')), 'count']
      ],
      include: [
        {
          model: ctx.model.Room,
          as: 'room',
          where: effective_project_id ? { project_id: effective_project_id } : undefined,
          attributes: [],
          required: !!effective_project_id
        },
        { model: ctx.model.LeaseVersion, as: 'current_version', attributes: [], required: Object.keys(version_where).length > 0 }
      ],
      group: [app.Sequelize.col('leases.status')],
      raw: true,
    });

    const statistics = { total: 0, pending: 0, active: 0, expired: 0, terminated: 0 };
    stats_rows.forEach(r => {
      const s = parseInt(r.status);
      const c = parseInt(r.count);
      statistics.total += c;
      if (s === 0) statistics.pending = c;
      else if (s === 1) statistics.active = c;
      else if (s === 2) statistics.expired = c;
      else if (s === 3) statistics.terminated = c;
    });

    // 2. 执行分页列表查询
    const { rows, count } = await ctx.model.Lease.findAndCountAll({
      where: {
        ...where,
        ...(Object.keys(version_where).length > 0 ? {
          '$current_version.end_date$': version_where.end_date
        } : {})
      },
      limit: parseInt(page_size),
      offset: (parseInt(page) - 1) * parseInt(page_size),
      include: [
        { model: ctx.model.Tenant, as: 'tenant', where: Object.keys(tenant_where).length > 0 ? tenant_where : undefined, required: !!(tenant_name || phone) },
        { model: ctx.model.Room, as: 'room', where: Object.keys(room_where).length > 0 ? room_where : undefined, include: [{ model: ctx.model.Project, as: 'project' }] },
        { model: ctx.model.LeaseVersion, as: 'current_version', required: true },
        { model: ctx.model.OrgStaff, as: 'manager', attributes: ['name'] },
      ],
      order: [[app.Sequelize.col('leases.created_at'), 'DESC']],
      distinct: true,
    });

    // 3. 构建逾期标识 (注入财务预警字段)
    const lease_ids = rows.map(r => r.id);
    const overdue_bills = await ctx.model.Bill.findAll({
      where: {
        org_id,
        lease_id: { [Op.in]: lease_ids },
        status: { [Op.lt]: 2 }, // 未支付或部分支付
        due_date: { [Op.lt]: now }
      },
      attributes: ['lease_id', 'amount_due', 'amount_paid']
    });

    const list = rows.map(lease => {
      const item = lease.toJSON();
      const my_overdue = overdue_bills.filter(b => b.lease_id === lease.id);
      item.bill_overdue = my_overdue.length > 0;
      item.overdue_amount = my_overdue.reduce((sum, b) => sum + (parseFloat(b.amount_due) - parseFloat(b.amount_paid)), 0);
      return item;
    });

    return {
      list,
      total: count,
      statistics,
      page: parseInt(page),
      page_size: parseInt(page_size)
    };
  }
}

module.exports = LeaseService;

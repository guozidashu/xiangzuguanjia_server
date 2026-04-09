'use strict';

const Service = require('egg').Service;

class OpsService extends Service {
  /**
   * 记录抄表读数并自动触发水电账单
   * @param {Object} params - { device_id, reading_value, reading_date, room_id, lease_id }
   */
  async recordMeterReading(params) {
    const { ctx } = this;
    const { org_id } = ctx;
    const { device_id, reading_value, reading_date, room_id, lease_id } = params;

    return await ctx.model.transaction(async t => {
      // 1. 获取设备信息，校验是否存在
      const device = await ctx.model.Device.findOne({
        where: { id: device_id, org_id: org_id },
        transaction: t,
      });

      if (!device) ctx.throw(404, '指定的硬件设备不存在');

      const last_reading = parseFloat(device.current_reading || 0);
      const current_reading = parseFloat(reading_value);
      const consumption = current_reading - last_reading;

      if (consumption < 0) {
        ctx.throw(422, `新读数(${current_reading})不能小于末次读数(${last_reading})`);
      }

      // 2. 更新设备实时状态
      await device.update({
        current_reading,
        last_sync_time: reading_date || new Date(),
      }, { transaction: t });

      // 3. 产生抄表流水
      const reading = await ctx.model.MeterReading.create({
        org_id,
        device_id,
        room_id,
        lease_id,
        meter_type: device.device_type,
        reading_source: 1, // 手工抄读
        reading_value: current_reading,
        reading_date: reading_date || new Date(),
        operator_id: ctx.state.user.uid,
      }, { transaction: t });

      // 4. 若关联租约且产生了实际能耗，则自动同步出账
      if (lease_id && consumption > 0) {
        const lease = await ctx.model.Lease.findOne({
          where: { id: lease_id, org_id },
          transaction: t,
        });

        if (lease) {
          // 根据表类型选择单价
          const price = device.device_type === 1 ? lease.electric_price : lease.water_price;
          const amount = (consumption * price).toFixed(2);

          // 自动创建账单
          const bill = await ctx.model.Bill.create({
            org_id,
            lease_id,
            tenant_id: lease.tenant_id,
            room_id,
            bill_type: device.device_type === 1 ? 3 : 4, // 3电, 4水
            bill_period: '抄表出账',
            amount_due: amount,
            status: 0,
            remark: `能耗周期出账: ${last_reading} -> ${current_reading}, 消耗量: ${consumption.toFixed(2)}`,
          }, { transaction: t });

          // 将账单 ID 回填到抄表记录
          await reading.update({ related_bill_id: bill.id }, { transaction: t });
        }
      }

      return reading;
    });
  }

  /**
   * 运营利润核算引擎 (Project Profit & Loss)
   * @param {Number} project_id - 小区项目 ID
   */
  async getProjectReport(project_id) {
    const { ctx, app } = this;
    const { org_id } = ctx;
    const { Op } = app.Sequelize;

    // 1. 计算该项目下的房源总收入 (已结清的账单)
    // 注意：这里包含了租金、水电、杂费的总和
    const total_revenue = await ctx.model.Bill.sum('amount_paid', {
      where: {
        org_id,
        status: 2, // 仅计算已结清的真实进账
        room_id: {
          [Op.in]: app.Sequelize.literal(`(SELECT id FROM rooms WHERE project_id = ${project_id})`)
        }
      }
    }) || 0;

    // 2. 计算该项目下的静态收房成本 (业主底租)
    const landlord_cost = await ctx.model.LandlordContract.sum('rent_cost', {
      where: { org_id, project_id, status: 1 }
    }) || 0;

    // 3. 计算该项目下的外部运营支出 (物业费、维修费等)
    const extra_expense = await ctx.model.OrgExternalExpense.sum('amount', {
      where: { org_id, project_id, status: 1 }
    }) || 0;

    // 4. 汇总净利润
    const net_profit = (total_revenue - landlord_cost - extra_expense).toFixed(2);

    return {
      project_id,
      total_revenue: parseFloat(total_revenue),
      landlord_cost: parseFloat(landlord_cost),
      extra_expense: parseFloat(extra_expense),
      net_profit: parseFloat(net_profit),
      margin: total_revenue > 0 ? (net_profit / total_revenue * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * 获取全机构运营 Dashboard 统计数据
   */
  async getDashboardStats() {
    const { ctx, app } = this;
    const { org_id } = ctx;
    const { Op } = app.Sequelize;
    const dayjs = require('dayjs');
    const today = dayjs().startOf('day').toDate();
    const month_start = dayjs().startOf('month').toDate();

    // 1. 房源状态统计
    const room_stats = await ctx.model.Room.findAll({
      where: { org_id: org_id },
      attributes: [
        'status',
        [ app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'count' ]
      ],
      group: [ 'status' ],
    });

    // 2. 财务大盘统计
    // 今日实收
    const today_revenue = await ctx.model.PaymentRecord.sum('amount', {
      where: { 
        org_id: org_id, 
        trade_type: 1, 
        trade_time: { [Op.gte]: today } 
      }
    }) || 0;

    // 本月累计实收
    const month_revenue = await ctx.model.PaymentRecord.sum('amount', {
      where: { 
        org_id: org_id, 
        trade_type: 1, 
        trade_time: { [Op.gte]: month_start } 
      }
    }) || 0;

    // 待收总额与逾期金额
    const unpaid_bills = await ctx.model.Bill.findAll({
      where: { org_id: org_id, status: 0 },
      attributes: [ 'due_date', 'amount_due' ]
    });

    let total_pending = 0;
    let total_overdue = 0;
    const now = dayjs();
    unpaid_bills.forEach(b => {
      const amt = parseFloat(b.amount_due);
      total_pending += amt;
      if (dayjs(b.due_date).isBefore(now)) {
        total_overdue += amt;
      }
    });

    // 3. 租约变动统计
    // 30 天内即将到期的租约
    const expiring_soon_count = await ctx.model.Lease.count({
      where: {
        org_id: org_id,
        status: 1,
        end_date: {
          [Op.between]: [ today, dayjs().add(30, 'day').toDate() ]
        }
      }
    });

    return {
      rooms: {
        total: room_stats.reduce((s, r) => s + parseInt(r.get('count')), 0),
        rented: room_stats.find(r => r.status === 1)?.get('count') || 0,
        vacant: room_stats.find(r => r.status === 0)?.get('count') || 0,
        reserved: room_stats.find(r => r.status === 2)?.get('count') || 0,
      },
      finance: {
        today_revenue,
        month_revenue,
        total_pending,
        total_overdue,
      },
      leases: {
        expiring_soon: expiring_soon_count,
      }
    };
  }
}

module.exports = OpsService;

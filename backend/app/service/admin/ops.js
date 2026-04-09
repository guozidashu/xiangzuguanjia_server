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
          include: [{ model: ctx.model.LeaseVersion, as: 'current_version' }],
          transaction: t,
        });

        if (lease && lease.current_version) {
          const version = lease.current_version;
          // 根据表类型选择单价 (从版本获取)
          const price = device.device_type === 1 ? version.electric_price : version.water_price;
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
    const total_revenue = await ctx.model.Bill.sum('amount_paid', {
      where: {
        org_id,
        status: 2, // 仅计算已结清的真实实收
        room_id: {
          [Op.in]: app.Sequelize.literal(`(SELECT id FROM rooms WHERE project_id = ${project_id})`)
        }
      }
    }) || 0;

    // 2. 从统一支出表 (OrgExpense) 计算总成本
    const expenses = await ctx.model.OrgExpense.findAll({
      where: { org_id, project_id, status: 1 },
      attributes: [
        'expense_type',
        [app.Sequelize.fn('SUM', app.Sequelize.col('amount')), 'total_amount']
      ],
      group: ['expense_type'],
      raw: true
    });

    let landlord_cost = 0;
    let extra_expense = 0;

    expenses.forEach(e => {
      const type = parseInt(e.expense_type);
      const amt = parseFloat(e.total_amount);
      if (type === 1) landlord_cost += amt; // 房东租金
      else extra_expense += amt;            // 运营、维修、佣金等
    });

    // 3. 汇总净利润
    const total_cost = landlord_cost + extra_expense;
    const net_profit = (parseFloat(total_revenue) - total_cost).toFixed(2);

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
  async getDashboardStats(projectId) {
    const { ctx, app } = this;
    const { org_id } = ctx;
    const { Op } = app.Sequelize;
    const dayjs = require('dayjs');
    const today = dayjs().startOf('day').toDate();
    const month_start = dayjs().startOf('month').toDate();
    const now_date = new Date();

    // 0. 获取该项目下所有房间 ID (用于跨表统计隔离)
    const projectRoomIds = await ctx.model.Room.findAll({
      where: { org_id, project_id: projectId },
      attributes: ['id']
    }).then(res => res.map(r => r.id));

    if (projectRoomIds.length === 0) {
      return {
        total_rooms: 0, rented_rooms: 0, vacant_rooms: 0, absorption_rate: 0,
        today_revenue: 0, month_revenue: 0, overdue_amount: 0, expiring_soon_count: 0
      };
    }

    // 1. 房源状态统计 (已对齐项目)
    const room_stats = await ctx.model.Room.findAll({
      where: { org_id, project_id: projectId },
      attributes: [
        'status',
        [ app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'count' ]
      ],
      group: [ 'status' ],
    });

    // 2. 财务大盘统计 (改为从已结清账单统计，以确保项目隔离精度)
    // 今日实收 (基于账单结清时间)
    const today_revenue = await ctx.model.Bill.sum('amount_paid', {
      where: { 
        org_id, 
        room_id: { [Op.in]: projectRoomIds },
        status: 2, 
        paid_time: { [Op.gte]: today } 
      }
    }) || 0;

    // 本月累计实收
    const month_revenue = await ctx.model.Bill.sum('amount_paid', {
      where: { 
        org_id, 
        room_id: { [Op.in]: projectRoomIds },
        status: 2, 
        paid_time: { [Op.gte]: month_start } 
      }
    }) || 0;

    // 待收总额与逾期金额
    const unpaid_bills = await ctx.model.Bill.findAll({
      where: { 
        org_id, 
        room_id: { [Op.in]: projectRoomIds },
        status: { [Op.lt]: 2 } 
      },
      attributes: [ 'due_date', 'amount_due', 'amount_paid' ]
    });

    let total_pending = 0;
    let total_overdue = 0;
    unpaid_bills.forEach(b => {
      const amt = parseFloat(b.amount_due) - parseFloat(b.amount_paid);
      total_pending += amt;
      if (dayjs(b.due_date).isBefore(dayjs())) {
        total_overdue += amt;
      }
    });

    // 3. 租约变动统计
    // 30 天内即将到期的租约 (跨表查询版本)
    const expiring_soon_count = await ctx.model.Lease.count({
      where: {
        org_id,
        room_id: { [Op.in]: projectRoomIds },
        status: 1, // 生效中
        '$current_version.end_date$': {
          [Op.between]: [ today, dayjs().add(30, 'day').toDate() ]
        }
      },
      include: [{ model: ctx.model.LeaseVersion, as: 'current_version', attributes: [] }],
    });

    // 汇总指标
    const total_rooms = projectRoomIds.length;
    const rented_rooms = parseInt(room_stats.find(r => r.status === 1)?.get('count') || 0);
    const vacant_rooms = parseInt(room_stats.find(r => r.status === 0)?.get('count') || 0);
    const absorption_rate = total_rooms > 0 ? ((rented_rooms / total_rooms) * 100).toFixed(2) : 0;

    return {
      total_rooms,
      rented_rooms,
      vacant_rooms,
      absorption_rate: parseFloat(absorption_rate),
      today_revenue: parseFloat(today_revenue),
      month_revenue: parseFloat(month_revenue),
      overdue_amount: total_overdue,
      total_pending: total_pending,
      expiring_soon_count,
    };
  }
}

module.exports = OpsService;

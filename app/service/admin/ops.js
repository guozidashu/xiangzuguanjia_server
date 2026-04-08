'use strict';

const Service = require('egg').Service;

class OpsService extends Service {
  /**
   * 记录抄表读数并自动触发水电账单
   * @param {Object} params - { deviceId, readingValue, readingDate, roomId, leaseId }
   */
  async recordMeterReading(params) {
    const { ctx, app } = this;
    const { orgId } = ctx;
    const { deviceId, readingValue, readingDate, roomId, leaseId } = params;

    return await ctx.model.transaction(async t => {
      // 1. 获取设备信息，校验是否存在
      const device = await ctx.model.Device.findOne({
        where: { id: deviceId, org_id: orgId },
        transaction: t,
      });

      if (!device) ctx.throw(404, '指定的硬件设备不存在');

      const lastReading = parseFloat(device.current_reading || 0);
      const currentReading = parseFloat(readingValue);
      const consumption = currentReading - lastReading;

      if (consumption < 0) {
        ctx.throw(422, `新读数(${currentReading})不能小于末次读数(${lastReading})`);
      }

      // 2. 更新设备实时状态
      await device.update({
        current_reading: currentReading,
        last_sync_time: readingDate || new Date(),
      }, { transaction: t });

      // 3. 产生抄表流水
      const reading = await ctx.model.MeterReading.create({
        org_id: orgId,
        device_id: deviceId,
        room_id: roomId,
        lease_id,
        meter_type: device.device_type,
        reading_source: 1, // 手工抄读
        reading_value: currentReading,
        reading_date: readingDate || new Date(),
        operator_id: ctx.state.user.uid,
      }, { transaction: t });

      // 4. 若关联租约且产生了实际能耗，则自动同步出账
      if (leaseId && consumption > 0) {
        const lease = await ctx.model.Lease.findOne({
          where: { id: leaseId, org_id: orgId },
          transaction: t,
        });

        if (lease) {
          // 根据表类型选择单价
          const price = device.device_type === 1 ? lease.electric_price : lease.water_price;
          const amount = (consumption * price).toFixed(2);

          // 自动创建账单
          const bill = await ctx.model.Bill.create({
            org_id: orgId,
            lease_id,
            tenant_id: lease.tenant_id,
            room_id: roomId,
            bill_type: device.device_type === 1 ? 3 : 4, // 3电, 4水
            bill_period: '抄表出账',
            amount_due: amount,
            status: 0,
            remark: `能耗周期出账: ${lastReading} -> ${currentReading}, 消耗量: ${consumption.toFixed(2)}`,
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
   * @param {Number} projectId - 小区项目 ID
   */
  async getProjectReport(projectId) {
    const { ctx, app } = this;
    const { orgId } = ctx;
    const { Op } = app.Sequelize;

    // 1. 计算该项目下的房源总收入 (已结清的账单)
    // 注意：这里包含了租金、水电、杂费的总和
    const totalRevenue = await ctx.model.Bill.sum('amount_paid', {
      where: {
        org_id: orgId,
        status: 2, // 仅计算已结清的真实进账
        room_id: {
          [Op.in]: app.Sequelize.literal(`(SELECT id FROM rooms WHERE project_id = ${projectId})`)
        }
      }
    }) || 0;

    // 2. 计算该项目下的静态收房成本 (业主底租)
    const landlordCost = await ctx.model.LandlordContract.sum('rent_cost', {
      where: { org_id: orgId, project_id: projectId, status: 1 }
    }) || 0;

    // 3. 计算该项目下的外部运营支出 (物业费、维修费等)
    const extraExpense = await ctx.model.OrgExternalExpense.sum('amount', {
      where: { org_id: orgId, project_id: projectId, status: 1 }
    }) || 0;

    // 4. 汇总净利润
    const netProfit = (totalRevenue - landlordCost - extraExpense).toFixed(2);

    return {
      projectId,
      totalRevenue: parseFloat(totalRevenue),
      landlordCost: parseFloat(landlordCost),
      extraExpense: parseFloat(extraExpense),
      netProfit: parseFloat(netProfit),
      margin: totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * 获取全机构运营 Dashboard 统计数据
   */
  async getDashboardStats() {
    const { ctx, app } = this;
    const { orgId } = ctx;
    const { Op } = app.Sequelize;
    const today = dayjs().startOf('day').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    // 1. 房源状态统计
    const roomStats = await ctx.model.Room.findAll({
      where: { org_id: orgId },
      attributes: [
        'status',
        [ app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'count' ]
      ],
      group: [ 'status' ],
    });

    // 2. 财务大盘统计
    // 今日实收
    const todayRevenue = await ctx.model.PaymentRecord.sum('amount', {
      where: { 
        org_id: orgId, 
        trade_type: 1, 
        trade_time: { [Op.gte]: today } 
      }
    }) || 0;

    // 本月累计实收
    const monthRevenue = await ctx.model.PaymentRecord.sum('amount', {
      where: { 
        org_id: orgId, 
        trade_type: 1, 
        trade_time: { [Op.gte]: monthStart } 
      }
    }) || 0;

    // 待收总额与逾期金额
    const unpaidBills = await ctx.model.Bill.findAll({
      where: { org_id: orgId, status: 0 },
      attributes: [ 'due_date', 'amount_due' ]
    });

    let totalPending = 0;
    let totalOverdue = 0;
    const now = dayjs();
    unpaidBills.forEach(b => {
      const amt = parseFloat(b.amount_due);
      totalPending += amt;
      if (dayjs(b.due_date).isBefore(now)) {
        totalOverdue += amt;
      }
    });

    // 3. 租约变动统计
    // 30 天内即将到期的租约
    const expiringSoonCount = await ctx.model.Lease.count({
      where: {
        org_id: orgId,
        status: 1,
        end_date: {
          [Op.between]: [ today, dayjs().add(30, 'day').toDate() ]
        }
      }
    });

    return {
      rooms: {
        total: roomStats.reduce((s, r) => s + parseInt(r.get('count')), 0),
        rented: roomStats.find(r => r.status === 1)?.get('count') || 0,
        vacant: roomStats.find(r => r.status === 0)?.get('count') || 0,
        reserved: roomStats.find(r => r.status === 2)?.get('count') || 0,
      },
      finance: {
        todayRevenue,
        monthRevenue,
        totalPending,
        totalOverdue,
      },
      leases: {
        expiringSoon: expiringSoonCount,
      }
    };
  }
}

module.exports = OpsService;

'use strict';

const Service = require('egg').Service;

class SupportService extends Service {
  /**
   * 租客发起在线报修 (Create Work Order)
   * @param {Object} data - { leaseId, roomId, title, description, images, urgencyLevel }
   */
  async createWorkOrder(data) {
    const { ctx } = this;
    const userId = ctx.state.user.uid;

    // 1. 确认报修合法性：该租客在此房源下是否有生效租约
    const lease = await ctx.model.Lease.findOne({
      where: { id: data.lease_id, status: 1 },
      include: [
        { 
          model: ctx.model.Tenant, 
          as: 'tenant', 
          where: { tenant_user_id: userId },
        },
      ],
    });

    if (!lease) ctx.throw(403, '无权针对此租约发起报修');

    // 2. 自动补充内部参数并创建工单
    const record = await ctx.model.WorkOrder.create({
      org_id: lease.org_id,
      room_id: lease.room_id,
      lease_id: lease.id,
      tenant_user_id: userId,
      title: data.title,
      description: data.description,
      images: data.images,
      urgency_level: data.urgency_level || 1,
      status: 0, // 待处理
    });

    return record;
  }

  /**
   * 查询个人历史工单进度
   */
  async myWorkOrders() {
    const { ctx } = this;
    const userId = ctx.state.user.uid;

    return await ctx.model.WorkOrder.findAll({
      where: { tenant_user_id: userId },
      include: [
        { model: ctx.model.Room, as: 'room', include: [{ model: ctx.model.Project, as: 'project' }] },
      ],
      order: [['created_at', 'DESC']],
    });
  }
}

module.exports = SupportService;

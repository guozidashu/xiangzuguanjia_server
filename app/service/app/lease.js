'use strict';

const Service = require('egg').Service;

class LeaseService extends Service {
  /**
   * 查询租客名下的所有租约 (跨机构聚合)
   */
  async myLeases() {
    const { ctx, app } = this;
    const userId = ctx.state.user.uid; 

    // 1. 查找此用户关联的所有机构内租客档案
    const tenants = await ctx.model.Tenant.findAll({
      where: { tenant_user_id: userId },
      attributes: ['id'],
    });
    const tenantIds = tenants.map(t => t.id);
    if (!tenantIds || tenantIds.length === 0) return [];

    // 2. 查询这些租客档案下的所有租约，并关联房源与机构信息
    return await ctx.model.Lease.findAll({
      where: { tenant_id: tenantIds },
      include: [
        { 
          model: ctx.model.Room, 
          as: 'room', 
          include: [{ model: ctx.model.Project, as: 'project' }] 
        },
        { 
          model: ctx.model.Org, 
          as: 'organization', 
          attributes: ['name', 'logo'] 
        },
      ],
      order: [['status', 'ASC'], ['created_at', 'DESC']], // 生效中的排在前面
    });
  }

  /**
   * 查看租约详情
   */
  async detail(id) {
    const { ctx } = this;
    const userId = ctx.state.user.uid;

    const lease = await ctx.model.Lease.findOne({
      where: { id },
      include: [
        { 
          model: ctx.model.Tenant, 
          as: 'tenant', 
          where: { tenant_user_id: userId }, // 强制校验归属权
          attributes: ['id', 'name', 'phone'],
        },
        { model: ctx.model.Room, as: 'room', include: [{ model: ctx.model.Project, as: 'project' }] },
        { model: ctx.model.Org, as: 'organization' },
        { model: ctx.model.LeaseDocument, as: 'documents' },
      ],
    });

    if (!lease) ctx.throw(404, '租约不存在或无权查看');
    return lease;
  }
}

module.exports = LeaseService;

'use strict';

const Service = require('egg').Service;

class TenantService extends Service {
  /**
   * 租客列表 (Admin)
   */
  /**
   * 租客列表 (Admin)
   */
  async list(params) {
    const { ctx, app } = this;
    const { org_id } = ctx;
    const { page = 1, page_size = 10, name, phone, status } = params;
    const { Op } = app.Sequelize;

    const where = { org_id };
    if (name) where.name = { [Op.like]: `%${name}%` };
    if (phone) where.phone = { [Op.like]: `%${phone}%` };
    if (status !== undefined) where.status = status;

    const { rows, count } = await ctx.model.Tenant.findAndCountAll({
      where,
      offset: (page - 1) * page_size,
      limit: parseInt(page_size),
      order: [[ 'created_at', 'DESC' ]],
    });

    return { 
      list: rows, 
      total: count, 
      page: parseInt(page), 
      page_size: parseInt(page_size) 
    };
  }

  /**
   * 租客详情 (含其名下租约)
   */
  async detail(id) {
    const { ctx } = this;
    const tenant = await ctx.model.Tenant.findOne({
      where: { id, org_id: ctx.org_id },
      include: [
        { 
          model: ctx.model.Lease, 
          as: 'leases',
          include: [{ model: ctx.model.Room, as: 'room', include: [{ model: ctx.model.Project, as: 'project' }] }]
        }
      ],
    });

    if (!tenant) ctx.throw(404, '租客不存在');
    return tenant;
  }

  /**
   * 更新租客信息
   */
  async update(id, data) {
    const { ctx } = this;
    const tenant = await ctx.model.Tenant.findOne({
      where: { id, org_id: ctx.org_id },
    });
    if (!tenant) ctx.throw(404, '租客不存在');
    return await tenant.update(data);
  }

  /**
   * 删除租客 (通常是逻辑删除或禁用)
   */
  async delete(id) {
    const { ctx } = this;
    const tenant = await ctx.model.Tenant.findOne({
      where: { id, org_id: ctx.org_id },
    });
    if (!tenant) ctx.throw(404, '租客不存在');
    
    // 检查是否有活跃租约
    const active_lease = await ctx.model.Lease.findOne({
      where: { tenant_id: id, status: 1 }
    });
    if (active_lease) ctx.throw(400, '该租客尚有生效中的租约，不能删除');

    return await tenant.update({ status: 0 }); // 设定为禁用状态
  }
}

module.exports = TenantService;

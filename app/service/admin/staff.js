'use strict';

const Service = require('egg').Service;

class StaffService extends Service {
  /**
   * 分页获取机构员工列表
   * @param {Object} params - { name, phone, status, page, pageSize }
   */
  async list(params) {
    const { ctx, app } = this;
    const { name, phone, status, page = 1, pageSize = 20 } = params;
    const offset = (Math.max(1, page) - 1) * pageSize;

    const where = { org_id: ctx.orgId };
    if (name) where.name = { [app.Sequelize.Op.like]: `%${name}%` };
    if (phone) where.phone = phone;
    if (status !== undefined) where.status = status;

    const { rows, count } = await ctx.model.OrgStaff.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      order: [[ 'created_at', 'DESC' ]],
      attributes: { exclude: [ 'password_hash' ] }, // 列表不返回密码哈希
    });

    return { list: rows, total: count, page: parseInt(page), pageSize: parseInt(pageSize) };
  }

  /**
   * 创建员工账号
   */
  async create(data) {
    const { ctx } = this;
    const { orgId } = ctx;

    // 手机号唯一性校验 (同机构内)
    const exists = await ctx.model.OrgStaff.findOne({
      where: { org_id: orgId, phone: data.phone },
    });
    if (exists) ctx.throw(422, '该手机号已在机构中注册');

    // 补充机构 ID
    data.org_id = orgId;
    
    // 注意：实际应使用 bcrypt 对 data.password 进行哈希处理
    // 此处简化处理
    data.password_hash = data.password || '123456'; 

    return await ctx.model.OrgStaff.create(data);
  }

  /**
   * 更新员工基本信息
   */
  async update(id, data) {
    const { ctx } = this;
    const staff = await ctx.model.OrgStaff.findOne({
      where: { id, org_id: ctx.orgId },
    });
    if (!staff) ctx.throw(404, '员工不存在');

    // 不允许直接更新 ID 和 机构 ID
    delete data.id;
    delete data.org_id;

    return await staff.update(data);
  }

  /**
   * 细粒度权限点指派 (全量覆盖式)
   * @param {Number} staffId - 员工ID
   * @param {Array} permissionCodes - ['ROOM_EDIT', 'FINANCE_EDIT', ...]
   */
  async setPermissions(staffId, permissionCodes) {
    const { ctx } = this;
    const { orgId } = ctx;

    // 校验员工合法性
    const staff = await ctx.model.OrgStaff.findOne({
      where: { id: staffId, org_id: orgId },
    });
    if (!staff) ctx.throw(404, '员工不存在');

    return await ctx.model.transaction(async t => {
      // 1. 清空旧权限
      await ctx.model.OrgStaffPermission.destroy({
        where: { staff_id: staffId, org_id: orgId },
        transaction: t,
      });

      // 2. 批量写入新权限
      if (permissionCodes && permissionCodes.length > 0) {
        const records = permissionCodes.map(code => ({
          org_id: orgId,
          staff_id: staffId,
          permission_code: code,
        }));
        await ctx.model.OrgStaffPermission.bulkCreate(records, { transaction: t });
      }

      return true;
    });
  }
}

module.exports = StaffService;

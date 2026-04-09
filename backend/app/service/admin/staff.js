'use strict';

const Service = require('egg').Service;

class StaffService extends Service {
  /**
   * 分页获取机构员工列表
   * @param {Object} params - { name, phone, status, page, page_size }
   */
  async list(params) {
    const { ctx, app } = this;
    const { page = 1, page_size = 20, employee_name, phone } = params;
    const { Op } = app.Sequelize;

    const where = { org_id: ctx.org_id };
    if (employee_name) where.name = { [Op.like]: `%${employee_name}%` };
    if (phone) where.phone = { [Op.like]: `%${phone}%` };

    const { count, rows } = await ctx.model.OrgStaff.findAndCountAll({
      where,
      offset: (page - 1) * page_size,
      limit: parseInt(page_size),
      order: [['id', 'DESC']],
      attributes: { exclude: ['password_hash'] },
    });

    return {
      total: count,
      list: rows,
      page: parseInt(page),
      page_size: parseInt(page_size),
    };
  }

  /**
   * 创建员工账号
   */
  async create(data) {
    const { ctx } = this;
    const { org_id } = ctx;

    // 手机号唯一性校验 (同机构内)
    const exists = await ctx.model.OrgStaff.findOne({
      where: { org_id: org_id, phone: data.phone },
    });
    if (exists) ctx.throw(422, '该手机号已在机构中注册');

    // 补充机构 ID
    data.org_id = org_id;

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
      where: { id, org_id: ctx.org_id },
    });
    if (!staff) ctx.throw(404, '员工不存在');

    // 不允许直接更新 ID 和 机构 ID
    delete data.id;
    delete data.org_id;

    return await staff.update(data);
  }

  /**
   * 分派权限
   */
  async setPermissions(params) {
    const { ctx } = this;
    const { staff_id, permission_codes } = params;

    const staff = await ctx.model.OrgStaff.findOne({
      where: { id: staff_id, org_id: ctx.org_id },
    });
    if (!staff) ctx.throw(404, '该员工不存在');

    await ctx.model.OrgStaffPermission.destroy({
      where: { staff_id, org_id: ctx.org_id },
    });

    if (permission_codes && permission_codes.length > 0) {
      const records = permission_codes.map(code => ({
        org_id: ctx.org_id,
        staff_id,
        permission_code: code,
      }));
      await ctx.model.OrgStaffPermission.bulkCreate(records);
    }

    return true;
  }
}

module.exports = StaffService;

'use strict';

const Service = require('egg').Service;

class ProjectService extends Service {
  /**
   * 获取项目列表 (轻量化，用于下拉菜单)
   */
  async list() {
    const { ctx } = this;
    const projects = await ctx.model.Project.findAll({
      where: { org_id: ctx.org_id },
      order: [[ 'id', 'DESC' ]],
    });
    return projects;
  }

  async findDetail(id) {
    const { ctx } = this;
    const project = await ctx.model.Project.findOne({
      where: { id, org_id: ctx.org_id },
    });
    if (!project) ctx.throw(404, '项目不存在');
    return project;
  }
}

module.exports = ProjectService;

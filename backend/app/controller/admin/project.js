'use strict';

const Controller = require('egg').Controller;

class ProjectController extends Controller {
  /**
   * 获取机构下的小区/项目列表 (POST /api/v1/projects/list)
   */
  async index() {
    const { ctx, service } = this;
    const list = await service.admin.project.list();
    ctx.helper.success(ctx, list);
  }

  /**
   * 获取项目详情 (POST /api/v1/projects/detail)
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.request.body;
    if (!id) {
      return ctx.helper.fail(ctx, 400, '缺少项目 ID');
    }
    const project = await service.admin.project.detail(id);
    ctx.helper.success(ctx, project);
  }
}

module.exports = ProjectController;

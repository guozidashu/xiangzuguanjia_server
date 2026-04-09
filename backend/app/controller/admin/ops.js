'use strict';

const Controller = require('egg').Controller;

class OpsController extends Controller {
  /**
   * 手工录入抄表读数 (POST /api/v1/ops/readings)
   */
  async recordReading() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      device_id: 'number',
      reading_value: 'number',
      room_id: 'number',
      lease_id: 'number?',
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '参数校验异常', err.errors);
    }

    const reading = await service.admin.ops.recordMeterReading(body);

    ctx.helper.success(ctx, reading, '读数录入及分摊账单生成成功');
  }

  /**
   * 获取小区项目盈利分析报表 (POST /api/v1/ops/projects/report)
   * 从 body 获取 project_id
   */
  async getProjectReport() {
    const { ctx, service } = this;
    const { project_id } = ctx.request.body;

    if (!project_id) {
      return ctx.helper.fail(ctx, 400, '缺少项目 ID');
    }

    const report = await service.admin.ops.getProjectReport(project_id);

    ctx.helper.success(ctx, report);
  }

  /**
   * 全机构运营看板 (POST /api/v1/admin/dashboard)
   */
  async getDashboard() {
    const { ctx, service } = this;
    const projectId = ctx.project_id;
    const stats = await service.admin.ops.getDashboardStats(projectId);
    ctx.helper.success(ctx, stats);
  }
}

module.exports = OpsController;

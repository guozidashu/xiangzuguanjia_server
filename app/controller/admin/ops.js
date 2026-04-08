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
      deviceId: 'number',
      readingValue: 'number',
      roomId: 'number',
      leaseId: 'number',
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
   * 从 body 获取 projectId
   */
  async getProjectReport() {
    const { ctx, service } = this;
    const { projectId } = ctx.request.body;

    if (!projectId) {
      return ctx.helper.fail(ctx, 400, '缺少项目 ID');
    }

    const report = await service.admin.ops.getProjectReport(projectId);

    ctx.helper.success(ctx, report);
  }

  /**
   * 全机构运营看板 (POST /api/v1/admin/dashboard)
   */
  async getDashboard() {
    const { ctx, service } = this;
    const stats = await service.admin.ops.getDashboardStats();
    ctx.helper.success(ctx, stats);
  }
}

module.exports = OpsController;

'use strict';

const Controller = require('egg').Controller;

class RoomController extends Controller {
  /**
   * 分页查看房源库 (POST /api/v1/rooms/list)
   * 改为 POST 访问，从 body 中获取分页与过滤参数
   */
  async index() {
    const { ctx, service } = this;
    const body = ctx.request.body; // 获取 POST body

    // 支持从 body 中拉取参数，默认值处理
    const params = {
      page: body.page || 1,
      pageSize: body.pageSize || 20,
      roomNumber: body.roomNumber,
      projectId: body.projectId,
      status: body.status,
    };

    const result = await service.admin.room.list(params);

    ctx.helper.success(ctx, result, '查询成功');
  }

  /**
   * 新增房源记录 (POST /api/v1/rooms/create)
   */
  async create() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      project_id: 'number',
      room_number: 'string',
      rent_price: 'number',
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      // 全局错误中间件会捕获 validate 抛出的错误，但此处我们手动返回 422 也是一种选择
      // 这里的 ctx.validate 在 egg-validate 中如果不传参数，校验失败会抛出异常
      ctx.validate(rules, body);
    }

    const room = await service.admin.room.create(body);

    ctx.helper.success(ctx, room, '房源创建成功');
  }

  /**
   * 查看房源详情 (POST /api/v1/rooms/detail)
   * 改为 POST 访问，从 body 获取 id
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.request.body;

    if (!id) {
      return ctx.helper.fail(ctx, 400, '缺少房源 ID');
    }

    const room = await service.admin.room.detail(id);

    ctx.helper.success(ctx, room);
  }

  /**
   * 更新房源信息 (POST /api/v1/rooms/update)
   */
  async update() {
    const { ctx, service } = this;
    const { id, ...updateData } = ctx.request.body;

    if (!id) {
      return ctx.helper.fail(ctx, 400, '缺少待更新的房源 ID');
    }

    const room = await service.admin.room.update(id, updateData);

    ctx.helper.success(ctx, room, '更新成功');
  }

  /**
   * 删除房源 (POST /api/v1/rooms/delete)
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.request.body;

    if (!id) {
      return ctx.helper.fail(ctx, 400, '缺少待删除的房源 ID');
    }

    await service.admin.room.destroy(id);

    ctx.helper.success(ctx, null, '删除成功');
  }
}

module.exports = RoomController;

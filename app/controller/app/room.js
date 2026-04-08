'use strict';

const Controller = require('egg').Controller;

class RoomController extends Controller {
  /**
   * 租客端：查看公开房源列表 (POST /api/app/rooms/list)
   * 改为 POST 访问，从 body 获取过滤条件
   */
  async index() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    
    // 基础过滤参数
    const params = {
      page: body.page || 1,
      pageSize: body.pageSize || 10,
      projectId: body.projectId,
      status: 0, // 租客端仅展示空置房源
    };

    const list = await service.admin.room.list(params);
    
    ctx.helper.success(ctx, list, '获取房源成功');
  }
}

module.exports = RoomController;

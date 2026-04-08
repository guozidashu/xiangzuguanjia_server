'use strict';

const Service = require('egg').Service;

class RoomService extends Service {
  /**
   * 分页查询房源列表 (带租户隔离)
   * @param {Object} params - 过滤参数
   * @return {Promise} { list, total }
   */
  async list(params) {
    const { ctx, app } = this;
    const { page = 1, pageSize = 20, roomNumber, projectId, status } = params;
    const offset = (Math.max(1, page) - 1) * pageSize;

    // 核心 SaaS 隔离逻辑：只能查到自己机构的数据
    const where = {
      org_id: ctx.orgId,
    };

    if (roomNumber) {
      where.room_number = { [app.Sequelize.Op.like]: `%${roomNumber}%` };
    }
    if (projectId) {
      where.project_id = projectId;
    }
    if (status !== undefined && status !== '') {
      where.status = status;
    }

    const { rows, count } = await ctx.model.Room.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      include: [
        { model: ctx.model.Project, as: 'project', attributes: [ 'name', 'address' ] },
        { model: ctx.model.OrgStaff, as: 'manager', attributes: [ 'name' ] },
      ],
      order: [[ 'created_at', 'DESC' ]],
    });

    return {
      list: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    };
  }

  /**
   * 创建房源
   * @param {Object} payload - 房源数据
   * @return {Promise} room
   */
  async create(payload) {
    const { ctx } = this;
    
    // 1. 强制注入租户 ID，防止越权创建
    payload.org_id = ctx.orgId;

    // 2. 业务校验：同一个项目/小区内房号不可重复
    const exists = await ctx.model.Room.findOne({
      where: {
        org_id: ctx.orgId,
        project_id: payload.project_id,
        room_number: payload.room_number,
      },
    });

    if (exists) {
      ctx.throw(422, `该项目下已存在房号: ${payload.room_number}`);
    }

    // 3. 记录初始状态变更日志
    const room = await ctx.model.Room.create(payload);
    
    await ctx.model.RoomStatusLog.create({
      org_id: ctx.orgId,
      room_id: room.id,
      new_status: room.status,
      trigger_event: 'ROOM_CREATE',
      operator_id: ctx.state.user.uid,
    });

    return room;
  }

  /**
   * 房源详情
   * @param {Number} id - Room ID
   * @return {Promise} room
   */
  async detail(id) {
    const { ctx } = this;
    const room = await ctx.model.Room.findOne({
      where: { id, org_id: ctx.orgId },
      include: [
        { model: ctx.model.Project, as: 'project' },
        { model: ctx.model.OrgStaff, as: 'manager', attributes: [ 'name', 'phone' ] },
      ],
    });

    if (!room) {
      ctx.throw(404, '该房源不存在或您无权查看');
    }

    return room;
  }

  /**
   * 更新房源信息
   * @param {Number} id - Room ID
   * @param {Object} data - 更新数据
   */
  async update(id, data) {
    const { ctx } = this;
    const room = await this.detail(id); // 内部已含权限校验

    // 若修改房号，需重新校验冲突 (仅限同小区)
    if (data.room_number && data.room_number !== room.room_number) {
      const exists = await ctx.model.Room.findOne({
        where: {
          org_id: ctx.orgId,
          project_id: data.project_id || room.project_id,
          room_number: data.room_number,
          id: { [ctx.app.Sequelize.Op.ne]: id },
        },
      });
      if (exists) ctx.throw(422, `该项目下已存在房号: ${data.room_number}`);
    }

    return await room.update(data);
  }

  /**
   * 安全删除房源
   * @param {Number} id - Room ID
   */
  async destroy(id) {
    const { ctx } = this;
    const room = await this.detail(id);

    // 状态校验：只有“空置(0)”或“下架(4)”状态才允许删除
    if (![ 0, 4 ].includes(room.status)) {
      ctx.throw(422, '房源当前处于非离线状态，不可直接删除');
    }

    return await room.destroy();
  }
}

module.exports = RoomService;

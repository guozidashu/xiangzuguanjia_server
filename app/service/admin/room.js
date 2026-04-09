'use strict';

const Service = require('egg').Service;

class RoomService extends Service {
  /**
   * 分页查询房源列表 (带租户隔离)
   * 增强功能：支持逾期、到期筛选，自动关联租客/租约信息，计算空置天数
   * @param {Object} params - 过滤参数
   * @return {Promise} { list, total }
   */
  async list(params) {
    const { ctx, app } = this;
    const { page = 1, pageSize = 20, roomNumber, projectId, status, filterType } = params;
    const offset = (Math.max(1, page) - 1) * pageSize;
    const { Op } = app.Sequelize;

    // 1. 基础过滤条件
    const where = { org_id: ctx.orgId };
    if (roomNumber) {
      where.room_number = { [Op.like]: `%${roomNumber}%` };
    }
    if (projectId) {
      where.project_id = projectId;
    }
    if (status !== undefined && status !== '') {
      where.status = status;
    }

    // 2. 核心：处理业务逻辑筛选 (filterType)
    // 注意：这里我们可能需要通过关联表 ID 列表来进行过滤
    if (filterType) {
      const now = new Date();
      if (filterType === 'overdue') {
        // 筛选有欠费账单的房源 (status < 2 且已过应缴日)
        const overdueBills = await ctx.model.Bill.findAll({
          attributes: [ 'room_id' ],
          where: {
            org_id: ctx.orgId,
            status: { [Op.lt]: 2 },
            due_date: { [Op.lt]: now },
          },
          group: [ 'room_id' ],
        });
        where.id = { [Op.in]: overdueBills.map(b => b.room_id) };
      } else if (filterType === 'expiring_15') {
        // 筛选 15 天内到期的房源 (有效租约的 end_date)
        const expiringDate = new Date();
        expiringDate.setDate(now.getDate() + 15);
        const expiringLeases = await ctx.model.Lease.findAll({
          attributes: [ 'room_id' ],
          where: {
            org_id: ctx.orgId,
            status: 1, // 生效中
            end_date: { [Op.between]: [ now, expiringDate ] },
          },
          group: [ 'room_id' ],
        });
        where.id = { [Op.in]: expiringLeases.map(l => l.room_id) };
      } else if (filterType === 'expired') {
        // 筛选已过期的房源 (生效中租约但时间已过，或系统未及时变更状态的)
        const expiredLeases = await ctx.model.Lease.findAll({
          attributes: [ 'room_id' ],
          where: {
            org_id: ctx.orgId,
            status: 1,
            end_date: { [Op.lt]: now },
          },
          group: [ 'room_id' ],
        });
        where.id = { [Op.in]: expiredLeases.map(l => l.room_id) };
      }
    }

    // 3. 执行主查询
    const { rows, count } = await ctx.model.Room.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      include: [
        { model: ctx.model.Project, as: 'project', attributes: [ 'name', 'address' ] },
        { model: ctx.model.OrgStaff, as: 'manager', attributes: [ 'name' ] },
      ],
      order: [[ 'created_at', 'DESC' ]],
      distinct: true, // 防止关联查询导致的分页计数错误
    });

    // 4. 组装展示层数据 (补充租约、租客、空置天数、欠费状态)
    const list = await Promise.all(rows.map(async room => {
      const item = room.toJSON();
      
      // 获取当前生效租约及租客
      const currentLease = await ctx.model.Lease.findOne({
        where: { room_id: room.id, status: 1 },
        include: [{ model: ctx.model.Tenant, as: 'tenant', attributes: [ 'name', 'phone' ] }],
      });
      item.currentLease = currentLease;

      // 检查该房间是否有欠费 (实时判断)
      const hasArrears = await ctx.model.Bill.findOne({
        where: {
          room_id: room.id,
          status: { [Op.lt]: 2 },
          due_date: { [Op.lt]: new Date() },
        },
      });
      item.hasArrears = !!hasArrears;

      // 如果是空置房，计算空置天数
      if (room.status === 0) {
        // 找最近的一份已退记录
        const lastLease = await ctx.model.Lease.findOne({
          where: { room_id: room.id, status: { [Op.gte]: 2 } },
          order: [[ 'checkout_date', 'DESC' ], [ 'end_date', 'DESC' ]],
        });
        const baseDate = lastLease ? (lastLease.checkout_date || lastLease.end_date) : room.created_at;
        const diff = Math.max(0, new Date() - new Date(baseDate));
        item.vacancy_days = Math.floor(diff / (1000 * 60 * 60 * 24));
      } else {
        item.vacancy_days = 0;
      }

      return item;
    }));

    return {
      list,
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

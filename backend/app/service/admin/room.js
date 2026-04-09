'use strict';

const Service = require('egg').Service;

class RoomService extends Service {
  /**
   * 分页查询房源列表 (带租户隔离)
   * 增强功能：支持逾期、到期筛选，自动关联租客/租约信息，计算空置天数
   * @param {Object} params - 过滤参数
   * @return {Promise} { list, total }
   */
  /**
   * @param {Object} params - 过滤参数
   * @return {Promise} { list, total }
   */
  async list(params) {
    const { ctx, app } = this;
    const { page = 1, page_size = 20, room_number, project_id, status, filter } = params;
    const offset = (Math.max(1, page) - 1) * page_size;
    const { Op } = app.Sequelize;
    const dayjs = require('dayjs');

    const where = { org_id: ctx.org_id };
    if (room_number) where.room_number = { [Op.like]: `%${room_number}%` };
    if (project_id) where.project_id = project_id;

    // 状态筛选：前端 0-4
    if (status !== undefined && status !== '') where.status = status;

    // 高级业务筛选 (基于前端 filter 字符串)
    const now = new Date();
    if (filter === 'bill_overdue') {
      const overdue_bills = await ctx.model.Bill.findAll({
        attributes: ['room_id'],
        where: {
          org_id: ctx.org_id,
          status: { [Op.lt]: 2 },
          due_date: { [Op.lt]: now },
        },
        group: ['room_id'],
      });
      where.id = { [Op.in]: overdue_bills.map(b => b.room_id) };
    } else if (filter === 'bill_expiring') {
      // 7天内逾期
      const expiring_date = dayjs().add(7, 'day').toDate();
      const expiring_bills = await ctx.model.Bill.findAll({
        attributes: ['room_id'],
        where: {
          org_id: ctx.org_id,
          status: { [Op.lt]: 2 },
          due_date: { [Op.between]: [now, expiring_date] },
        },
        group: ['room_id'],
      });
      where.id = { [Op.in]: expiring_bills.map(b => b.room_id) };
    } else if (filter === 'lease_expiring') {
      // 15天租期到期
      const expiring_date = dayjs().add(15, 'day').toDate();
      const expiring_leases = await ctx.model.Lease.findAll({
        attributes: ['room_id'],
        where: {
          org_id: ctx.org_id,
          status: 1, // 生效中
          end_date: { [Op.between]: [now, expiring_date] },
        },
        group: ['room_id'],
      });
      where.id = { [Op.in]: expiring_leases.map(l => l.room_id) };
    } else if (filter === 'lease_expired') {
      // 租期已过期
      const expired_leases = await ctx.model.Lease.findAll({
        attributes: ['room_id'],
        where: {
          org_id: ctx.org_id,
          status: 1,
          end_date: { [Op.lt]: now },
        },
        group: ['room_id'],
      });
      where.id = { [Op.in]: expired_leases.map(l => l.room_id) };
    }

    // A. 执行房源列表查询 (带关联)
    const { rows, count } = await ctx.model.Room.findAndCountAll({
      where,
      limit: parseInt(page_size),
      offset: parseInt(offset),
      include: [
        { model: ctx.model.Project, as: 'project', attributes: ['name', 'address'] },
        {
          model: ctx.model.Lease,
          as: 'current_lease',
          required: false,
          where: { status: 1 }, // 仅关联生效中租约
          include: [{ model: ctx.model.Tenant, as: 'tenant', attributes: ['id', 'name', 'phone'] }]
        }
      ],
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    // B. 执行统计聚合 (仅基于项目隔离，忽略列表过滤)
    const stats_where = { org_id: ctx.org_id };
    if (project_id) stats_where.project_id = project_id;

    const raw_stats = await ctx.model.Room.findAll({
      where: stats_where,
      attributes: [
        'status',
        [app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'count']
      ],
      group: ['status'],
    });

    const statistics = {
      total: 0,
      vacant: 0,     // 0
      occupied: 0,   // 1
      reserved: 0,   // 2
      maintenance: 0, // 3
      offline: 0     // 4
    };

    raw_stats.forEach(r => {
      const s = parseInt(r.get('status'));
      const c = parseInt(r.get('count'));
      statistics.total += c;
      if (s === 0) statistics.vacant = c;
      else if (s === 1) statistics.occupied = c;
      else if (s === 2) statistics.reserved = c;
      else if (s === 3) statistics.maintenance = c;
      else if (s === 4) statistics.offline = c;
    });

    // 1. 获取所有有逾期账单的房间 ID (用于标记红点)
    const overdueRoomIds = await ctx.model.Bill.findAll({
      attributes: ['room_id'],
      where: {
        org_id: ctx.org_id,
        status: { [Op.lt]: 2 }, // 未结清
        due_date: { [Op.lt]: now } // 已逾期
      },
      group: ['room_id']
    }).then(res => res.map(r => r.room_id));

    // C. 列表二次加工：计算空置天数 + 注入欠费标识
    const list = rows.map(room => {
      const item = room.toJSON();

      // 标记欠费/逾期提醒
      item.has_arrears = overdueRoomIds.includes(room.id);

      if (room.status === 0) {
        // 简化空置计算逻辑：如果没有历史租约，使用创建时间
        item.vacancy_days = dayjs().diff(dayjs(room.created_at), 'day');
      } else {
        item.vacancy_days = 0;
      }
      return item;
    });

    return {
      list,
      total: count,
      statistics,
      page: parseInt(page),
      page_size: parseInt(page_size),
    };
  }

  /**
   * 创建房源
   */
  async create(payload) {
    const { ctx } = this;
    payload.org_id = ctx.org_id;

    // 校验同项目房号
    const exists = await ctx.model.Room.findOne({
      where: {
        org_id: ctx.org_id,
        project_id: payload.project_id,
        room_number: payload.room_number,
      },
    });
    if (exists) ctx.throw(422, `该项目下已存在房号: ${payload.room_number}`);

    const room = await ctx.model.Room.create(payload);

    await ctx.model.RoomStatusLog.create({
      org_id: ctx.org_id,
      room_id: room.id,
      new_status: room.status,
      trigger_event: 'ROOM_CREATE',
      operator_id: ctx.state.user.uid,
    });

    return room;
  }

  /**
   * 房源详情
   */
  async detail(id) {
    const { ctx } = this;
    const room = await ctx.model.Room.findOne({
      where: { id, org_id: ctx.org_id },
      include: [
        { model: ctx.model.Project, as: 'project' },
        {
          model: ctx.model.Device,
          as: 'devices',
          where: { org_id: ctx.org_id },
          required: false
        }
      ],
    });

    if (!room) ctx.throw(404, '房源不存在');
    return room;
  }

  /**
   * 更新房源信息
   */
  async update(id, data) {
    const { ctx } = this;
    const room = await this.detail(id);

    if (data.room_number && data.room_number !== room.room_number) {
      const exists = await ctx.model.Room.findOne({
        where: {
          org_id: ctx.org_id,
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
   */
  async destroy(id) {
    const room = await this.detail(id);
    if (![0, 4].includes(room.status)) {
      this.ctx.throw(422, '房源当前处于非离线状态，不可直接删除');
    }
    return await room.destroy();
  }
}

module.exports = RoomService;

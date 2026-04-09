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
   * 分页查询房源列表 (带租户隔离)
   * @param {Object} params - 过滤参数
   * @return {Promise} { list, total }
   */
  async list(params) {
    const { ctx, app } = this;
    const { page = 1, page_size = 20, room_number, project_id, status, overdue, expiring_15, expired } = params;
    const offset = (Math.max(1, page) - 1) * page_size;
    const { Op } = app.Sequelize;
    const dayjs = require('dayjs');

    const where = { org_id: ctx.org_id };
    if (room_number) where.room_number = { [Op.like]: `%${room_number}%` };
    if (project_id) where.project_id = project_id;
    if (status !== undefined && status !== '') where.status = status;

    // 高级业务筛选
    const now = new Date();
    if (overdue === 'true') {
      const overdue_bills = await ctx.model.Bill.findAll({
        attributes: [ 'room_id' ],
        where: {
          org_id: ctx.org_id,
          status: { [Op.lt]: 2 },
          due_date: { [Op.lt]: now },
        },
        group: [ 'room_id' ],
      });
      where.id = { [Op.in]: overdue_bills.map(b => b.room_id) };
    } else if (expiring_15 === 'true') {
      const expiring_date = dayjs().add(15, 'day').toDate();
      const expiring_leases = await ctx.model.Lease.findAll({
        attributes: [ 'room_id' ],
        where: {
          org_id: ctx.org_id,
          status: 1,
          end_date: { [Op.between]: [ now, expiring_date ] },
        },
        group: [ 'room_id' ],
      });
      where.id = { [Op.in]: expiring_leases.map(l => l.room_id) };
    } else if (expired === 'true') {
      const expired_leases = await ctx.model.Lease.findAll({
        attributes: [ 'room_id' ],
        where: {
          org_id: ctx.org_id,
          status: 1,
          end_date: { [Op.lt]: now },
        },
        group: [ 'room_id' ],
      });
      where.id = { [Op.in]: expired_leases.map(l => l.room_id) };
    }

    const { rows, count } = await ctx.model.Room.findAndCountAll({
      where,
      limit: parseInt(page_size),
      offset: parseInt(offset),
      include: [
        { model: ctx.model.Project, as: 'project', attributes: [ 'name', 'address' ] },
      ],
      order: [[ 'created_at', 'DESC' ]],
      distinct: true,
    });

    const list = await Promise.all(rows.map(async room => {
      const item = room.toJSON();
      
      const current_lease = await ctx.model.Lease.findOne({
        where: { room_id: room.id, status: 1 },
        include: [{ model: ctx.model.Tenant, as: 'tenant', attributes: [ 'name', 'phone' ] }],
      });
      item.current_lease = current_lease;

      const has_arrears = await ctx.model.Bill.findOne({
        where: {
          room_id: room.id,
          status: { [Op.lt]: 2 },
          due_date: { [Op.lt]: now },
        },
      });
      item.has_arrears = !!has_arrears;

      if (room.status === 0) {
        const last_lease = await ctx.model.Lease.findOne({
          where: { room_id: room.id, status: { [Op.gte]: 2 } },
          order: [[ 'checkout_date', 'DESC' ], [ 'end_date', 'DESC' ]],
        });
        const base_date = last_lease ? (last_lease.checkout_date || last_lease.end_date) : room.created_at;
        item.vacancy_days = dayjs().diff(dayjs(base_date), 'day');
      } else {
        item.vacancy_days = 0;
      }

      return item;
    }));

    return {
      list,
      total: count,
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
    if (![ 0, 4 ].includes(room.status)) {
      this.ctx.throw(422, '房源当前处于非离线状态，不可直接删除');
    }
    return await room.destroy();
  }
}

module.exports = RoomService;

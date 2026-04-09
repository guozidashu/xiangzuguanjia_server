import { http } from "@/utils/requestService/mainService";

export default {

    // 认证相关 API
    async login(data = {}, params = {}) {
        return http.middleware({
            title: "登录",
            method: "post",
            url: "/auth/login",
            data: data,
            params: params,
            custom: {
                token: false,
                loading: true,
                project: false  // 登录时不需要项目ID
            },
        });
    },

    async getUserInfo(data = {}, params = {}) {
        return http.middleware({
            title: "获取用户信息",
            method: "post",
            url: "/auth/info",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false  // 获取用户信息不需要项目ID
            },
        });
    },

    async changePassword(data = {}, params = {}) {
        return http.middleware({
            title: "修改密码",
            method: "post",
            url: "/auth/change-password",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false  // 修改密码不需要项目ID
            },
        });
    },

    // 公告通知 API
    async getAnnouncementList(data = {}, params = {}) {
        return http.middleware({
            title: "获取公告列表",
            method: "post",
            url: "/announcements",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getAnnouncementStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取公告统计",
            method: "post",
            url: "/announcements/statistics",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async getAnnouncementDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取公告详情",
            method: "post",
            url: "/announcements/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async createAnnouncement(data = {}, params = {}) {
        return http.middleware({
            title: "创建公告",
            method: "post",
            url: "/announcements/create",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async updateAnnouncement(data = {}, params = {}) {
        return http.middleware({
            title: "更新公告",
            method: "post",
            url: "/announcements/update",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async deleteAnnouncement(data = {}, params = {}) {
        return http.middleware({
            title: "删除公告",
            method: "post",
            url: "/announcements/delete",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async publishAnnouncement(data = {}, params = {}) {
        return http.middleware({
            title: "发布公告",
            method: "post",
            url: "/announcements/publish",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async unpublishAnnouncement(data = {}, params = {}) {
        return http.middleware({
            title: "撤回公告",
            method: "post",
            url: "/announcements/unpublish",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    // 账单管理 API
    async getBillList(data = {}, params = {}) {
        return http.middleware({
            title: "获取账单列表",
            method: "post",
            url: "/bills",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getBillDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取账单详情",
            method: "post",
            url: "/bills/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getPaymentMethods(data = {}, params = {}) {
        return http.middleware({
            title: "获取支付方式",
            method: "post",
            url: "/bills/payment-methods",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async createBill(data = {}, params = {}) {
        return http.middleware({
            title: "创建账单",
            method: "post",
            url: "/bills/create",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },


    async cancelBill(data = {}, params = {}) {
        return http.middleware({
            title: "作废账单",
            method: "post",
            url: "/bills/cancel",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async generateElectricBill(data = {}, params = {}) {
        return http.middleware({
            title: "生成电费账单",
            method: "post",
            url: "/bills/generate-electric",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async deleteBill(data = {}, params = {}) {
        return http.middleware({
            title: "删除账单",
            method: "post",
            url: "/bills/delete",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async sendReminder(data = {}, params = {}) {
        return http.middleware({
            title: "发送催收提醒",
            method: "post",
            url: "/bills/send-reminder",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async splitBill(data = {}, params = {}) {
        return http.middleware({
            title: "拆分账单",
            method: "post",
            url: "/bills/split",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async calcHandoverSplit(data = {}, params = {}) {
        return http.middleware({
            title: "计算交接拆分",
            method: "post",
            url: "/bills/calc-handover-split",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async reactivateBill(data = {}, params = {}) {
        return http.middleware({
            title: "重新激活账单",
            method: "post",
            url: "/bills/reactivate",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async modifyBillNotes(data = {}, params = {}) {
        return http.middleware({
            title: "修改账单备注",
            method: "post",
            url: "/bills/modify-notes",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async modifyBillDueDate(data = {}, params = {}) {
        return http.middleware({
            title: "修改账单到期日期",
            method: "post",
            url: "/bills/modify-due-date",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async modifyBillAmount(data = {}, params = {}) {
        return http.middleware({
            title: "修改账单金额",
            method: "post",
            url: "/bills/modify-amount",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async payBill(data = {}, params = {}) {
        return http.middleware({
            title: "账单支付",
            method: "post",
            url: "/bills/pay",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async refundBill(data = {}, params = {}) {
        return http.middleware({
            title: "账单退款",
            method: "post",
            url: "/bills/refund",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getBillStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取账单统计",
            method: "post",
            url: "/bills/statistics",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async getLeaseBillList(data = {}, params = {}) {
        return http.middleware({
            title: "获取租约账单列表",
            method: "post",
            url: "/bills/lease-bills",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getLeaseBillStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取租约账单统计",
            method: "post",
            url: "/bills/lease-bill-statistics",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async getPaymentRecords(data = {}, params = {}) {
        return http.middleware({
            title: "获取支付记录",
            method: "post",
            url: "/bills/payments",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getBillChangeLogs(data = {}, params = {}) {
        return http.middleware({
            title: "获取账单变更记录",
            method: "post",
            url: "/bills/changes",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async exportBillList(data = {}, params = {}) {
        return http.middleware({
            title: "导出账单列表",
            method: "post",
            url: "/bills/export",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    // 租约管理 API
    async getLeaseList(data = {}, params = {}) {
        return http.middleware({
            title: "获取租约列表",
            method: "post",
            url: "/leases/list",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getLeaseStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取租约统计",
            method: "post",
            url: "/leases/statistics",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    // 租约结算相关
    async createSettlement(data = {}, params = {}) {
        return http.middleware({
            title: "创建结算单",
            method: "post",
            url: "/settlements/create",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async confirmSettlement(data = {}, params = {}) {
        return http.middleware({
            title: "确认结算",
            method: "post",
            url: "/settlements/confirm",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getSettlementList(data = {}, params = {}) {
        return http.middleware({
            title: "获取结算单列表",
            method: "post",
            url: "/settlements",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async getSettlementDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取结算单详情",
            method: "post",
            url: "/settlements/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async updateSettlementRefund(data = {}, params = {}) {
        return http.middleware({
            title: "更新退款状态",
            method: "post",
            url: "/settlements/update-refund",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },


    async getLeaseDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取租约详情",
            method: "post",
            url: "/leases/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async createLease(data = {}, params = {}) {
        return http.middleware({
            title: "创建租约",
            method: "post",
            url: "/leases/create",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async updateLease(data = {}, params = {}) {
        return http.middleware({
            title: "更新租约",
            method: "post",
            url: "/leases/update",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async renewLease(data = {}, params = {}) {
        return http.middleware({
            title: "续租",
            method: "post",
            url: "/leases/renew",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async changeRoom(data = {}, params = {}) {
        return http.middleware({
            title: "换房",
            method: "post",
            url: "/leases/change-room",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async modifyLease(data = {}, params = {}) {
        return http.middleware({
            title: "租约调整",
            method: "post",
            url: "/leases/modify",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },


    // 预付费管理 API
    async getPrepaidAccountList(data = {}, params = {}) {
        return http.middleware({
            title: "获取预付费账户列表",
            method: "post",
            url: "/prepaid/accounts",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getPrepaidAccountDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取预付费账户详情",
            method: "post",
            url: "/prepaid/accounts/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async rechargeAccount(data = {}, params = {}) {
        return http.middleware({
            title: "账户充值",
            method: "post",
            url: "/prepaid/accounts/recharge",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async deductAccount(data = {}, params = {}) {
        return http.middleware({
            title: "账户扣费",
            method: "post",
            url: "/prepaid/accounts/deduct",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getTransactionList(data = {}, params = {}) {
        return http.middleware({
            title: "获取交易记录",
            method: "post",
            url: "/prepaid/transactions",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getAccountBalance(data = {}, params = {}) {
        return http.middleware({
            title: "获取账户余额",
            method: "post",
            url: "/prepaid/accounts/balance",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async refundTransaction(data = {}, params = {}) {
        return http.middleware({
            title: "退款处理",
            method: "post",
            url: "/prepaid/transactions/refund",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async toggleAccountStatus(data = {}, params = {}) {
        return http.middleware({
            title: "切换账户状态",
            method: "post",
            url: "/prepaid/accounts/toggle-status",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    // 项目管理 API
    async getProjectList(data = {}, params = {}) {
        return http.middleware({
            title: "获取项目列表",
            method: "post",
            url: "/projects",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false  // 查询项目列表本身不需要项目ID
            },
        });
    },

    async getProjectDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取项目详情",
            method: "post",
            url: "/projects/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async createProject(data = {}, params = {}) {
        return http.middleware({
            title: "创建项目",
            method: "post",
            url: "/projects",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async updateProject(data = {}, params = {}) {
        return http.middleware({
            title: "更新项目",
            method: "post",
            url: "/projects/update",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async deleteProject(data = {}, params = {}) {
        return http.middleware({
            title: "删除项目",
            method: "post",
            url: "/projects/delete",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getProjectStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取项目统计信息",
            method: "post",
            url: "/projects/statistics",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    // 维修报修 API
    async getRepairList(data = {}, params = {}) {
        return http.middleware({
            title: "获取报修列表",
            method: "post",
            url: "/repairs",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getRepairDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取报修详情",
            method: "post",
            url: "/repairs/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async createRepair(data = {}, params = {}) {
        return http.middleware({
            title: "创建报修",
            method: "post",
            url: "/repairs/create",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async updateRepair(data = {}, params = {}) {
        return http.middleware({
            title: "更新报修",
            method: "post",
            url: "/repairs/update",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async assignRepair(data = {}, params = {}) {
        return http.middleware({
            title: "分配维修工",
            method: "post",
            url: "/repairs/assign",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async completeRepair(data = {}, params = {}) {
        return http.middleware({
            title: "完成维修",
            method: "post",
            url: "/repairs/complete",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async cancelRepair(data = {}, params = {}) {
        return http.middleware({
            title: "取消报修",
            method: "post",
            url: "/repairs/cancel",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getRepairStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取报修统计",
            method: "post",
            url: "/repairs/statistics",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    // 房间管理 API
    async getRoomList(data = {}, params = {}) {
        return http.middleware({
            title: "获取房间列表",
            method: "post",
            url: "/rooms",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getRoomDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取房间详情",
            method: "post",
            url: "/rooms/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getElectricHistory(data = {}, params = {}) {
        return http.middleware({
            title: "获取用电历史",
            method: "post",
            url: "/rooms/electric-history",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getRoomEditDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取房间编辑详情",
            method: "post",
            url: "/rooms/editDetail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async createRoom(data = {}, params = {}) {
        return http.middleware({
            title: "创建房间",
            method: "post",
            url: "/rooms",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async updateRoom(data = {}, params = {}) {
        return http.middleware({
            title: "更新房间",
            method: "post",
            url: "/rooms/update",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async deleteRoom(data = {}, params = {}) {
        return http.middleware({
            title: "删除房间",
            method: "post",
            url: "/rooms/delete",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getRoomStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取房源统计",
            method: "post",
            url: "/rooms/statistics",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async updateRoomStatus(data = {}, params = {}) {
        return http.middleware({
            title: "更新房间状态",
            method: "post",
            url: "/rooms/update-status",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async changeUtilityMode(data = {}, params = {}) {
        return http.middleware({
            title: "切换水电模式",
            method: "post",
            url: "/rooms/change-utility-mode",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async importRooms(data = {}, params = {}) {
        return http.middleware({
            title: "批量导入房间",
            method: "post",
            url: "/rooms/import",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async exportRoomList(data = {}, params = {}) {
        return http.middleware({
            title: "导出房间列表",
            method: "post",
            url: "/rooms/export",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    // 水电管理 API
    async getUtilityReadingList(data = {}, params = {}) {
        return http.middleware({
            title: "获取抄表记录列表",
            method: "post",
            url: "/utility/readings",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getUtilityReadingDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取抄表记录详情",
            method: "post",
            url: "/utility/readings/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async createUtilityReading(data = {}, params = {}) {
        return http.middleware({
            title: "创建抄表记录",
            method: "post",
            url: "/utility/readings",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async updateUtilityReading(data = {}, params = {}) {
        return http.middleware({
            title: "更新抄表记录",
            method: "post",
            url: "/utility/readings/update",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async deleteUtilityReading(data = {}, params = {}) {
        return http.middleware({
            title: "删除抄表记录",
            method: "post",
            url: "/utility/readings/delete",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async importUtilityReadings(data = {}, params = {}) {
        return http.middleware({
            title: "批量导入抄表数据",
            method: "post",
            url: "/utility/readings/import",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async exportUtilityReadings(data = {}, params = {}) {
        return http.middleware({
            title: "导出抄表记录",
            method: "post",
            url: "/utility/readings/export",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    // 首页统计 API
    async getDashboardStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取首页统计信息",
            method: "post",
            url: "/admin/dashboard",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async getWarningStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取预警事项统计",
            method: "post",
            url: "/dashboard/warning",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async getFinancialStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取财务统计",
            method: "post",
            url: "/dashboard/financial",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async getAccountStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取账户统计",
            method: "post",
            url: "/dashboard/account",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    // 租户管理 API
    async getTenantList(data = {}, params = {}) {
        return http.middleware({
            title: "获取租户列表",
            method: "post",
            url: "/tenants",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    // 设备管理
    async createDevice(data = {}, params = {}) {
        return http.middleware({
            title: "创建设备",
            method: "post",
            url: "/devices/create",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getPlatformList(data = {}, params = {}) {
        return http.middleware({
            title: "获取平台列表",
            method: "post",
            url: "/platforms/list",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getPlatformProjectList(data = {}, params = {}) {
        return http.middleware({
            title: "获取平台项目列表",
            method: "post",
            url: "/platforms/projects",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getTenantDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取租户详情",
            method: "post",
            url: "/tenants/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async createTenant(data = {}, params = {}) {
        return http.middleware({
            title: "创建租户",
            method: "post",
            url: "/tenants/create",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async updateTenant(data = {}, params = {}) {
        return http.middleware({
            title: "更新租户",
            method: "post",
            url: "/tenants/update",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    // 同住人管理 API
    async getLeaseOccupantList(data = {}, params = {}) {
        return http.middleware({
            title: "获取同住人列表",
            method: "post",
            url: "/leases/occupants",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async createLeaseOccupant(data = {}, params = {}) {
        return http.middleware({
            title: "添加同住人",
            method: "post",
            url: "/leases/occupants/create",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async updateLeaseOccupant(data = {}, params = {}) {
        return http.middleware({
            title: "更新同住人",
            method: "post",
            url: "/leases/occupants/update",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async deleteLeaseOccupant(data = {}, params = {}) {
        return http.middleware({
            title: "删除同住人",
            method: "post",
            url: "/leases/occupants/delete",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async toggleTenantStatus(data = {}, params = {}) {
        return http.middleware({
            title: "切换租户状态",
            method: "post",
            url: "/tenants/toggle-status",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async deleteTenant(data = {}, params = {}) {
        return http.middleware({
            title: "删除租户",
            method: "post",
            url: "/tenants/delete",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getTenantStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取租户统计",
            method: "post",
            url: "/tenants/statistics",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    // 押金管理 API
    async getDepositList(data = {}, params = {}) {
        return http.middleware({
            title: "获取押金列表",
            method: "post",
            url: "/deposits",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async createDeposit(data = {}, params = {}) {
        return http.middleware({
            title: "创建押金",
            method: "post",
            url: "/deposits/create",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getDepositDetail(data = {}, params = {}) {
        return http.middleware({
            title: "获取押金详情",
            method: "post",
            url: "/deposits/detail",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async receiveDeposit(data = {}, params = {}) {
        return http.middleware({
            title: "收取押金",
            method: "post",
            url: "/deposits/receive",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async refundDeposit(data = {}, params = {}) {
        return http.middleware({
            title: "退还押金",
            method: "post",
            url: "/deposits/refund",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async deductDeposit(data = {}, params = {}) {
        return http.middleware({
            title: "扣除押金",
            method: "post",
            url: "/deposits/deduct",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async cancelDeposit(data = {}, params = {}) {
        return http.middleware({
            title: "取消押金",
            method: "post",
            url: "/deposits/cancel",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getDepositStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取押金统计",
            method: "post",
            url: "/deposits/statistics",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async getLeaseDepositList(data = {}, params = {}) {
        return http.middleware({
            title: "获取租约押金列表",
            method: "post",
            url: "/deposits/lease-deposits",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },

    async getLeaseDepositStatistics(data = {}, params = {}) {
        return http.middleware({
            title: "获取租约押金统计",
            method: "post",
            url: "/deposits/lease-deposit-statistics",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false
            },
        });
    },

    async batchGenerateElectricity(data = {}, params = {}) {
        return http.middleware({
            title: "批量生成电费账单",
            method: "post",
            url: "/bills/batch_generate_electricity",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true
            },
        });
    },
}

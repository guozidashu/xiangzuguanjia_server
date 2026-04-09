import { http } from "@/utils/requestService/mainService";

/**
 * 权限管理相关 API
 */
export default {

    // 获取权限树结构
    async getPermissionTree(data = {}, params = {}) {
        return http.middleware({
            title: "获取权限树",
            method: "post",
            url: "/permissions/tree",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: false,
                project: false
            },
        });
    },

    // 获取管理员列表（带权限信息）
    async getAdminList(data = {}, params = {}) {
        return http.middleware({
            title: "获取管理员列表",
            method: "post",
            url: "/permissions/admins",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false
            },
        });
    },

    // 获取管理员权限
    async getAdminPermissions(data = {}, params = {}) {
        return http.middleware({
            title: "获取管理员权限",
            method: "post",
            url: "/permissions/admin-permissions",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false
            },
        });
    },

    // 设置管理员权限
    async setAdminPermissions(data = {}, params = {}) {
        return http.middleware({
            title: "设置管理员权限",
            method: "post",
            url: "/permissions/set",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false
            },
        });
    },

    // 添加单个权限
    async addPermission(data = {}, params = {}) {
        return http.middleware({
            title: "添加权限",
            method: "post",
            url: "/permissions/add",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false
            },
        });
    },

    // 移除单个权限
    async removePermission(data = {}, params = {}) {
        return http.middleware({
            title: "移除权限",
            method: "post",
            url: "/permissions/remove",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false
            },
        });
    },

    // 设置管理员角色
    async setAdminRole(data = {}, params = {}) {
        return http.middleware({
            title: "设置管理员角色",
            method: "post",
            url: "/permissions/set-role",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false
            },
        });
    },

    // 获取项目管理员列表
    async getProjectAdmins(data = {}, params = {}) {
        return http.middleware({
            title: "获取项目管理员",
            method: "post",
            url: "/permissions/project-admins",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false
            },
        });
    },

    // 添加项目管理员
    async addProjectAdmin(data = {}, params = {}) {
        return http.middleware({
            title: "添加项目管理员",
            method: "post",
            url: "/permissions/add-project-admin",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false
            },
        });
    },

    // 移除项目管理员
    async removeProjectAdmin(data = {}, params = {}) {
        return http.middleware({
            title: "移除项目管理员",
            method: "post",
            url: "/permissions/remove-project-admin",
            data: data,
            params: params,
            custom: {
                token: true,
                loading: true,
                project: false
            },
        });
    },
}

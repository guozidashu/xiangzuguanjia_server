// 初始化用户状态
let userInfo = null; // 用户信息对象
let token = null;    // 用户token

try {
    // 从本地缓存获取用户信息和token
    userInfo = uni.getStorageSync("userInfo");
    token = uni.getStorageSync("token");

    // 如果本地没有用户信息，则初始化为空对象
    if (!userInfo) {
        userInfo = {
            id: "",           // 用户ID
            name: "",         // 员工姓名 (对齐模型)
            role_name: "",    // 角色名称 (对齐模型)
            username: "",     // 用户名
            phone: "",        // 手机号
            org_name: "",     // 机构名称
            is_super_admin: false, // 是否超级管理员
            permissions: [],  // 权限列表
        };
    }
    // 如果本地没有token，则初始化为空字符串
    if (!token) {
        token = "";
    }
} catch (error) {
    // 捕获异常并输出错误信息
    console.error("用户状态初始化失败:", error);
}

export default {
    namespaced: true,
    state: {
        userInfo,           // 用户信息
        token,              // 用户token
        isLoggedIn: !!token // 是否已登录
    },
    mutations: {
        /**
         * 设置token，并自动更新登录状态和本地缓存
         */
        setToken(state, token) {
            state.token = token;
            state.isLoggedIn = !!token;
            uni.setStorageSync("token", token);
        },
        /**
         * 更新用户信息，并同步到本地缓存
         */
        updateUserInfo(state, userData) {
            state.userInfo = {
                id: userData.id,
                name: userData.name || "",
                phone: userData.phone || "",
                role_name: userData.role_name || "",
                org_name: userData.org_name || "",
                is_super_admin: userData.is_super_admin || false,
                permissions: userData.permissions || []
            };
            uni.setStorageSync("userInfo", state.userInfo);
        },
        /**
         * 清除用户数据
         */
        clearUserData(state) {
            state.userInfo = {
                id: "",
                name: "",
                role_name: "",
                is_super_admin: false,
                permissions: []
            };
            state.token = "";
            state.isLoggedIn = false;
            uni.removeStorageSync("userInfo");
            uni.removeStorageSync("token");
        }
    },
    actions: {
        /**
         * 从接口获取用户信息并更新
         */
        async fetchUserInfo({ commit }) {
            try {
                const response = await uni.api.getUserInfo();
                commit("updateUserInfo", response.data);
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        },
        /**
         * 登录操作，设置token并获取用户信息
         */
        async login({ commit, dispatch }, { token, userData }) {
            commit("setToken", token);
            if (userData) {
                commit("updateUserInfo", userData);
            } else {
                await dispatch("fetchUserInfo");
            }
        },
        /**
         * 登出操作，清除全量业务数据 (联动清除项目状态)
         */
        async logout({ commit, dispatch }) {
            commit("clearUserData");
            // 联动重置项目列表和当前选择的项目
            await dispatch('project/clearProjectData', null, { root: true });
        }
    },
    getters: {
        /**
         * 判断用户是否已登录
         */
        isAuthenticated: state => state.isLoggedIn,
        /**
         * 获取当前用户信息
         */
        currentUser: state => state.userInfo,
        /**
         * 判断当前用户是否拥有某个权限
         */
        hasPermission: state => permissionCode => {
            if (state.userInfo.is_super_admin) return true;
            return state.userInfo.permissions?.includes(permissionCode) || false;
        },
        /**
         * 获取当前用户token
         */
        userToken: state => state.token
    }
};

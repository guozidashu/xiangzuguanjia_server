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
            real_name: "",    // 真实姓名
            role: "",          // 用户角色
            username: "",    // 用户名
            phone: "",    // 手机号
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
         * @param {*} state 
         * @param {*} token 
         */
        setToken(state, token) {
            state.token = token;
            state.isLoggedIn = !!token;
            uni.setStorageSync("token", token);
        },
        /**
         * 更新用户信息，并同步到本地缓存
         * @param {*} state
         * @param {*} userData
         */
        updateUserInfo(state, userData) {
            state.userInfo = {
                id: userData.id,           // 用户ID
                username: userData.username || "", // 用户名
                phone: userData.phone || "", // 手机号
                real_name: userData.real_name || "", // 真实姓名
                role: userData.role || "",  // 用户角色
                is_super_admin: userData.is_super_admin || false, // 是否超级管理员
                permissions: userData.permissions || [] // 权限列表
            };
            uni.setStorageSync("userInfo", state.userInfo);
        },
        /**
         * 清除用户数据（登出时调用），并清空本地缓存
         * @param {*} state
         */
        clearUserData(state) {
            state.userInfo = {
                id: "",
                real_name: "",
                role: "",
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
         * @param {*} param0
         */
        async fetchUserInfo({ commit }) {
            await uni.api.getUserInfo().then(response => {
                commit("updateUserInfo", response.data);
            }).catch(error => {
                console.error("获取用户信息失败:", error);
            });
        },
        /**
         * 登录操作，设置token并获取用户信息
         * @param {*} param0
         * @param {*} param1
         */
        async login({ commit, dispatch }, { token, userData }) {
            commit("setToken", token);
            if (userData) {
                commit("updateUserInfo", userData);
            } else {
                // 如果没有提供用户信息，则从接口获取
                await dispatch("fetchUserInfo");
            }
        },
        /**
         * 登出操作，清除用户数据
         * @param {*} param0 
         */
        async logout({ commit }) {
            commit("clearUserData");
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

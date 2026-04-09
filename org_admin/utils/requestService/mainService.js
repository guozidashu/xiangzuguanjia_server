import Request from '@/utils/utils/luch-request'
import Store from '@/utils/store'
import Tools from '@/utils/utils/tools.js'
import { baseApi } from '@/config/config.js'

function debounce(fn, wait = 500, isImmediate = false) { // 防抖
    let timerId = null;
    let flag = true;
    if (isImmediate) {
        return function () {
            clearTimeout(timerId);
            if (flag) {
                fn.apply(this, arguments);
                flag = false
            }
            timerId = setTimeout(() => {
                flag = true
            }, wait)
        }
    }
    return function () {
        clearTimeout(timerId);
        timerId = setTimeout(() => {
            fn.apply(this, arguments)
        }, wait)
    }
}
const reLaunchLogin = debounce(function (msg) { //重新登录
    Store.dispatch('userMessage/logout')
    uni.reLaunch({
        url: '/pages/login/login'
    })
}, 1000, true)

const http = new Request() //创建实例
http.setConfig((config) => {
    /* 设置全局配置 */
    config.baseURL = baseApi
    config.header = {
        ...config.header,
        'content-type': 'application/json;charset=utf-8',
    }
    config.custom = {
        token: true, // 是否传递accesstoken
        loading: true, //是否需要加载logo等待
        project: true  // 默认需要项目隔离
    }
    return config
})

http.interceptors.request.use(async (config) => {
    /* 请求之前拦截器 */
    if (config.custom.loading) {
        uni.showLoading({ title: '请求中...', mask: true });
    }

    // 1. 鉴权对齐：添加 Bearer 前缀
    let token = Store.state.userMessage.token;
    if (token) {
        config.header['Authorization'] = 'Bearer ' + token;
    }

    // 2. 项目隔离：通过 Header 传递 x-project-id
    if (config.custom.project !== false) {
        const currentProjectId = Store.state.project?.currentProject?.id;
        if (!currentProjectId) {
            uni.showToast({ icon: 'none', title: '请先选择所属项目' });
            return Promise.reject({ message: 'Missing project_id' });
        }
        
        // 挂载到 Header
        config.header['x-project-id'] = currentProjectId;
    }

    // 3. 命名对齐：自动执行下划线转换 (API 不允许驼峰)
    if (config.data) config.data = Tools.toSnakeCase(config.data);
    if (config.params) config.params = Tools.toSnakeCase(config.params);

    return config
}, (config) => {
    return Promise.reject(config)
})

http.interceptors.response.use(async (response) => {
    /* 请求之后拦截器 */
    if (response.config.custom.loading) uni.hideLoading();

    if (response.statusCode == 200) {
        const res = response.data;
        // 对齐通用成功码
        if (res.code == 200) {
            return res;
        } else if (res.code == 401) {
            reLaunchLogin(res.message || '登录已过期')
            return Promise.reject(res);
        } else {
            uni.showToast({
                icon: 'none',
                title: res.message || '操作失败',
                duration: 2000
            })
            return Promise.reject(res);
        }
    }

    uni.showToast({ icon: 'none', title: '网络请求异常' });
    return Promise.reject(response);
}, (error) => {
    uni.hideLoading();
    
    let msg = '服务器连接失败';
    if (error.errMsg && error.errMsg.includes('timeout')) {
        msg = '请求超时，请检查网络';
    } else if (error.statusCode === 403) {
        msg = error.data?.message || '暂无操作权限';
    } else if (error.statusCode === 404) {
        msg = '接口路径不存在';
    } else if (error.statusCode === 500) {
        msg = '服务器内部错误';
    }
    
    uni.showToast({
        icon: 'none',
        title: msg,
        duration: 3000
    });
    
    return Promise.reject(error)
})

/**
 * 避免进入死循环，重新new一个用于重新发起请求的实例
 */
const againHttp = new Request({ baseURL: baseApi })
againHttp.interceptors.request.use(config => { return config }, error => { return Promise.reject(error) })
export { http, againHttp }

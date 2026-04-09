import App from './App'
import { debounce, throttle } from "@/utils/utils/throttle.js"; //防抖截流
import api from "@/utils/api/index.js"; //api接口
import store from "@/utils/store/index.js"; //store
import tools from "@/utils/utils/tools.js"; //工具
import { createSSRApp } from 'vue'
App.mpType = 'app'
// 将防抖截流和api接口挂载到uni
uni.debounce = debounce;
uni.throttle = throttle;
uni.api = api;
uni.tools = tools;

export function createApp() {
  const app = createSSRApp(App)
  // 在Vue 3中，需要使用app.use()来挂载store
  app.use(store)
  
  // 全局路由守卫模拟 (Mixin 方式)
  app.mixin({
    onShow() {
      // 1. 获取当前页面实例
      const pages = getCurrentPages();
      if (pages.length === 0) return;
      
      const currentPage = pages[pages.length - 1];
      const path = currentPage.route; // 例如: pages/index/index
      
      // 2. 定义白名单
      const whiteList = ['pages/login/login'];
      
      // 3. 校验登录态
      const token = store.state.userMessage.token;
      
      if (!token && !whiteList.includes(path)) {
        console.warn('路由拦截: 未登录，跳转至登录页');
        uni.reLaunch({
          url: '/pages/login/login'
        });
      }
    }
  });

  // 将工具方法挂载到全局属性
  app.config.globalProperties.$tools = {
    ...tools,
  };
  app.config.globalProperties.$debounce = debounce;
  app.config.globalProperties.$throttle = throttle;
  return {
    app
  }
}
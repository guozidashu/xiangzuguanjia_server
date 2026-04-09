/**
 * 本地存储工具函数
 */

/**
 * 获取选中的项目
 */
export function getSelectedProject() {
  try {
    const projectStr = uni.getStorageSync('selectedProject');
    if (projectStr) {
      return JSON.parse(projectStr);
    }
  } catch (error) {
    console.error('获取选中项目失败:', error);
  }
  return null;
}

/**
 * 设置选中的项目
 */
export function setSelectedProject(project) {
  try {
    if (project) {
      uni.setStorageSync('selectedProject', JSON.stringify(project));
    } else {
      uni.removeStorageSync('selectedProject');
    }
  } catch (error) {
    console.error('设置选中项目失败:', error);
  }
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  try {
    const userInfoStr = uni.getStorageSync('userInfo');
    if (userInfoStr) {
      return JSON.parse(userInfoStr);
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
  return null;
}

/**
 * 设置用户信息
 */
export function setUserInfo(userInfo) {
  try {
    if (userInfo) {
      uni.setStorageSync('userInfo', JSON.stringify(userInfo));
    } else {
      uni.removeStorageSync('userInfo');
    }
  } catch (error) {
    console.error('设置用户信息失败:', error);
  }
}

/**
 * 获取token
 */
export function getToken() {
  return uni.getStorageSync('token') || '';
}

/**
 * 设置token
 */
export function setToken(token) {
  try {
    if (token) {
      uni.setStorageSync('token', token);
    } else {
      uni.removeStorageSync('token');
    }
  } catch (error) {
    console.error('设置token失败:', error);
  }
}

/**
 * 清除所有存储的数据
 */
export function clearAll() {
  try {
    uni.removeStorageSync('userInfo');
    uni.removeStorageSync('token');
    uni.removeStorageSync('selectedProject');
    uni.removeStorageSync('rememberedAccount');
  } catch (error) {
    console.error('清除存储数据失败:', error);
  }
}

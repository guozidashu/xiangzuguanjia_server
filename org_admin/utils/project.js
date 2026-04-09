/**
 * 项目相关工具函数
 */
import { getSelectedProject, setSelectedProject } from './storage.js';

let cachedProjects = null;

/**
 * 获取项目列表（带缓存）
 */
async function getProjectList() {
  if (cachedProjects) {
    return cachedProjects;
  }

  try {
    const res = await uni.api.getProjectList();
    if (res.data && res.data.list) {
      cachedProjects = res.data.list;
      return cachedProjects;
    }
    return [];
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return [];
  }
}

/**
 * 确保项目选择 - 获取项目列表并返回选中的项目
 */
export async function ensureProjectSelection() {
  const projects = await getProjectList();
  const selectedProject = getSelectedProject();

  // 如果没有选择项目，默认选择第一个
  let selected = selectedProject;
  if (!selected && projects.length > 0) {
    selected = projects[0];
    setSelectedProject(selected);
  }

  return {
    list: projects,
    selected: selected
  };
}

/**
 * 获取项目在列表中的索引
 */
export function getProjectIndex(projects, currentProject) {
  if (!projects || !currentProject) return 0;

  const index = projects.findIndex(project => project.id === currentProject.id);
  return index >= 0 ? index : 0;
}

/**
 * 设置当前项目
 */
export function setCurrentProject(project) {
  setSelectedProject(project);
  cachedProjects = null; // 清除缓存，强制重新获取
}

/**
 * Project Model - Handles all project-related data operations
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseModel } from './BaseModel';
import { DatabaseService } from '../services/DatabaseService';
import {
  IProject,
  CreateProjectDto,
  UpdateProjectDto,
  IProjectSettings,
  Priority,
  ISortOptions,
  IPaginationOptions
} from '../types/models';
import { Validator } from '../utils/validators';

export class ProjectModel extends BaseModel<IProject> {
  constructor(db: DatabaseService) {
    super(db);
  }

  /**
   * Create a new project
   */
  async create(data: CreateProjectDto): Promise<IProject> {
    // Validate input
    const validation = Validator.validateCreateProject(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for duplicate names
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new Error(`Project with name "${data.name}" already exists`);
    }

    // Validate parent exists if specified
    if (data.parentId) {
      const parent = await this.findById(data.parentId);
      if (!parent) {
        throw new Error(`Parent project with ID "${data.parentId}" not found`);
      }
    }

    const now = new Date();
    const projects = await this.findAll();
    
    const project: IProject = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      color: data.color || this.generateRandomColor(),
      icon: data.icon,
      parentId: data.parentId,
      orderIndex: projects.length,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      settings: {
        showCompleted: true,
        ...data.settings
      }
    };

    await this.db.createProject(project);
    return project;
  }

  /**
   * Update an existing project
   */
  async update(id: string, data: UpdateProjectDto): Promise<IProject | null> {
    // Validate input
    const validation = Validator.validateUpdateProject(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    // Check for duplicate names if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.findByName(data.name);
      if (duplicate) {
        throw new Error(`Project with name "${data.name}" already exists`);
      }
    }

    // Validate parent exists if specified
    if (data.parentId !== undefined) {
      if (data.parentId) {
        // Check parent exists
        const parent = await this.findById(data.parentId);
        if (!parent) {
          throw new Error(`Parent project with ID "${data.parentId}" not found`);
        }

        // Prevent circular references
        if (await this.wouldCreateCircularReference(id, data.parentId)) {
          throw new Error('Cannot set parent: would create circular reference');
        }
      }
    }

    const updatedProject: IProject = {
      ...existing,
      ...data,
      updatedAt: new Date(),
      settings: data.settings ? { ...existing.settings, ...data.settings } : existing.settings
    };

    await this.db.updateProject(id, updatedProject);
    return updatedProject;
  }

  /**
   * Delete a project
   */
  async delete(id: string): Promise<boolean> {
    const project = await this.findById(id);
    if (!project) {
      return false;
    }

    // Check for child projects
    const children = await this.findChildren(id);
    if (children.length > 0) {
      throw new Error('Cannot delete project with child projects. Delete children first or move them to another parent.');
    }

    // Check for associated todos
    const todos = await this.db.getTodos();
    const projectTodos = todos.filter(t => t.projectId === id);
    if (projectTodos.length > 0) {
      throw new Error(`Cannot delete project with ${projectTodos.length} associated todos. Move or delete todos first.`);
    }

    return await this.db.deleteProject(id);
  }

  /**
   * Find a project by ID
   */
  async findById(id: string): Promise<IProject | null> {
    return await this.db.getProjectById(id);
  }

  /**
   * Find a project by name
   */
  async findByName(name: string): Promise<IProject | null> {
    const projects = await this.findAll();
    return projects.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Find all projects
   */
  async findAll(): Promise<IProject[]> {
    return await this.db.getProjects();
  }

  /**
   * Find active (non-archived) projects
   */
  async findActive(): Promise<IProject[]> {
    const projects = await this.findAll();
    return projects.filter(p => !p.isArchived);
  }

  /**
   * Find archived projects
   */
  async findArchived(): Promise<IProject[]> {
    const projects = await this.findAll();
    return projects.filter(p => p.isArchived);
  }

  /**
   * Find root projects (no parent)
   */
  async findRoots(): Promise<IProject[]> {
    const projects = await this.findAll();
    return projects.filter(p => !p.parentId && !p.isArchived);
  }

  /**
   * Find child projects
   */
  async findChildren(parentId: string): Promise<IProject[]> {
    const projects = await this.findAll();
    return projects.filter(p => p.parentId === parentId);
  }

  /**
   * Get project hierarchy
   */
  async getHierarchy(): Promise<IProjectNode[]> {
    const projects = await this.findActive();
    const roots = projects.filter(p => !p.parentId);
    
    return roots.map(root => this.buildProjectNode(root, projects));
  }

  /**
   * Archive a project
   */
  async archive(id: string): Promise<IProject | null> {
    return await this.update(id, { isArchived: true });
  }

  /**
   * Unarchive a project
   */
  async unarchive(id: string): Promise<IProject | null> {
    return await this.update(id, { isArchived: false });
  }

  /**
   * Reorder projects
   */
  async reorder(projectIds: string[]): Promise<void> {
    const projects = await this.findAll();
    
    for (let i = 0; i < projectIds.length; i++) {
      const project = projects.find(p => p.id === projectIds[i]);
      if (project) {
        await this.db.updateProject(projectIds[i], { orderIndex: i });
      }
    }
  }

  /**
   * Move project to new parent
   */
  async move(projectId: string, newParentId: string | null): Promise<IProject | null> {
    if (newParentId && await this.wouldCreateCircularReference(projectId, newParentId)) {
      throw new Error('Cannot move project: would create circular reference');
    }

    return await this.update(projectId, { parentId: newParentId || undefined });
  }

  /**
   * Get project statistics
   */
  async getStatistics(projectId: string): Promise<IProjectStatistics> {
    const project = await this.findById(projectId);
    if (!project) {
      throw new Error(`Project with ID "${projectId}" not found`);
    }

    const todos = await this.db.getTodos();
    const projectTodos = todos.filter(t => t.projectId === projectId);

    const stats: IProjectStatistics = {
      totalTodos: projectTodos.length,
      activeTodos: projectTodos.filter(t => t.status === 'active').length,
      pendingTodos: projectTodos.filter(t => t.status === 'pending').length,
      completedTodos: projectTodos.filter(t => t.status === 'completed').length,
      archivedTodos: projectTodos.filter(t => t.status === 'archived').length,
      overdueTodos: projectTodos.filter(t => {
        return t.status !== 'completed' && 
               t.status !== 'archived' &&
               t.dueDate && 
               new Date(t.dueDate) < new Date();
      }).length,
      todayTodos: projectTodos.filter(t => {
        if (t.status === 'completed' || t.status === 'archived') return false;
        if (!t.dueDate) return false;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = new Date(t.dueDate);
        
        return dueDate >= today && dueDate < tomorrow;
      }).length,
      completionRate: projectTodos.length > 0 
        ? Math.round((projectTodos.filter(t => t.status === 'completed').length / projectTodos.length) * 100)
        : 0
    };

    return stats;
  }

  /**
   * Count total projects
   */
  async count(): Promise<number> {
    const projects = await this.findAll();
    return projects.length;
  }

  /**
   * Count active projects
   */
  async countActive(): Promise<number> {
    const projects = await this.findActive();
    return projects.length;
  }

  /**
   * Build project node for hierarchy
   */
  private buildProjectNode(project: IProject, allProjects: IProject[]): IProjectNode {
    const children = allProjects
      .filter(p => p.parentId === project.id)
      .map(child => this.buildProjectNode(child, allProjects));

    return {
      ...project,
      children: children.sort((a, b) => a.orderIndex - b.orderIndex)
    };
  }

  /**
   * Check if setting a parent would create a circular reference
   */
  private async wouldCreateCircularReference(projectId: string, potentialParentId: string): Promise<boolean> {
    if (projectId === potentialParentId) {
      return true;
    }

    const projects = await this.findAll();
    const descendants = this.getDescendants(projectId, projects);
    
    return descendants.includes(potentialParentId);
  }

  /**
   * Get all descendant project IDs
   */
  private getDescendants(projectId: string, projects: IProject[]): string[] {
    const children = projects.filter(p => p.parentId === projectId);
    const descendants: string[] = [];

    for (const child of children) {
      descendants.push(child.id);
      descendants.push(...this.getDescendants(child.id, projects));
    }

    return descendants;
  }

  /**
   * Generate a random color for projects
   */
  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA5E9', '#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E',
      '#6AB04A', '#22A6B3', '#F0932B', '#EB4D4B', '#686DE0'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Validate project data
   */
  protected async validate(data: Partial<IProject>): Promise<boolean> {
    // Implementation handled by Validator class
    return true;
  }
}

// Type definitions for project hierarchy
interface IProjectNode extends IProject {
  children: IProjectNode[];
}

interface IProjectStatistics {
  totalTodos: number;
  activeTodos: number;
  pendingTodos: number;
  completedTodos: number;
  archivedTodos: number;
  overdueTodos: number;
  todayTodos: number;
  completionRate: number;
}
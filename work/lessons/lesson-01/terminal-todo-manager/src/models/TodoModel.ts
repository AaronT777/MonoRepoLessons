/**
 * Todo Model - Handles all todo-related data operations
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseModel } from './BaseModel';
import { DatabaseService } from '../services/DatabaseService';
import {
  ITodoItem,
  CreateTodoDto,
  UpdateTodoDto,
  TodoStatus,
  Priority,
  ITodoFilter,
  ISortOptions,
  IPaginationOptions,
  ISubtask,
  IValidationResult
} from '../types/models';
import { Validator } from '../utils/validators';

export class TodoModel extends BaseModel<ITodoItem> {
  constructor(db: DatabaseService) {
    super(db);
  }

  /**
   * Create a new todo item
   */
  async create(data: CreateTodoDto): Promise<ITodoItem> {
    // Validate input
    const validation = Validator.validateCreateTodo(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const now = new Date();
    const todo: ITodoItem = {
      id: uuidv4(),
      title: data.title,
      description: data.description,
      status: TodoStatus.ACTIVE,
      priority: data.priority || Priority.MEDIUM,
      projectId: data.projectId,
      tags: data.tags || [],
      dueDate: data.dueDate,
      reminderDate: data.reminderDate,
      createdAt: now,
      updatedAt: now,
      completedAt: undefined,
      subtasks: this.createSubtasks(data.subtasks),
      attachments: [],
      recurrence: data.recurrence
    };

    await this.db.createTodo(todo);
    await this.updateTagUsage(todo.tags);

    return todo;
  }

  /**
   * Update an existing todo item
   */
  async update(id: string, data: UpdateTodoDto): Promise<ITodoItem | null> {
    // Validate input
    const validation = Validator.validateUpdateTodo(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updatedTodo: ITodoItem = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    // Handle status change to completed
    if (data.status === TodoStatus.COMPLETED && existing.status !== TodoStatus.COMPLETED) {
      updatedTodo.completedAt = new Date();
      
      // Handle recurring todos
      if (updatedTodo.recurrence) {
        await this.createNextRecurrence(updatedTodo);
      }
    } else if (data.status !== TodoStatus.COMPLETED && existing.status === TodoStatus.COMPLETED) {
      updatedTodo.completedAt = undefined;
    }

    // Update tag usage if tags changed
    if (data.tags && JSON.stringify(data.tags) !== JSON.stringify(existing.tags)) {
      await this.updateTagUsage(data.tags, existing.tags);
    }

    await this.db.updateTodo(id, updatedTodo);
    return updatedTodo;
  }

  /**
   * Delete a todo item
   */
  async delete(id: string): Promise<boolean> {
    const todo = await this.findById(id);
    if (!todo) {
      return false;
    }

    // Update tag usage
    if (todo.tags.length > 0) {
      await this.updateTagUsage([], todo.tags);
    }

    return await this.db.deleteTodo(id);
  }

  /**
   * Find a todo by ID
   */
  async findById(id: string): Promise<ITodoItem | null> {
    return await this.db.getTodoById(id);
  }

  /**
   * Find all todos
   */
  async findAll(): Promise<ITodoItem[]> {
    return await this.db.getTodos();
  }

  /**
   * Find todos with filtering, sorting, and pagination
   */
  async find(
    filter?: ITodoFilter,
    sort?: ISortOptions,
    pagination?: IPaginationOptions
  ): Promise<{
    items: ITodoItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let todos = await this.findAll();

    // Apply filters
    if (filter) {
      todos = this.applyFilter(todos, filter);
    }

    // Apply sorting
    if (sort) {
      todos = this.applySort(todos, sort);
    }

    // Apply pagination
    return this.applyPagination(todos, pagination);
  }

  /**
   * Count total todos
   */
  async count(): Promise<number> {
    const todos = await this.findAll();
    return todos.length;
  }

  /**
   * Count todos by status
   */
  async countByStatus(): Promise<Record<TodoStatus, number>> {
    const todos = await this.findAll();
    const counts: Record<TodoStatus, number> = {
      [TodoStatus.ACTIVE]: 0,
      [TodoStatus.PENDING]: 0,
      [TodoStatus.COMPLETED]: 0,
      [TodoStatus.ARCHIVED]: 0
    };

    todos.forEach(todo => {
      counts[todo.status]++;
    });

    return counts;
  }

  /**
   * Get overdue todos
   */
  async getOverdue(): Promise<ITodoItem[]> {
    const todos = await this.findAll();
    const now = new Date();

    return todos.filter(todo => 
      todo.status !== TodoStatus.COMPLETED &&
      todo.status !== TodoStatus.ARCHIVED &&
      todo.dueDate &&
      new Date(todo.dueDate) < now
    );
  }

  /**
   * Get todos for today
   */
  async getToday(): Promise<ITodoItem[]> {
    const todos = await this.findAll();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return todos.filter(todo => {
      if (todo.status === TodoStatus.COMPLETED || todo.status === TodoStatus.ARCHIVED) {
        return false;
      }
      
      if (!todo.dueDate) {
        return false;
      }

      const dueDate = new Date(todo.dueDate);
      return dueDate >= today && dueDate < tomorrow;
    });
  }

  /**
   * Get todos for this week
   */
  async getThisWeek(): Promise<ITodoItem[]> {
    const todos = await this.findAll();
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return todos.filter(todo => {
      if (todo.status === TodoStatus.COMPLETED || todo.status === TodoStatus.ARCHIVED) {
        return false;
      }
      
      if (!todo.dueDate) {
        return false;
      }

      const dueDate = new Date(todo.dueDate);
      return dueDate >= startOfWeek && dueDate < endOfWeek;
    });
  }

  /**
   * Toggle todo completion status
   */
  async toggleComplete(id: string): Promise<ITodoItem | null> {
    const todo = await this.findById(id);
    if (!todo) {
      return null;
    }

    const newStatus = todo.status === TodoStatus.COMPLETED 
      ? TodoStatus.ACTIVE 
      : TodoStatus.COMPLETED;

    return await this.update(id, { status: newStatus });
  }

  /**
   * Add a subtask to a todo
   */
  async addSubtask(todoId: string, subtaskTitle: string): Promise<ITodoItem | null> {
    const todo = await this.findById(todoId);
    if (!todo) {
      return null;
    }

    const subtask: ISubtask = {
      id: uuidv4(),
      title: subtaskTitle,
      isCompleted: false,
      orderIndex: todo.subtasks.length,
      createdAt: new Date(),
      completedAt: undefined
    };

    const updatedSubtasks = [...todo.subtasks, subtask];
    return await this.update(todoId, { subtasks: updatedSubtasks });
  }

  /**
   * Toggle subtask completion
   */
  async toggleSubtask(todoId: string, subtaskId: string): Promise<ITodoItem | null> {
    const todo = await this.findById(todoId);
    if (!todo) {
      return null;
    }

    const updatedSubtasks = todo.subtasks.map(subtask => {
      if (subtask.id === subtaskId) {
        return {
          ...subtask,
          isCompleted: !subtask.isCompleted,
          completedAt: !subtask.isCompleted ? new Date() : undefined
        };
      }
      return subtask;
    });

    return await this.update(todoId, { subtasks: updatedSubtasks });
  }

  /**
   * Archive completed todos older than specified days
   */
  async archiveOldCompleted(days: number = 30): Promise<number> {
    const todos = await this.findAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let archivedCount = 0;
    for (const todo of todos) {
      if (
        todo.status === TodoStatus.COMPLETED &&
        todo.completedAt &&
        new Date(todo.completedAt) < cutoffDate
      ) {
        await this.update(todo.id, { status: TodoStatus.ARCHIVED });
        archivedCount++;
      }
    }

    return archivedCount;
  }

  /**
   * Apply filter to todos
   */
  private applyFilter(todos: ITodoItem[], filter: ITodoFilter): ITodoItem[] {
    return todos.filter(todo => {
      // Status filter
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        if (!statuses.includes(todo.status)) {
          return false;
        }
      }

      // Priority filter
      if (filter.priority) {
        const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
        if (!priorities.includes(todo.priority)) {
          return false;
        }
      }

      // Project filter
      if (filter.projectId) {
        const projectIds = Array.isArray(filter.projectId) ? filter.projectId : [filter.projectId];
        if (!todo.projectId || !projectIds.includes(todo.projectId)) {
          return false;
        }
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        const hasAllTags = filter.tags.every(tag => todo.tags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }

      // Due date filters
      if (filter.dueBefore && todo.dueDate) {
        if (new Date(todo.dueDate) > new Date(filter.dueBefore)) {
          return false;
        }
      }

      if (filter.dueAfter && todo.dueDate) {
        if (new Date(todo.dueDate) < new Date(filter.dueAfter)) {
          return false;
        }
      }

      // Search term filter
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        const matchesTitle = todo.title.toLowerCase().includes(searchLower);
        const matchesDescription = todo.description?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      // Has subtasks filter
      if (filter.hasSubtasks !== undefined) {
        if (filter.hasSubtasks && todo.subtasks.length === 0) {
          return false;
        }
        if (!filter.hasSubtasks && todo.subtasks.length > 0) {
          return false;
        }
      }

      // Is overdue filter
      if (filter.isOverdue !== undefined) {
        const isOverdue = todo.dueDate && 
          new Date(todo.dueDate) < new Date() &&
          todo.status !== TodoStatus.COMPLETED &&
          todo.status !== TodoStatus.ARCHIVED;
        
        if (filter.isOverdue && !isOverdue) {
          return false;
        }
        if (!filter.isOverdue && isOverdue) {
          return false;
        }
      }

      // Is recurring filter
      if (filter.isRecurring !== undefined) {
        const isRecurring = !!todo.recurrence;
        if (filter.isRecurring && !isRecurring) {
          return false;
        }
        if (!filter.isRecurring && isRecurring) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Create subtasks from DTOs
   */
  private createSubtasks(subtasks?: any[]): ISubtask[] {
    if (!subtasks || subtasks.length === 0) {
      return [];
    }

    return subtasks.map((subtask, index) => ({
      id: uuidv4(),
      title: subtask.title,
      isCompleted: false,
      orderIndex: index,
      createdAt: new Date(),
      completedAt: undefined
    }));
  }

  /**
   * Update tag usage statistics
   */
  private async updateTagUsage(newTags: string[], oldTags: string[] = []): Promise<void> {
    // Tags to increment
    const tagsToAdd = newTags.filter(tag => !oldTags.includes(tag));
    
    // Tags to decrement
    const tagsToRemove = oldTags.filter(tag => !newTags.includes(tag));

    // Update tag usage
    for (const tagName of tagsToAdd) {
      let tag = await this.db.getTagByName(tagName);
      if (!tag) {
        await this.db.createTag({
          name: tagName,
          usageCount: 1,
          lastUsed: new Date(),
          createdAt: new Date()
        });
      } else {
        await this.db.updateTag(tagName, {
          usageCount: tag.usageCount + 1,
          lastUsed: new Date()
        });
      }
    }

    for (const tagName of tagsToRemove) {
      const tag = await this.db.getTagByName(tagName);
      if (tag) {
        if (tag.usageCount <= 1) {
          await this.db.deleteTag(tagName);
        } else {
          await this.db.updateTag(tagName, {
            usageCount: tag.usageCount - 1
          });
        }
      }
    }
  }

  /**
   * Create next occurrence of a recurring todo
   */
  private async createNextRecurrence(completedTodo: ITodoItem): Promise<void> {
    if (!completedTodo.recurrence) {
      return;
    }

    const nextDate = this.calculateNextRecurrence(
      completedTodo.dueDate || new Date(),
      completedTodo.recurrence
    );

    if (!nextDate || (completedTodo.recurrence.endDate && nextDate > completedTodo.recurrence.endDate)) {
      return;
    }

    const newTodo: CreateTodoDto = {
      title: completedTodo.title,
      description: completedTodo.description,
      priority: completedTodo.priority,
      projectId: completedTodo.projectId,
      tags: completedTodo.tags,
      dueDate: nextDate,
      reminderDate: completedTodo.reminderDate ? this.calculateNextRecurrence(
        completedTodo.reminderDate,
        completedTodo.recurrence
      ) : undefined,
      recurrence: completedTodo.recurrence
    };

    await this.create(newTodo);
  }

  /**
   * Calculate next recurrence date
   */
  private calculateNextRecurrence(baseDate: Date, recurrence: any): Date | null {
    const date = new Date(baseDate);

    switch (recurrence.pattern) {
      case 'daily':
        date.setDate(date.getDate() + (recurrence.interval || 1));
        break;
      case 'weekly':
        date.setDate(date.getDate() + ((recurrence.interval || 1) * 7));
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + (recurrence.interval || 1));
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + (recurrence.interval || 1));
        break;
      default:
        return null;
    }

    return date;
  }

  /**
   * Validate todo data
   */
  protected async validate(data: Partial<ITodoItem>): Promise<boolean> {
    // Implementation handled by Validator class
    return true;
  }
}
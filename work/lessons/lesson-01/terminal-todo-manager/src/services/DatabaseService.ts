/**
 * Database Service for JSON file persistence
 * This will be replaced with SQLite in a future phase
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { IDatabaseSchema, ITodoItem, IProject, ITag } from '../types/models';

export class DatabaseService {
  private dataPath: string;
  private backupPath: string;
  private data: IDatabaseSchema;
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_MS = 1000;
  private readonly BACKUP_INTERVAL_MS = 3600000; // 1 hour
  private backupTimer: NodeJS.Timeout | null = null;

  constructor(dataDir: string = './data') {
    this.dataPath = path.join(dataDir, 'todos.json');
    this.backupPath = path.join(dataDir, 'backups');
    this.data = this.getEmptySchema();
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await this.ensureDirectories();

      // Load existing data or create new file
      await this.load();

      // Start automatic backup
      this.startBackupSchedule();

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const dataDir = path.dirname(this.dataPath);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(this.backupPath, { recursive: true });
  }

  /**
   * Get empty database schema
   */
  private getEmptySchema(): IDatabaseSchema {
    return {
      todos: [],
      projects: [],
      tags: [],
      version: '1.0.0',
      lastBackup: undefined
    };
  }

  /**
   * Load data from file
   */
  private async load(): Promise<void> {
    try {
      const fileExists = await this.fileExists(this.dataPath);
      
      if (fileExists) {
        const content = await fs.readFile(this.dataPath, 'utf-8');
        const parsedData = JSON.parse(content);
        
        // Validate and migrate data if needed
        this.data = this.validateAndMigrateSchema(parsedData);
      } else {
        // Create new database file
        await this.save();
      }
    } catch (error) {
      console.error('Error loading database:', error);
      
      // Try to restore from backup
      const restored = await this.restoreFromLatestBackup();
      if (!restored) {
        // If no backup available, start fresh
        this.data = this.getEmptySchema();
        await this.save();
      }
    }
  }

  /**
   * Save data to file with debouncing
   */
  async save(): Promise<void> {
    // Clear existing timer
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // Set new timer
    this.saveDebounceTimer = setTimeout(async () => {
      await this.saveImmediate();
    }, this.SAVE_DEBOUNCE_MS);
  }

  /**
   * Save data immediately without debouncing
   */
  async saveImmediate(): Promise<void> {
    try {
      const content = JSON.stringify(this.data, null, 2);
      
      // Write to temp file first (atomic write)
      const tempPath = `${this.dataPath}.tmp`;
      await fs.writeFile(tempPath, content, 'utf-8');
      
      // Rename temp file to actual file
      await fs.rename(tempPath, this.dataPath);
      
    } catch (error) {
      console.error('Error saving database:', error);
      throw error;
    }
  }

  /**
   * Create a backup of the current database
   */
  async backup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupPath, `backup-${timestamp}.json`);
      
      const content = JSON.stringify(this.data, null, 2);
      await fs.writeFile(backupFile, content, 'utf-8');
      
      this.data.lastBackup = new Date();
      await this.save();
      
      // Clean old backups (keep last 10)
      await this.cleanOldBackups(10);
      
      return backupFile;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Restore from a backup file
   */
  async restoreFromBackup(backupFile: string): Promise<boolean> {
    try {
      const content = await fs.readFile(backupFile, 'utf-8');
      const parsedData = JSON.parse(content);
      
      this.data = this.validateAndMigrateSchema(parsedData);
      await this.saveImmediate();
      
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return false;
    }
  }

  /**
   * Restore from the latest backup
   */
  private async restoreFromLatestBackup(): Promise<boolean> {
    try {
      const backups = await this.getBackupFiles();
      if (backups.length === 0) {
        return false;
      }
      
      // Try latest backup first
      const latestBackup = backups[backups.length - 1];
      return await this.restoreFromBackup(latestBackup);
    } catch (error) {
      console.error('Error restoring from latest backup:', error);
      return false;
    }
  }

  /**
   * Get list of backup files sorted by date
   */
  private async getBackupFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupPath);
      const backupFiles = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .map(f => path.join(this.backupPath, f))
        .sort();
      
      return backupFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean old backup files
   */
  private async cleanOldBackups(keepCount: number): Promise<void> {
    try {
      const backups = await this.getBackupFiles();
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(0, backups.length - keepCount);
        
        for (const file of toDelete) {
          await fs.unlink(file);
        }
      }
    } catch (error) {
      console.error('Error cleaning old backups:', error);
    }
  }

  /**
   * Start automatic backup schedule
   */
  private startBackupSchedule(): void {
    this.backupTimer = setInterval(async () => {
      await this.backup();
    }, this.BACKUP_INTERVAL_MS);
  }

  /**
   * Stop automatic backup schedule
   */
  stopBackupSchedule(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  /**
   * Validate and migrate schema if needed
   */
  private validateAndMigrateSchema(data: any): IDatabaseSchema {
    // Ensure all required fields exist
    const schema: IDatabaseSchema = {
      todos: data.todos || [],
      projects: data.projects || [],
      tags: data.tags || [],
      version: data.version || '1.0.0',
      lastBackup: data.lastBackup ? new Date(data.lastBackup) : undefined
    };

    // Convert date strings to Date objects
    schema.todos = schema.todos.map(this.deserializeTodo);
    schema.projects = schema.projects.map(this.deserializeProject);
    schema.tags = schema.tags.map(this.deserializeTag);

    return schema;
  }

  /**
   * Deserialize todo item from JSON
   */
  private deserializeTodo(todo: any): ITodoItem {
    return {
      ...todo,
      dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
      reminderDate: todo.reminderDate ? new Date(todo.reminderDate) : undefined,
      createdAt: new Date(todo.createdAt),
      updatedAt: new Date(todo.updatedAt),
      completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
      subtasks: todo.subtasks || [],
      attachments: todo.attachments || [],
      tags: todo.tags || []
    };
  }

  /**
   * Deserialize project from JSON
   */
  private deserializeProject(project: any): IProject {
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
      settings: project.settings || {
        showCompleted: true
      }
    };
  }

  /**
   * Deserialize tag from JSON
   */
  private deserializeTag(tag: any): ITag {
    return {
      ...tag,
      lastUsed: new Date(tag.lastUsed),
      createdAt: new Date(tag.createdAt)
    };
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // CRUD Operations for Todos

  async getTodos(): Promise<ITodoItem[]> {
    return [...this.data.todos];
  }

  async getTodoById(id: string): Promise<ITodoItem | null> {
    return this.data.todos.find(t => t.id === id) || null;
  }

  async createTodo(todo: ITodoItem): Promise<void> {
    this.data.todos.push(todo);
    await this.save();
  }

  async updateTodo(id: string, updates: Partial<ITodoItem>): Promise<boolean> {
    const index = this.data.todos.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.data.todos[index] = {
      ...this.data.todos[index],
      ...updates,
      updatedAt: new Date()
    };
    await this.save();
    return true;
  }

  async deleteTodo(id: string): Promise<boolean> {
    const index = this.data.todos.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.data.todos.splice(index, 1);
    await this.save();
    return true;
  }

  // CRUD Operations for Projects

  async getProjects(): Promise<IProject[]> {
    return [...this.data.projects];
  }

  async getProjectById(id: string): Promise<IProject | null> {
    return this.data.projects.find(p => p.id === id) || null;
  }

  async createProject(project: IProject): Promise<void> {
    this.data.projects.push(project);
    await this.save();
  }

  async updateProject(id: string, updates: Partial<IProject>): Promise<boolean> {
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.data.projects[index] = {
      ...this.data.projects[index],
      ...updates,
      updatedAt: new Date()
    };
    await this.save();
    return true;
  }

  async deleteProject(id: string): Promise<boolean> {
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index === -1) return false;

    // Also remove project reference from todos
    this.data.todos.forEach(todo => {
      if (todo.projectId === id) {
        todo.projectId = undefined;
      }
    });

    this.data.projects.splice(index, 1);
    await this.save();
    return true;
  }

  // CRUD Operations for Tags

  async getTags(): Promise<ITag[]> {
    return [...this.data.tags];
  }

  async getTagByName(name: string): Promise<ITag | null> {
    return this.data.tags.find(t => t.name === name) || null;
  }

  async createTag(tag: ITag): Promise<void> {
    this.data.tags.push(tag);
    await this.save();
  }

  async updateTag(name: string, updates: Partial<ITag>): Promise<boolean> {
    const index = this.data.tags.findIndex(t => t.name === name);
    if (index === -1) return false;

    this.data.tags[index] = {
      ...this.data.tags[index],
      ...updates
    };
    await this.save();
    return true;
  }

  async deleteTag(name: string): Promise<boolean> {
    const index = this.data.tags.findIndex(t => t.name === name);
    if (index === -1) return false;

    // Remove tag from todos
    this.data.todos.forEach(todo => {
      const tagIndex = todo.tags.indexOf(name);
      if (tagIndex !== -1) {
        todo.tags.splice(tagIndex, 1);
      }
    });

    this.data.tags.splice(index, 1);
    await this.save();
    return true;
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    this.stopBackupSchedule();
    
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      await this.saveImmediate();
    }
  }
}
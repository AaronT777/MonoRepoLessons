/**
 * Core type definitions for the Todo Manager application
 */

// Enums
export enum TodoStatus {
    ACTIVE = 'active',
    PENDING = 'pending',
    COMPLETED = 'completed',
    ARCHIVED = 'archived'
  }
  
  export enum Priority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
  }
  
  export enum RecurrencePattern {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    YEARLY = 'yearly',
    CUSTOM = 'custom'
  }
  
  // Core Interfaces
  export interface ITodoItem {
    id: string;                    // UUID
    title: string;                 // Task title
    description?: string;          // Detailed description
    status: TodoStatus;            // Current status
    priority: Priority;            // Priority level
    projectId?: string;            // Reference to project
    tags: string[];                // Associated tags
    dueDate?: Date;                // Due date
    reminderDate?: Date;           // Reminder timestamp
    createdAt: Date;               // Creation timestamp
    updatedAt: Date;               // Last modification
    completedAt?: Date;            // Completion timestamp
    subtasks: ISubtask[];          // Child tasks
    attachments: IAttachment[];    // File references
    recurrence?: IRecurrenceRule;  // Repeat pattern
  }
  
  export interface IProject {
    id: string;                    // UUID
    name: string;                  // Project name
    description?: string;          // Project description
    color: string;                 // Display color (hex)
    icon?: string;                 // Terminal icon/emoji
    parentId?: string;             // Parent project (hierarchy)
    orderIndex: number;            // Display order
    isArchived: boolean;           // Archive status
    createdAt: Date;               // Creation timestamp
    updatedAt: Date;               // Last modification
    settings: IProjectSettings;    // Project-specific settings
  }
  
  export interface ITag {
    name: string;                  // Tag identifier
    color?: string;                // Display color (hex)
    usageCount: number;            // Frequency counter
    lastUsed: Date;                // Last usage timestamp
    createdAt: Date;               // Creation timestamp
  }
  
  // Supporting Types
  export interface ISubtask {
    id: string;
    title: string;
    isCompleted: boolean;
    orderIndex: number;
    createdAt: Date;
    completedAt?: Date;
  }
  
  export interface IAttachment {
    id: string;
    filename: string;
    path: string;
    size: number;
    mimeType?: string;
    addedAt: Date;
  }
  
  export interface IRecurrenceRule {
    pattern: RecurrencePattern;
    interval: number;              // Every N days/weeks/etc
    endDate?: Date;                // Recurrence end
    exceptions: Date[];            // Skip dates
    customRule?: string;           // Cron expression for custom
    nextOccurrence?: Date;         // Next calculated occurrence
  }
  
  export interface IProjectSettings {
    defaultPriority?: Priority;
    defaultTags?: string[];
    sortOrder?: 'priority' | 'dueDate' | 'created' | 'alphabetical';
    showCompleted: boolean;
    completedRetentionDays?: number;  // Days to keep completed tasks
  }
  
  // Data Transfer Objects (DTOs)
  export interface CreateTodoDto {
    title: string;
    description?: string;
    priority?: Priority;
    projectId?: string;
    tags?: string[];
    dueDate?: Date;
    reminderDate?: Date;
    subtasks?: Omit<ISubtask, 'id' | 'createdAt' | 'completedAt'>[];
    recurrence?: IRecurrenceRule;
  }
  
  export interface UpdateTodoDto {
    title?: string;
    description?: string;
    status?: TodoStatus;
    priority?: Priority;
    projectId?: string;
    tags?: string[];
    dueDate?: Date;
    reminderDate?: Date;
    subtasks?: ISubtask[];
    recurrence?: IRecurrenceRule;
  }
  
  export interface CreateProjectDto {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parentId?: string;
    settings?: Partial<IProjectSettings>;
  }
  
  export interface UpdateProjectDto {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    parentId?: string;
    orderIndex?: number;
    isArchived?: boolean;
    settings?: Partial<IProjectSettings>;
  }
  
  // Filter and Query Types
  export interface ITodoFilter {
    status?: TodoStatus | TodoStatus[];
    priority?: Priority | Priority[];
    projectId?: string | string[];
    tags?: string[];
    dueBefore?: Date;
    dueAfter?: Date;
    searchTerm?: string;
    hasSubtasks?: boolean;
    isOverdue?: boolean;
    isRecurring?: boolean;
  }
  
  export interface ISortOptions {
    field: 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'title';
    direction: 'asc' | 'desc';
  }
  
  export interface IPaginationOptions {
    page: number;
    limit: number;
  }
  
  // Database Schema Types
  export interface IDatabaseSchema {
    todos: ITodoItem[];
    projects: IProject[];
    tags: ITag[];
    version: string;
    lastBackup?: Date;
  }
  
  // Validation Types
  export interface IValidationResult {
    isValid: boolean;
    errors: IValidationError[];
  }
  
  export interface IValidationError {
    field: string;
    message: string;
    value?: any;
  }
  
  // Export all types as a namespace for convenience
  export type TodoItem = ITodoItem;
  export type Project = IProject;
  export type Tag = ITag;
  export type Subtask = ISubtask;
  export type Attachment = IAttachment;
  export type RecurrenceRule = IRecurrenceRule;
  export type ProjectSettings = IProjectSettings;
  export type TodoFilter = ITodoFilter;
  export type SortOptions = ISortOptions;
  export type PaginationOptions = IPaginationOptions;
  export type DatabaseSchema = IDatabaseSchema;
  export type ValidationResult = IValidationResult;
  export type ValidationError = IValidationError;
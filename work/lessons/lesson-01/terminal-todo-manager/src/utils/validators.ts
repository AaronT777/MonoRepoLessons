/**
 * Validation utilities for Todo Manager models
 */

import {
    ITodoItem,
    IProject,
    ITag,
    CreateTodoDto,
    UpdateTodoDto,
    CreateProjectDto,
    UpdateProjectDto,
    IValidationResult,
    IValidationError,
    TodoStatus,
    Priority,
    RecurrencePattern
  } from '../types/models';
  
  export class Validator {
    /**
     * Validate a CreateTodoDto
     */
    static validateCreateTodo(dto: CreateTodoDto): IValidationResult {
      const errors: IValidationError[] = [];
  
      // Required fields
      if (!dto.title || dto.title.trim().length === 0) {
        errors.push({
          field: 'title',
          message: 'Title is required and cannot be empty'
        });
      } else if (dto.title.length > 255) {
        errors.push({
          field: 'title',
          message: 'Title cannot exceed 255 characters',
          value: dto.title.length
        });
      }
  
      // Optional fields validation
      if (dto.description && dto.description.length > 5000) {
        errors.push({
          field: 'description',
          message: 'Description cannot exceed 5000 characters',
          value: dto.description.length
        });
      }
  
      if (dto.priority && !Object.values(Priority).includes(dto.priority)) {
        errors.push({
          field: 'priority',
          message: 'Invalid priority value',
          value: dto.priority
        });
      }
  
      if (dto.dueDate) {
        const dueDate = new Date(dto.dueDate);
        if (isNaN(dueDate.getTime())) {
          errors.push({
            field: 'dueDate',
            message: 'Invalid due date',
            value: dto.dueDate
          });
        }
      }
  
      if (dto.reminderDate) {
        const reminderDate = new Date(dto.reminderDate);
        if (isNaN(reminderDate.getTime())) {
          errors.push({
            field: 'reminderDate',
            message: 'Invalid reminder date',
            value: dto.reminderDate
          });
        }
  
        if (dto.dueDate) {
          const dueDate = new Date(dto.dueDate);
          if (reminderDate > dueDate) {
            errors.push({
              field: 'reminderDate',
              message: 'Reminder date cannot be after due date'
            });
          }
        }
      }
  
      if (dto.tags && dto.tags.length > 20) {
        errors.push({
          field: 'tags',
          message: 'Cannot have more than 20 tags',
          value: dto.tags.length
        });
      }
  
      if (dto.tags) {
        dto.tags.forEach((tag, index) => {
          if (!this.isValidTagName(tag)) {
            errors.push({
              field: `tags[${index}]`,
              message: 'Invalid tag name. Tags must be 1-50 characters and contain only letters, numbers, hyphens, and underscores',
              value: tag
            });
          }
        });
      }
  
      if (dto.recurrence) {
        const recurrenceErrors = this.validateRecurrenceRule(dto.recurrence);
        errors.push(...recurrenceErrors);
      }
  
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  
    /**
     * Validate an UpdateTodoDto
     */
    static validateUpdateTodo(dto: UpdateTodoDto): IValidationResult {
      const errors: IValidationError[] = [];
  
      if (dto.title !== undefined) {
        if (!dto.title || dto.title.trim().length === 0) {
          errors.push({
            field: 'title',
            message: 'Title cannot be empty when updating'
          });
        } else if (dto.title.length > 255) {
          errors.push({
            field: 'title',
            message: 'Title cannot exceed 255 characters',
            value: dto.title.length
          });
        }
      }
  
      if (dto.description !== undefined && dto.description.length > 5000) {
        errors.push({
          field: 'description',
          message: 'Description cannot exceed 5000 characters',
          value: dto.description.length
        });
      }
  
      if (dto.status && !Object.values(TodoStatus).includes(dto.status)) {
        errors.push({
          field: 'status',
          message: 'Invalid status value',
          value: dto.status
        });
      }
  
      if (dto.priority && !Object.values(Priority).includes(dto.priority)) {
        errors.push({
          field: 'priority',
          message: 'Invalid priority value',
          value: dto.priority
        });
      }
  
      // Add other validations similar to create...
  
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  
    /**
     * Validate a CreateProjectDto
     */
    static validateCreateProject(dto: CreateProjectDto): IValidationResult {
      const errors: IValidationError[] = [];
  
      if (!dto.name || dto.name.trim().length === 0) {
        errors.push({
          field: 'name',
          message: 'Project name is required and cannot be empty'
        });
      } else if (dto.name.length > 100) {
        errors.push({
          field: 'name',
          message: 'Project name cannot exceed 100 characters',
          value: dto.name.length
        });
      }
  
      if (dto.description && dto.description.length > 1000) {
        errors.push({
          field: 'description',
          message: 'Project description cannot exceed 1000 characters',
          value: dto.description.length
        });
      }
  
      if (dto.color && !this.isValidHexColor(dto.color)) {
        errors.push({
          field: 'color',
          message: 'Invalid color format. Must be a valid hex color (e.g., #FF5733)',
          value: dto.color
        });
      }
  
      if (dto.icon && dto.icon.length > 2) {
        errors.push({
          field: 'icon',
          message: 'Icon must be a single character or emoji',
          value: dto.icon
        });
      }
  
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  
    /**
     * Validate an UpdateProjectDto
     */
    static validateUpdateProject(dto: UpdateProjectDto): IValidationResult {
      const errors: IValidationError[] = [];
  
      if (dto.name !== undefined) {
        if (!dto.name || dto.name.trim().length === 0) {
          errors.push({
            field: 'name',
            message: 'Project name cannot be empty when updating'
          });
        } else if (dto.name.length > 100) {
          errors.push({
            field: 'name',
            message: 'Project name cannot exceed 100 characters',
            value: dto.name.length
          });
        }
      }
  
      if (dto.description !== undefined && dto.description.length > 1000) {
        errors.push({
          field: 'description',
          message: 'Project description cannot exceed 1000 characters',
          value: dto.description.length
        });
      }
  
      if (dto.color && !this.isValidHexColor(dto.color)) {
        errors.push({
          field: 'color',
          message: 'Invalid color format. Must be a valid hex color',
          value: dto.color
        });
      }
  
      if (dto.orderIndex !== undefined && dto.orderIndex < 0) {
        errors.push({
          field: 'orderIndex',
          message: 'Order index must be a positive number',
          value: dto.orderIndex
        });
      }
  
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  
    /**
     * Validate a recurrence rule
     */
    private static validateRecurrenceRule(rule: any): IValidationError[] {
      const errors: IValidationError[] = [];
  
      if (!rule.pattern || !Object.values(RecurrencePattern).includes(rule.pattern)) {
        errors.push({
          field: 'recurrence.pattern',
          message: 'Invalid recurrence pattern',
          value: rule.pattern
        });
      }
  
      if (rule.interval !== undefined && (rule.interval < 1 || rule.interval > 365)) {
        errors.push({
          field: 'recurrence.interval',
          message: 'Recurrence interval must be between 1 and 365',
          value: rule.interval
        });
      }
  
      if (rule.endDate) {
        const endDate = new Date(rule.endDate);
        if (isNaN(endDate.getTime())) {
          errors.push({
            field: 'recurrence.endDate',
            message: 'Invalid recurrence end date',
            value: rule.endDate
          });
        } else if (endDate < new Date()) {
          errors.push({
            field: 'recurrence.endDate',
            message: 'Recurrence end date cannot be in the past'
          });
        }
      }
  
      if (rule.pattern === RecurrencePattern.CUSTOM && !rule.customRule) {
        errors.push({
          field: 'recurrence.customRule',
          message: 'Custom rule is required for custom recurrence pattern'
        });
      }
  
      return errors;
    }
  
    /**
     * Check if a string is a valid hex color
     */
    private static isValidHexColor(color: string): boolean {
      return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }
  
    /**
     * Check if a string is a valid tag name
     */
    private static isValidTagName(tag: string): boolean {
      return /^[a-zA-Z0-9_-]{1,50}$/.test(tag);
    }
  
    /**
     * Check if a string is a valid UUID
     */
    static isValidUUID(uuid: string): boolean {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
    }
  
    /**
     * Sanitize a string for safe storage
     */
    static sanitizeString(str: string, maxLength: number = 255): string {
      return str
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .substring(0, maxLength);
    }
  
    /**
     * Validate email format
     */
    static isValidEmail(email: string): boolean {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
  
    /**
     * Validate date range
     */
    static isValidDateRange(startDate: Date, endDate: Date): boolean {
      return startDate <= endDate;
    }
  }
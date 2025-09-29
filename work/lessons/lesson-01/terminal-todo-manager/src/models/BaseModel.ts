/**
 * Base Model class for all models in the application
 */

import { DatabaseService } from '../services/DatabaseService';
import { IPaginationOptions, ISortOptions } from '../types/models';

export abstract class BaseModel<T> {
  protected db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Create a new entity
   */
  abstract create(data: Partial<T>): Promise<T>;

  /**
   * Update an existing entity
   */
  abstract update(id: string, data: Partial<T>): Promise<T | null>;

  /**
   * Delete an entity
   */
  abstract delete(id: string): Promise<boolean>;

  /**
   * Find an entity by ID
   */
  abstract findById(id: string): Promise<T | null>;

  /**
   * Find all entities
   */
  abstract findAll(): Promise<T[]>;

  /**
   * Count total entities
   */
  abstract count(): Promise<number>;

  /**
   * Apply sorting to an array of items
   */
  protected applySort<K extends T>(items: K[], options?: ISortOptions): K[] {
    if (!options) return items;

    const { field, direction } = options;
    const sorted = [...items].sort((a: any, b: any) => {
      const aValue = a[field];
      const bValue = b[field];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  /**
   * Apply pagination to an array of items
   */
  protected applyPagination<K extends T>(
    items: K[],
    options?: IPaginationOptions
  ): { items: K[]; total: number; page: number; totalPages: number } {
    if (!options) {
      return {
        items,
        total: items.length,
        page: 1,
        totalPages: 1
      };
    }

    const { page, limit } = options;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedItems = items.slice(start, end);

    return {
      items: paginatedItems,
      total: items.length,
      page,
      totalPages: Math.ceil(items.length / limit)
    };
  }

  /**
   * Validate entity before save
   */
  protected abstract validate(data: Partial<T>): Promise<boolean>;

  /**
   * Generate a unique ID
   */
  protected generateId(): string {
    // This will be replaced with UUID in implementation
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current timestamp
   */
  protected getCurrentTimestamp(): Date {
    return new Date();
  }
}
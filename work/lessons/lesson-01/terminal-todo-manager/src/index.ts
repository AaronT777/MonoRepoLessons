/**
 * Terminal Todo Manager - Main Entry Point
 * This is a demonstration of the Model layer functionality
 */

import { DatabaseService } from './services/DatabaseService';
import { TodoModel } from './models/TodoModel';
import { ProjectModel } from './models/ProjectModel';
import {
  Priority,
  TodoStatus,
  CreateTodoDto,
  CreateProjectDto
} from './types/models';

async function demonstrateModelLayer() {
  console.log('🚀 Terminal Todo Manager - Model Layer Demo\n');

  // Initialize database
  const db = new DatabaseService('./data');
  await db.initialize();

  // Initialize models
  const todoModel = new TodoModel(db);
  const projectModel = new ProjectModel(db);

  try {
    // 1. Create a project
    console.log('📁 Creating a project...');
    const projectData: CreateProjectDto = {
      name: 'Personal',
      description: 'Personal tasks and goals',
      color: '#4ECDC4',
      icon: '🏠'
    };
    const project = await projectModel.create(projectData);
    console.log(`✅ Project created: ${project.name} (${project.id})\n`);

    // 2. Create some todos
    console.log('📝 Creating todos...');
    
    const todo1Data: CreateTodoDto = {
      title: 'Complete TypeScript setup',
      description: 'Set up the TypeScript project with all necessary configurations',
      priority: Priority.HIGH,
      projectId: project.id,
      tags: ['setup', 'typescript'],
      dueDate: new Date(Date.now() + 86400000) // Tomorrow
    };
    const todo1 = await todoModel.create(todo1Data);
    console.log(`✅ Todo created: ${todo1.title}`);

    const todo2Data: CreateTodoDto = {
      title: 'Implement View layer',
      description: 'Create the blessed-based terminal UI',
      priority: Priority.MEDIUM,
      projectId: project.id,
      tags: ['development', 'ui'],
      dueDate: new Date(Date.now() + 172800000), // In 2 days
      subtasks: [
        { title: 'Create base view class', isCompleted: false, orderIndex: 0 },
        { title: 'Implement todo list view', isCompleted: false, orderIndex: 1 },
        { title: 'Add keyboard navigation', isCompleted: false, orderIndex: 2 }
      ]
    };
    const todo2 = await todoModel.create(todo2Data);
    console.log(`✅ Todo created: ${todo2.title} (with ${todo2.subtasks.length} subtasks)\n`);

    // 3. Query todos
    console.log('🔍 Querying todos...');
    
    // Get all todos
    const allTodos = await todoModel.findAll();
    console.log(`Total todos: ${allTodos.length}`);

    // Get today's todos
    const todayTodos = await todoModel.getToday();
    console.log(`Today's todos: ${todayTodos.length}`);

    // Get overdue todos
    const overdueTodos = await todoModel.getOverdue();
    console.log(`Overdue todos: ${overdueTodos.length}`);

    // Filter todos by project
    const projectTodos = await todoModel.find({
      projectId: project.id,
      status: TodoStatus.ACTIVE
    });
    console.log(`Active todos in ${project.name}: ${projectTodos.items.length}\n`);

    // 4. Update a todo
    console.log('✏️ Updating todo...');
    const updatedTodo = await todoModel.update(todo1.id, {
      priority: Priority.CRITICAL,
      description: 'URGENT: Complete TypeScript setup immediately!'
    });
    console.log(`✅ Todo updated: ${updatedTodo?.title} - Priority: ${updatedTodo?.priority}\n`);

    // 5. Toggle subtask completion
    if (todo2.subtasks.length > 0) {
      console.log('☑️ Toggling subtask...');
      const toggledTodo = await todoModel.toggleSubtask(todo2.id, todo2.subtasks[0].id);
      console.log(`✅ Subtask toggled: ${toggledTodo?.subtasks[0].title} - Completed: ${toggledTodo?.subtasks[0].isCompleted}\n`);
    }

    // 6. Get project statistics
    console.log('📊 Project statistics...');
    const stats = await projectModel.getStatistics(project.id);
    console.log(`Project: ${project.name}`);
    console.log(`  Total: ${stats.totalTodos}`);
    console.log(`  Active: ${stats.activeTodos}`);
    console.log(`  Completed: ${stats.completedTodos}`);
    console.log(`  Completion Rate: ${stats.completionRate}%\n`);

    // 7. Count todos by status
    console.log('📈 Todo counts by status...');
    const counts = await todoModel.countByStatus();
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // 8. Create backup
    console.log('\n💾 Creating backup...');
    const backupPath = await db.backup();
    console.log(`✅ Backup created: ${backupPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Clean up
    await db.destroy();
    console.log('\n👋 Demo completed!');
  }
}

// Run the demo
demonstrateModelLayer().catch(console.error);
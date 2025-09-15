# Terminal Todo Manager - Design Document

## 1. Executive Summary

### 1.1 Project Overview
A sophisticated terminal-based todo management application built with TypeScript and Blessed, implementing a clean MVC architecture. The application features a multi-panel interface providing comprehensive task management capabilities through an intuitive keyboard-driven terminal UI.

### 1.2 Key Features
- Multi-panel interactive terminal interface
- Task creation, editing, deletion, and organization
- Project/category management
- Priority and deadline tracking
- Search and filtering capabilities
- Data persistence with JSON/SQLite
- Keyboard shortcuts for efficient navigation
- Theme customization support

## 2. System Architecture

### 2.1 Architectural Pattern: MVC

#### 2.1.1 Model Layer
- **Responsibilities**: Data management, business logic, persistence
- **Components**:
  - `TodoModel`: Core todo item data structure and operations
  - `ProjectModel`: Project/category management
  - `FilterModel`: Search and filter logic
  - `ConfigModel`: Application settings and preferences
  - `DatabaseService`: Data persistence layer

#### 2.1.2 View Layer
- **Responsibilities**: UI rendering, layout management, theme application
- **Components**:
  - `MainView`: Application container and layout orchestrator
  - `TodoListView`: Todo items display panel
  - `DetailView`: Selected todo detailed view
  - `InputView`: Command/input panel
  - `StatusBarView`: Application status and shortcuts
  - `ProjectTreeView`: Project hierarchy panel
  - `CalendarView`: Date-based todo visualization

#### 2.1.3 Controller Layer
- **Responsibilities**: User input handling, view-model coordination
- **Components**:
  - `AppController`: Main application controller
  - `TodoController`: Todo CRUD operations
  - `NavigationController`: Panel focus and navigation
  - `CommandController`: Command parsing and execution
  - `ShortcutController`: Keyboard shortcut management

### 2.2 Component Interaction Flow
```
User Input → Controller → Model ↔ Database
     ↓           ↓          ↓
  View ← ← ← ← State ← ← ← ←
```

## 3. UI Layout Design

### 3.1 Panel Structure
```
┌─────────────────────────────────────────────────────────────┐
│                      Header Bar (Title/Date)                 │
├───────────────┬─────────────────────────┬───────────────────┤
│               │                         │                   │
│   Projects    │      Todo List          │     Details       │
│   & Tags      │      (Main Panel)       │     Panel         │
│   (20%)       │      (45%)              │     (35%)         │
│               │                         │                   │
│  ┌─Projects─┐ │  ┌─Active─┬─Pending─┐  │  ┌─Properties─┐   │
│  │          │ │  │        │         │  │  │            │   │
│  │▸ Work    │ │  │• Task1 │• Task5  │  │  │Title: ...  │   │
│  │▾ Personal│ │  │• Task2 │• Task6  │  │  │Due: ...    │   │
│  │  ▸ Home  │ │  │• Task3 │         │  │  │Priority:...│   │
│  │  ▸ Health│ │  │• Task4 │         │  │  │Tags: ...   │   │
│  │▸ Learning│ │  │        │         │  │  │            │   │
│  └──────────┘ │  └────────┴─────────┘  │  └────────────┘   │
│               │                         │                   │
│  ┌─Tags─────┐ │  ┌─Completed─────────┐ │  ┌─Notes──────┐   │
│  │          │ │  │                   │  │  │            │   │
│  │#urgent   │ │  │☑ Task7           │  │  │Description │   │
│  │#bug      │ │  │☑ Task8           │  │  │text here...│   │
│  │#feature  │ │  │                   │  │  │            │   │
│  └──────────┘ │  └───────────────────┘ │  └────────────┘   │
├───────────────┴─────────────────────────┴───────────────────┤
│  Command Input: > _                                          │
├───────────────────────────────────────────────────────────────┤
│ [F1]Help [F2]New [F3]Edit [F4]Delete [Tab]Switch [Q]uit     │
└───────────────────────────────────────────────────────────────┘
```

### 3.2 Panel Specifications

#### 3.2.1 Projects & Tags Panel
- **Purpose**: Navigation and organization
- **Features**:
  - Collapsible tree structure
  - Project count indicators
  - Tag frequency display
  - Quick filter activation

#### 3.2.2 Todo List Panel
- **Purpose**: Primary task display and management
- **Sections**:
  - Active tasks (sorted by priority/date)
  - Pending tasks (awaiting action)
  - Completed tasks (recent history)
- **Display Elements**:
  - Checkbox indicator
  - Priority marker (!, !!, !!!)
  - Due date badge
  - Project/tag indicators

#### 3.2.3 Details Panel
- **Purpose**: Comprehensive task information
- **Sections**:
  - Properties (metadata)
  - Notes (rich description)
  - Subtasks
  - Activity log

#### 3.2.4 Command Input Bar
- **Purpose**: Quick actions and search
- **Modes**:
  - Command mode (`:command`)
  - Search mode (`/search`)
  - Quick add mode (`+task`)

#### 3.2.5 Status Bar
- **Purpose**: Context and navigation help
- **Elements**:
  - Current mode indicator
  - Statistics (total/completed/overdue)
  - Keyboard shortcuts

## 4. Data Model

### 4.1 Core Entities

#### 4.1.1 Todo Item
```typescript
interface TodoItem {
  id: string;                    // UUID
  title: string;                 // Task title
  description?: string;          // Detailed description
  status: TodoStatus;            // active | pending | completed | archived
  priority: Priority;            // low | medium | high | critical
  projectId?: string;            // Reference to project
  tags: string[];                // Associated tags
  dueDate?: Date;                // Due date
  reminderDate?: Date;           // Reminder timestamp
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last modification
  completedAt?: Date;            // Completion timestamp
  subtasks: Subtask[];           // Child tasks
  attachments: Attachment[];     // File references
  recurrence?: RecurrenceRule;   // Repeat pattern
}
```

#### 4.1.2 Project
```typescript
interface Project {
  id: string;                    // UUID
  name: string;                  // Project name
  description?: string;          // Project description
  color: string;                 // Display color
  icon?: string;                 // Terminal icon/emoji
  parentId?: string;             // Parent project (hierarchy)
  orderIndex: number;            // Display order
  isArchived: boolean;           // Archive status
  createdAt: Date;               // Creation timestamp
  settings: ProjectSettings;     // Project-specific settings
}
```

#### 4.1.3 Tag
```typescript
interface Tag {
  name: string;                  // Tag identifier
  color?: string;                // Display color
  usageCount: number;            // Frequency counter
  lastUsed: Date;                // Last usage timestamp
}
```

### 4.2 Supporting Types

#### 4.2.1 Subtask
```typescript
interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  orderIndex: number;
}
```

#### 4.2.2 Attachment
```typescript
interface Attachment {
  id: string;
  filename: string;
  path: string;
  size: number;
  mimeType?: string;
  addedAt: Date;
}
```

#### 4.2.3 Recurrence Rule
```typescript
interface RecurrenceRule {
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;              // Every N days/weeks/etc
  endDate?: Date;                // Recurrence end
  exceptions: Date[];            // Skip dates
  customRule?: string;           // Cron expression
}
```

## 5. Technical Requirements

### 5.1 Technology Stack
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **UI Framework**: Blessed / Neo-blessed
- **Database**: SQLite (primary) / JSON (fallback)
- **ORM**: TypeORM / Prisma (optional)
- **State Management**: Custom EventEmitter-based
- **Testing**: Jest + Testing Library
- **Build Tool**: ESBuild / Webpack
- **Package Manager**: npm / yarn / pnpm

### 5.2 Dependencies

#### 5.2.1 Core Dependencies
- `blessed` / `neo-blessed`: Terminal UI framework
- `blessed-contrib`: Additional UI components
- `chalk`: Terminal styling
- `commander`: CLI argument parsing
- `inquirer`: Interactive prompts
- `sqlite3` / `better-sqlite3`: Database driver
- `uuid`: ID generation
- `date-fns`: Date manipulation
- `fuse.js`: Fuzzy search

#### 5.2.2 Development Dependencies
- `typescript`: Type system
- `@types/blessed`: Type definitions
- `ts-node`: Development execution
- `nodemon`: Auto-reload
- `jest`: Testing framework
- `eslint`: Code linting
- `prettier`: Code formatting

### 5.3 File Structure
```
todo-manager/
├── src/
│   ├── models/
│   │   ├── TodoModel.ts
│   │   ├── ProjectModel.ts
│   │   ├── FilterModel.ts
│   │   └── index.ts
│   ├── views/
│   │   ├── MainView.ts
│   │   ├── TodoListView.ts
│   │   ├── DetailView.ts
│   │   ├── ProjectTreeView.ts
│   │   └── components/
│   │       ├── InputBar.ts
│   │       └── StatusBar.ts
│   ├── controllers/
│   │   ├── AppController.ts
│   │   ├── TodoController.ts
│   │   ├── NavigationController.ts
│   │   └── CommandController.ts
│   ├── services/
│   │   ├── DatabaseService.ts
│   │   ├── ConfigService.ts
│   │   ├── ThemeService.ts
│   │   └── ExportService.ts
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   └── keybindings.ts
│   ├── types/
│   │   ├── models.ts
│   │   ├── views.ts
│   │   └── common.ts
│   ├── config/
│   │   ├── default.ts
│   │   └── themes.ts
│   └── index.ts
├── tests/
├── data/
│   └── todos.db
├── config/
│   └── user-config.json
├── themes/
├── package.json
├── tsconfig.json
├── .eslintrc.js
└── README.md
```

## 6. Features Specification

### 6.1 Core Features

#### 6.1.1 Task Management
- Create, read, update, delete todos
- Bulk operations (mark multiple complete)
- Drag-and-drop reordering (keyboard simulation)
- Quick task entry with natural language parsing
- Template support for recurring task types

#### 6.1.2 Organization
- Hierarchical project structure
- Tag-based categorization
- Smart lists (Today, Week, Overdue)
- Custom filters and saved searches
- Archive system for completed items

#### 6.1.3 Navigation
- Vim-style keyboard navigation
- Panel focus switching (Tab/Shift+Tab)
- Jump-to shortcuts (g+key combinations)
- Breadcrumb navigation
- Quick switcher (Ctrl+P style)

### 6.2 Advanced Features

#### 6.2.1 Search & Filter
- Full-text search across all fields
- Fuzzy search support
- Advanced query syntax
- Filter combinations (AND/OR logic)
- Search history

#### 6.2.2 Data Operations
- Import/Export (JSON, CSV, Markdown)
- Backup and restore
- Sync preparation (future feature)
- Bulk edit operations
- Undo/Redo system

#### 6.2.3 Customization
- Theme selection and creation
- Configurable keybindings
- Panel layout customization
- Custom fields support
- Plugin architecture preparation

## 7. User Interaction

### 7.1 Keyboard Shortcuts

#### 7.1.1 Global Shortcuts
- `Tab` / `Shift+Tab`: Switch panel focus
- `Ctrl+Q`: Quit application
- `Ctrl+S`: Save all changes
- `Ctrl+Z` / `Ctrl+Y`: Undo/Redo
- `F1`: Show help
- `:`: Enter command mode
- `/`: Enter search mode
- `Esc`: Cancel/Back

#### 7.1.2 List Navigation
- `j` / `k`: Move down/up
- `g` / `G`: Jump to top/bottom
- `Space`: Toggle selection
- `Enter`: Open details
- `d`: Delete item
- `e`: Edit item
- `n`: New item
- `x`: Mark complete

#### 7.1.3 Command Mode Commands
- `:new [task]`: Create new task
- `:delete [id]`: Delete task
- `:project [name]`: Switch project
- `:filter [query]`: Apply filter
- `:export [format]`: Export data
- `:theme [name]`: Change theme
- `:config`: Open settings

### 7.2 Mouse Support (Optional)
- Click to select
- Double-click to edit
- Scroll for navigation
- Drag borders to resize panels

## 8. Configuration

### 8.1 User Configuration File
```json
{
  "theme": "dark",
  "panels": {
    "showProjects": true,
    "showDetails": true,
    "projectsWidth": 20,
    "detailsWidth": 35
  },
  "behavior": {
    "confirmDelete": true,
    "autoSave": true,
    "saveInterval": 30
  },
  "shortcuts": {
    "custom": {
      "quickAdd": "Ctrl+N",
      "quickSearch": "Ctrl+F"
    }
  },
  "database": {
    "type": "sqlite",
    "path": "./data/todos.db"
  }
}
```

### 8.2 Theme Configuration
```json
{
  "name": "dark",
  "colors": {
    "background": "#1e1e1e",
    "foreground": "#d4d4d4",
    "border": "#464647",
    "focus": "#007acc",
    "priority": {
      "low": "#608b4e",
      "medium": "#dcdcaa",
      "high": "#d7ba7d",
      "critical": "#f44747"
    }
  }
}
```

## 9. Performance Considerations

### 9.1 Optimization Strategies
- Virtual scrolling for large lists
- Lazy loading of detail panels
- Debounced search and filter operations
- Efficient re-rendering with dirty checking
- Database indexing for common queries
- Memory-efficient data structures

### 9.2 Performance Targets
- Application startup: < 500ms
- Panel switch: < 50ms
- Search response: < 100ms
- Task creation: < 200ms
- Database operations: < 100ms
- Memory usage: < 100MB for 10,000 tasks

## 10. Testing Strategy

### 10.1 Unit Testing
- Model logic validation
- Controller action testing
- Service layer testing
- Utility function testing

### 10.2 Integration Testing
- View-Controller interaction
- Database operations
- Command processing
- Keyboard navigation

### 10.3 E2E Testing
- Complete user workflows
- Multi-panel interactions
- Data persistence verification

## 11. Future Enhancements

### 11.1 Phase 2 Features
- Cloud synchronization
- Multi-user collaboration
- Mobile companion app
- Web dashboard
- API endpoints

### 11.2 Phase 3 Features
- Plugin system
- AI-powered suggestions
- Calendar integration
- Time tracking
- Pomodoro timer

## 12. Development Phases

### Phase 1: Foundation (Week 1-2)
- Project setup and configuration
- Basic MVC structure
- Core data models
- Database layer

### Phase 2: UI Framework (Week 3-4)
- Blessed integration
- Panel layout system
- Basic navigation
- Theme support

### Phase 3: Core Features (Week 5-6)
- CRUD operations
- Project management
- Tag system
- Search and filter

### Phase 4: Advanced Features (Week 7-8)
- Keyboard shortcuts
- Command system
- Import/Export
- Settings management

### Phase 5: Polish & Testing (Week 9-10)
- Performance optimization
- Comprehensive testing
- Documentation
- Bug fixes

## 13. Success Criteria

### 13.1 Functional Requirements
- ✓ All CRUD operations working
- ✓ Multi-panel UI responsive
- ✓ Data persistence reliable
- ✓ Search and filter functional
- ✓ Keyboard navigation complete

### 13.2 Non-Functional Requirements
- ✓ Performance targets met
- ✓ Memory usage acceptable
- ✓ Code coverage > 80%
- ✓ Documentation complete
- ✓ Cross-platform compatibility

## 14. Risk Analysis

### 14.1 Technical Risks
- **Blessed limitations**: May need custom components
- **Performance issues**: Large dataset handling
- **Cross-platform compatibility**: Terminal differences
- **Database corruption**: Need robust backup system

### 14.2 Mitigation Strategies
- Evaluate alternative UI libraries early
- Implement pagination and virtual scrolling
- Test on multiple terminal emulators
- Regular automated backups

## 15. Conclusion

This design document outlines a comprehensive terminal-based todo manager that leverages modern TypeScript development practices with a clean MVC architecture. The multi-panel interface provides powerful task management capabilities while maintaining the efficiency and speed of terminal applications. The modular design ensures maintainability and enables future enhancements without major architectural changes.
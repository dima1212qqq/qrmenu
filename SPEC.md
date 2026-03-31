# Menu QR Service — SaaS Specification

## 1. Concept & Vision

Платформа для ресторанов и кафе с созданием цифровых меню, генерацией QR-кодов и вызовом официанта. Каждый ресторан — отдельная организация (тенант) со своей командой (владелец + официанты). Интерфейс минималистичный, фокус на контенте.

## 2. Architecture

### Multi-tenancy
- **Organization** (ресторан/кафе) — основная единица
- **User** — сотрудники организации (владелец, официанты)
- **Menu** — принадлежит организации
- **WaiterCall** — принадлежит меню, но виден всем сотрудникам организации

### User Roles
- **owner** — полный доступ, может управлять официантами и настройками
- **waiter** — может только видеть вызовы и помечать их выполненными

## 3. Data Model

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string; // уникальный идентификатор для URL
  created_at: number;
}

interface User {
  id: string;
  email: string;
  password: string; // bcrypt hash
  name: string;
  role: "owner" | "waiter";
  organization_id: string;
  created_at: number;
}

interface OrganizationSettings {
  telegramBotToken: string | null;
  telegramChatId: string | null;
  soundEnabled: boolean;
}

interface Menu {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  logo: string | null;
  created_at: number;
  settings: MenuSettings; // per-menu push overrides
}

interface MenuSettings {
  telegramBotToken: string | null; // override org settings
  telegramChatId: string | null;  // override org settings
  soundEnabled: boolean;
}

interface Category {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface Dish {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
}

interface DishCategory {
  dish_id: string;
  category_id: string;
}

interface WaiterCall {
  id: string;
  menu_id: string;
  table_number: string | null;
  created_at: number;
  status: "pending" | "completed";
}
```

## 4. Authentication

**NextAuth.js** с Credentials provider:
- Регистрация: `/register` — создаёт организацию и пользователя
- Вход: `/login` — email + password
- Session хранит userId, organizationId, role

### API Routes (protected)
Все API routes требуют авторизации и проверяют organization_id.

## 5. Public Menu URL

Новый формат: `/menu/[orgSlug]/[menuId]?table=5`

- orgSlug — уникальный идентификатор организации
- menuId — ID меню
- table — номер стола (опционально)

## 6. Feature List

### Auth
- Регистрация организации + владельца
- Вход по email/password
- Выход
- Управление официантами (только для owner)

### Admin Panel (/admin)
- Все существующие функции
- Данные фильтруются по organization_id
- Owner видит всех пользователей организации
- Waiter видит только меню и вызовы

### Push Notifications
- Глобальные настройки организации
- Per-menu overrides для Telegram
- Owner может настроить в Settings

### Waiter Calls
- Видны всем сотрудникам организации
- Любой может принять вызов

## 7. API Routes

### Auth
- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — вход
- `POST /api/auth/logout` — выход
- `GET /api/auth/session` — текущая сессия

### Organizations
- `GET /api/organizations/[id]` — данные организации
- `PATCH /api/organizations/[id]` — обновление настроек

### Users (organization users)
- `GET /api/users` — список пользователей организации
- `POST /api/users` — создать официанта (owner only)
- `DELETE /api/users/[id]` — удалить пользователя (owner only)

### Menus
- `GET/POST /api/menus` — список/создание меню организации
- `GET/PUT/DELETE /api/menus/[id]` — CRUD меню

### Categories
- `POST /api/categories` — создание категории
- `PUT/DELETE /api/categories/[id]` — обновление/удаление

### Dishes
- `POST /api/dishes` — создание блюда
- `PUT/DELETE /api/dishes/[id]` — обновление/удаление

### Waiter Calls
- `GET/POST /api/waiter` — список/создание вызовов
- `PATCH/DELETE /api/waiter/[id]` — принять/удалить вызов

### Public (no auth)
- `GET /api/public/menu/[orgSlug]/[menuId]` — получить меню для клиента

## 8. File Structure

```
/app
  /page.tsx (redirects to /admin or /login)
  /login/page.tsx
  /register/page.tsx
  /admin/page.tsx
  /menu/[orgSlug]/[menuId]/page.tsx
  /api/
    /auth/[...nextauth]/route.ts
    /organizations/[id]/route.ts
    /users/route.ts
    /users/[id]/route.ts
    /menus/route.ts
    /menus/[id]/route.ts
    /categories/route.ts
    /categories/[id]/route.ts
    /dishes/route.ts
    /dishes/[id]/route.ts
    /waiter/route.ts
    /waiter/[id]/route.ts
    /public/menu/[orgSlug]/[menuId]/route.ts
```

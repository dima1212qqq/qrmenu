import bcrypt from "bcryptjs";
import {
  UserRole,
  WaiterCallStatus,
  type Category as PrismaCategory,
  type Dish as PrismaDish,
  type DishCategory as PrismaDishCategory,
  type Menu as PrismaMenu,
  type Organization as PrismaOrganization,
  type User as PrismaUser,
  type WaiterCall as PrismaWaiterCall,
} from "@prisma/client";
import { prisma } from "./prisma";
import type {
  Category as AppCategory,
  Dish as AppDish,
  DishCategory as AppDishCategory,
  Menu as AppMenu,
  MenuSettings as AppMenuSettings,
  Organization as AppOrganization,
  User as AppUser,
  WaiterCall as AppWaiterCall,
} from "./types";

const DEFAULT_SOUND_ENABLED = true;

const CYRILLIC_TO_LATIN: Record<string, string> = {
  "\u0430": "a",
  "\u0431": "b",
  "\u0432": "v",
  "\u0433": "g",
  "\u0434": "d",
  "\u0435": "e",
  "\u0451": "e",
  "\u0436": "zh",
  "\u0437": "z",
  "\u0438": "i",
  "\u0439": "y",
  "\u043a": "k",
  "\u043b": "l",
  "\u043c": "m",
  "\u043d": "n",
  "\u043e": "o",
  "\u043f": "p",
  "\u0440": "r",
  "\u0441": "s",
  "\u0442": "t",
  "\u0443": "u",
  "\u0444": "f",
  "\u0445": "kh",
  "\u0446": "ts",
  "\u0447": "ch",
  "\u0448": "sh",
  "\u0449": "shch",
  "\u044a": "",
  "\u044b": "y",
  "\u044c": "",
  "\u044d": "e",
  "\u044e": "yu",
  "\u044f": "ya",
};

export interface OrganizationSettings {
  telegramBotToken: string | null;
  telegramChatId: string | null;
  soundEnabled: boolean;
}

export type MenuSettings = AppMenuSettings;

export interface OrganizationRecord extends AppOrganization {
  settings: OrganizationSettings;
}

export interface StoredUser extends AppUser {
  password: string;
  created_at: number;
}

interface OrganizationCreateInput {
  id?: string;
  name: string;
  slug: string;
  created_at?: number;
  settings?: Partial<OrganizationSettings>;
}

interface UserCreateInput {
  id?: string;
  email: string;
  password: string;
  name: string;
  role: "owner" | "waiter";
  organization_id: string;
  created_at?: number;
}

interface MenuCreateInput {
  id?: string;
  organization_id: string;
  name: string;
  description?: string | null;
  logo?: string | null;
  created_at?: number;
  settings?: Partial<MenuSettings>;
}

interface CategoryCreateInput {
  id?: string;
  menu_id: string;
  name: string;
  description?: string | null;
  sort_order: number;
}

interface DishCreateInput {
  id?: string;
  menu_id: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
}

interface WaiterCallCreateInput {
  id?: string;
  menu_id: string;
  table_number: string | null;
  created_at?: number;
  status: string;
}

type MenuUpdateInput = Partial<{
  name: string;
  description: string | null;
  logo: string | null;
  settings: Partial<MenuSettings>;
}>;

type CategoryUpdateInput = Partial<{
  name: string;
  description: string | null;
  sort_order: number;
}>;

type DishUpdateInput = Partial<{
  name: string;
  description: string | null;
  price: number;
  image: string | null;
}>;

type WaiterCallUpdateInput = Partial<{
  status: string;
  table_number: string | null;
}>;

function toNumber(value: bigint): number {
  return Number(value);
}

function toRole(role: UserRole): "owner" | "waiter" {
  return role === UserRole.owner ? "owner" : "waiter";
}

function toPrismaRole(role: "owner" | "waiter"): UserRole {
  return role === "owner" ? UserRole.owner : UserRole.waiter;
}

function toWaiterStatus(status: WaiterCallStatus): string {
  return status === WaiterCallStatus.completed ? "completed" : "pending";
}

function toPrismaWaiterStatus(status: string): WaiterCallStatus {
  return status === "completed" ? WaiterCallStatus.completed : WaiterCallStatus.pending;
}

function mapSettings(source: {
  telegramBotToken: string | null;
  telegramChatId: string | null;
  soundEnabled: boolean;
}): OrganizationSettings {
  return {
    telegramBotToken: source.telegramBotToken,
    telegramChatId: source.telegramChatId,
    soundEnabled: source.soundEnabled,
  };
}

function toOrganization(record: PrismaOrganization): OrganizationRecord {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    created_at: toNumber(record.createdAt),
    settings: mapSettings(record),
  };
}

function toUser(record: PrismaUser): StoredUser {
  return {
    id: record.id,
    email: record.email,
    password: record.password,
    name: record.name,
    role: toRole(record.role),
    organization_id: record.organizationId,
    created_at: toNumber(record.createdAt),
  };
}

function toMenu(record: PrismaMenu): AppMenu {
  return {
    id: record.id,
    organization_id: record.organizationId,
    name: record.name,
    description: record.description,
    logo: record.logo,
    created_at: toNumber(record.createdAt),
    settings: mapSettings(record),
  };
}

function toCategory(record: PrismaCategory): AppCategory {
  return {
    id: record.id,
    menu_id: record.menuId,
    name: record.name,
    description: record.description,
    sort_order: record.sortOrder,
  };
}

function toDish(record: PrismaDish): AppDish {
  return {
    id: record.id,
    menu_id: record.menuId,
    name: record.name,
    description: record.description,
    price: record.price,
    image: record.image,
  };
}

function toDishCategory(record: PrismaDishCategory): AppDishCategory {
  return {
    dish_id: record.dishId,
    category_id: record.categoryId,
  };
}

function toWaiterCall(record: PrismaWaiterCall): AppWaiterCall {
  return {
    id: record.id,
    menu_id: record.menuId,
    table_number: record.tableNumber,
    created_at: toNumber(record.createdAt),
    status: toWaiterStatus(record.status),
  };
}

export function slugify(text: string): string {
  const transliterated = Array.from(text.toLowerCase())
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const slug = transliterated
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "org";
}

export async function isSlugUnique(slug: string): Promise<boolean> {
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });

  return !organization;
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name);

  if (await isSlugUnique(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  while (!(await isSlugUnique(`${baseSlug}-${counter}`))) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}

export async function createOrganization(input: OrganizationCreateInput): Promise<OrganizationRecord> {
  const organization = await prisma.organization.create({
    data: {
      id: input.id,
      name: input.name,
      slug: input.slug,
      createdAt: BigInt(input.created_at ?? Date.now()),
      telegramBotToken: input.settings?.telegramBotToken ?? null,
      telegramChatId: input.settings?.telegramChatId ?? null,
      soundEnabled: input.settings?.soundEnabled ?? DEFAULT_SOUND_ENABLED,
    },
  });

  return toOrganization(organization);
}

export async function getOrganization(id: string): Promise<OrganizationRecord | undefined> {
  const organization = await prisma.organization.findUnique({ where: { id } });
  return organization ? toOrganization(organization) : undefined;
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationRecord | undefined> {
  const organization = await prisma.organization.findUnique({ where: { slug } });
  return organization ? toOrganization(organization) : undefined;
}

export async function getOrganizationSettings(orgId: string): Promise<OrganizationSettings> {
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  return organization ? mapSettings(organization) : {
    telegramBotToken: null,
    telegramChatId: null,
    soundEnabled: DEFAULT_SOUND_ENABLED,
  };
}

export async function updateOrganizationSettings(
  orgId: string,
  settings: Partial<OrganizationSettings>
): Promise<OrganizationSettings> {
  const organization = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(settings.telegramBotToken !== undefined ? { telegramBotToken: settings.telegramBotToken } : {}),
      ...(settings.telegramChatId !== undefined ? { telegramChatId: settings.telegramChatId } : {}),
      ...(settings.soundEnabled !== undefined ? { soundEnabled: settings.soundEnabled } : {}),
    },
  });

  return mapSettings(organization);
}

export async function getUsers(organizationId: string): Promise<StoredUser[]> {
  const users = await prisma.user.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });

  return users.map(toUser);
}

export async function getUser(id: string): Promise<StoredUser | undefined> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toUser(user) : undefined;
}

export async function getUserByEmail(email: string): Promise<StoredUser | undefined> {
  const user = await prisma.user.findUnique({ where: { email } });
  return user ? toUser(user) : undefined;
}

export async function createUser(input: UserCreateInput): Promise<StoredUser> {
  const hashedPassword = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      id: input.id,
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role: toPrismaRole(input.role),
      organizationId: input.organization_id,
      createdAt: BigInt(input.created_at ?? Date.now()),
    },
  });

  return toUser(user);
}

export async function verifyUser(email: string, password: string): Promise<StoredUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
  }

  return toUser(user);
}

export async function deleteUser(id: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === UserRole.owner) {
    return false;
  }

  await prisma.user.delete({ where: { id } });
  return true;
}

export async function getMenus(organizationId: string): Promise<AppMenu[]> {
  const menus = await prisma.menu.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });

  return menus.map(toMenu);
}

export async function getMenu(id: string): Promise<AppMenu | undefined> {
  const menu = await prisma.menu.findUnique({ where: { id } });
  return menu ? toMenu(menu) : undefined;
}

export async function getMenuWithCategories(menuId: string) {
  const [menu, categories, dishes, dishCategories] = await Promise.all([
    getMenu(menuId),
    getCategories(menuId),
    getDishes(menuId),
    getDishCategoriesForMenu(menuId),
  ]);

  if (!menu) {
    return null;
  }

  return { menu, categories, dishes, dishCategories };
}

export async function createMenu(input: MenuCreateInput): Promise<AppMenu> {
  const menu = await prisma.menu.create({
    data: {
      id: input.id,
      organizationId: input.organization_id,
      name: input.name,
      description: input.description ?? null,
      logo: input.logo ?? null,
      createdAt: BigInt(input.created_at ?? Date.now()),
      telegramBotToken: input.settings?.telegramBotToken ?? null,
      telegramChatId: input.settings?.telegramChatId ?? null,
      soundEnabled: input.settings?.soundEnabled ?? DEFAULT_SOUND_ENABLED,
    },
  });

  return toMenu(menu);
}

export async function updateMenu(id: string, updates: MenuUpdateInput): Promise<AppMenu | undefined> {
  const existing = await prisma.menu.findUnique({ where: { id } });
  if (!existing) {
    return undefined;
  }

  const menu = await prisma.menu.update({
    where: { id },
    data: {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.logo !== undefined ? { logo: updates.logo } : {}),
      ...(updates.settings?.telegramBotToken !== undefined
        ? { telegramBotToken: updates.settings.telegramBotToken }
        : {}),
      ...(updates.settings?.telegramChatId !== undefined
        ? { telegramChatId: updates.settings.telegramChatId }
        : {}),
      ...(updates.settings?.soundEnabled !== undefined
        ? { soundEnabled: updates.settings.soundEnabled }
        : {}),
    },
  });

  return toMenu(menu);
}

export async function deleteMenu(id: string): Promise<boolean> {
  const existing = await prisma.menu.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }

  await prisma.menu.delete({ where: { id } });
  return true;
}

export async function getCategories(menuId: string): Promise<AppCategory[]> {
  const categories = await prisma.category.findMany({
    where: { menuId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return categories.map(toCategory);
}

export async function getCategoriesForOrganization(organizationId: string): Promise<AppCategory[]> {
  const categories = await prisma.category.findMany({
    where: { menu: { organizationId } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return categories.map(toCategory);
}

export async function getCategory(id: string): Promise<AppCategory | undefined> {
  const category = await prisma.category.findUnique({ where: { id } });
  return category ? toCategory(category) : undefined;
}

export async function createCategory(input: CategoryCreateInput): Promise<AppCategory> {
  const category = await prisma.category.create({
    data: {
      id: input.id,
      menuId: input.menu_id,
      name: input.name,
      description: input.description ?? null,
      sortOrder: input.sort_order,
    },
  });

  return toCategory(category);
}

export async function updateCategory(id: string, updates: CategoryUpdateInput): Promise<AppCategory | undefined> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return undefined;
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.sort_order !== undefined ? { sortOrder: updates.sort_order } : {}),
    },
  });

  return toCategory(category);
}

export async function deleteCategory(id: string): Promise<boolean> {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }

  await prisma.category.delete({ where: { id } });
  return true;
}

export async function getDishes(menuId: string): Promise<AppDish[]> {
  const dishes = await prisma.dish.findMany({
    where: { menuId },
    orderBy: { name: "asc" },
  });

  return dishes.map(toDish);
}

export async function getDishesForOrganization(organizationId: string): Promise<AppDish[]> {
  const dishes = await prisma.dish.findMany({
    where: { menu: { organizationId } },
    orderBy: { name: "asc" },
  });

  return dishes.map(toDish);
}

export async function getDish(id: string): Promise<AppDish | undefined> {
  const dish = await prisma.dish.findUnique({ where: { id } });
  return dish ? toDish(dish) : undefined;
}

export async function createDish(input: DishCreateInput): Promise<AppDish> {
  const dish = await prisma.dish.create({
    data: {
      id: input.id,
      menuId: input.menu_id,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      image: input.image ?? null,
    },
  });

  return toDish(dish);
}

export async function updateDish(id: string, updates: DishUpdateInput): Promise<AppDish | undefined> {
  const existing = await prisma.dish.findUnique({ where: { id } });
  if (!existing) {
    return undefined;
  }

  const dish = await prisma.dish.update({
    where: { id },
    data: {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.price !== undefined ? { price: updates.price } : {}),
      ...(updates.image !== undefined ? { image: updates.image } : {}),
    },
  });

  return toDish(dish);
}

export async function deleteDish(id: string): Promise<boolean> {
  const existing = await prisma.dish.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }

  await prisma.dish.delete({ where: { id } });
  return true;
}

export async function getDishCategoriesForMenu(menuId: string): Promise<AppDishCategory[]> {
  const dishCategories = await prisma.dishCategory.findMany({
    where: { dish: { menuId } },
  });

  return dishCategories.map(toDishCategory);
}

export async function getDishCategoriesForOrganization(organizationId: string): Promise<AppDishCategory[]> {
  const dishCategories = await prisma.dishCategory.findMany({
    where: { dish: { menu: { organizationId } } },
  });

  return dishCategories.map(toDishCategory);
}

export async function createDishCategory(input: AppDishCategory): Promise<AppDishCategory> {
  const dishCategory = await prisma.dishCategory.upsert({
    where: {
      dishId_categoryId: {
        dishId: input.dish_id,
        categoryId: input.category_id,
      },
    },
    update: {},
    create: {
      dishId: input.dish_id,
      categoryId: input.category_id,
    },
  });

  return toDishCategory(dishCategory);
}

export async function deleteDishCategories(dishId: string): Promise<void> {
  await prisma.dishCategory.deleteMany({
    where: { dishId },
  });
}

export async function getWaiterCall(id: string): Promise<AppWaiterCall | undefined> {
  const waiterCall = await prisma.waiterCall.findUnique({ where: { id } });
  return waiterCall ? toWaiterCall(waiterCall) : undefined;
}

export async function getWaiterCallsForOrganization(organizationId: string): Promise<AppWaiterCall[]> {
  const waiterCalls = await prisma.waiterCall.findMany({
    where: { menu: { organizationId } },
    orderBy: { createdAt: "desc" },
  });

  return waiterCalls.map(toWaiterCall);
}

export async function createWaiterCall(input: WaiterCallCreateInput): Promise<AppWaiterCall> {
  const waiterCall = await prisma.waiterCall.create({
    data: {
      id: input.id,
      menuId: input.menu_id,
      tableNumber: input.table_number,
      createdAt: BigInt(input.created_at ?? Date.now()),
      status: toPrismaWaiterStatus(input.status),
    },
  });

  return toWaiterCall(waiterCall);
}

export async function updateWaiterCall(
  id: string,
  updates: WaiterCallUpdateInput
): Promise<AppWaiterCall | undefined> {
  const existing = await prisma.waiterCall.findUnique({ where: { id } });
  if (!existing) {
    return undefined;
  }

  const waiterCall = await prisma.waiterCall.update({
    where: { id },
    data: {
      ...(updates.status !== undefined ? { status: toPrismaWaiterStatus(updates.status) } : {}),
      ...(updates.table_number !== undefined ? { tableNumber: updates.table_number } : {}),
    },
  });

  return toWaiterCall(waiterCall);
}

export async function deleteWaiterCall(id: string): Promise<boolean> {
  const existing = await prisma.waiterCall.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }

  await prisma.waiterCall.delete({ where: { id } });
  return true;
}

export async function getMenuSettings(menuId: string): Promise<MenuSettings> {
  const menu = await prisma.menu.findUnique({ where: { id: menuId } });
  return menu ? mapSettings(menu) : {
    telegramBotToken: null,
    telegramChatId: null,
    soundEnabled: DEFAULT_SOUND_ENABLED,
  };
}

export async function updateMenuSettings(
  menuId: string,
  settings: Partial<MenuSettings>
): Promise<MenuSettings> {
  const menu = await prisma.menu.update({
    where: { id: menuId },
    data: {
      ...(settings.telegramBotToken !== undefined ? { telegramBotToken: settings.telegramBotToken } : {}),
      ...(settings.telegramChatId !== undefined ? { telegramChatId: settings.telegramChatId } : {}),
      ...(settings.soundEnabled !== undefined ? { soundEnabled: settings.soundEnabled } : {}),
    },
  });

  return mapSettings(menu);
}

export async function sendTelegramNotification(
  message: string,
  botToken: string,
  chatId: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return false;
  }
}

import bcrypt from "bcryptjs";
import {
  UserRole,
  WaiterCallStatus,
  type Category as PrismaCategory,
  type Dish as PrismaDish,
  type DishCategory as PrismaDishCategory,
  type Menu as PrismaMenu,
  type Organization as PrismaOrganization,
  type Tag as PrismaTag,
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
  Tag as AppTag,
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
  showWaiterButton: boolean;
  reviewRedirectUrl: string | null;
  reviewStarThreshold: number;
}

export interface Review {
  id: string;
  organization_id: string;
  rating: number;
  feedback: string | null;
  phone: string | null;
  created_at: Date;
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
  weight?: string | null;
  calories?: number | null;
  allergens?: string | null;
  tag_id?: string | null;
}

interface WaiterCallCreateInput {
  id?: string;
  menu_id: string;
  table_number: string | null;
  created_at?: number;
  status: string;
}

interface TagCreateInput {
  id?: string;
  name: string;
  emoji?: string;
  organization_id: string;
}

type TagUpdateInput = Partial<{
  name: string;
  emoji: string;
}>;

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
  weight: string | null;
  calories: number | null;
  allergens: string | null;
  tag_id: string | null;
  is_available: boolean;
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
  showWaiterButton?: boolean;
  reviewRedirectUrl?: string | null;
  reviewStarThreshold?: number;
}): OrganizationSettings {
  return {
    telegramBotToken: source.telegramBotToken,
    telegramChatId: source.telegramChatId,
    soundEnabled: source.soundEnabled,
    showWaiterButton: source.showWaiterButton ?? true,
    reviewRedirectUrl: source.reviewRedirectUrl ?? null,
    reviewStarThreshold: source.reviewStarThreshold ?? 5,
  };
}

function mapMenuSettings(source: {
  telegramBotToken: string | null;
  telegramChatId: string | null;
  soundEnabled: boolean;
  showWaiterButton?: boolean;
}): MenuSettings {
  return {
    telegramBotToken: source.telegramBotToken,
    telegramChatId: source.telegramChatId,
    soundEnabled: source.soundEnabled,
    showWaiterButton: source.showWaiterButton ?? true,
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
    settings: mapMenuSettings(record),
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
    weight: record.weight,
    calories: record.calories,
    allergens: record.allergens,
    tag_id: record.tagId,
    is_available: record.isAvailable,
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

function toTag(record: PrismaTag): AppTag {
  return {
    id: record.id,
    name: record.name,
    emoji: record.emoji,
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

export async function getUserOrganizations(userId: string): Promise<{ organization: OrganizationRecord; role: "owner" | "waiter" }[]> {
  const userOrganizations = await (prisma as any).userOrganization.findMany({
    where: { userId },
    include: {
      organization: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return userOrganizations.map((uo: any) => ({
    organization: toOrganization(uo.organization),
    role: uo.role === UserRole.owner ? "owner" : "waiter",
  }));
}

export async function getUserOrganization(
  userId: string,
  organizationId: string
): Promise<{ organization: OrganizationRecord; role: "owner" | "waiter" } | undefined> {
  const userOrganization = await (prisma as any).userOrganization.findFirst({
    where: {
      userId,
      organizationId,
    },
    include: {
      organization: true,
    },
  });

  if (!userOrganization) {
    return undefined;
  }

  return {
    organization: toOrganization(userOrganization.organization),
    role: userOrganization.role === UserRole.owner ? "owner" : "waiter",
  };
}

export async function getOrganizationSettings(orgId: string): Promise<OrganizationSettings> {
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  return organization ? mapSettings(organization) : {
    telegramBotToken: null,
    telegramChatId: null,
    soundEnabled: DEFAULT_SOUND_ENABLED,
    showWaiterButton: true,
    reviewRedirectUrl: null,
    reviewStarThreshold: 5,
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
      ...(settings.showWaiterButton !== undefined ? { showWaiterButton: settings.showWaiterButton } : {}),
      ...(settings.reviewRedirectUrl !== undefined ? { reviewRedirectUrl: settings.reviewRedirectUrl } : {}),
      ...(settings.reviewStarThreshold !== undefined ? { reviewStarThreshold: settings.reviewStarThreshold } : {}),
    },
  });

  return mapSettings(organization);
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
      createdAt: BigInt(input.created_at ?? Date.now()),
    } as any,
  });

  return toUser(user);
}

export async function addUserToOrganization(
  userId: string,
  organizationId: string,
  role: "owner" | "waiter"
): Promise<void> {
  await (prisma as any).userOrganization.create({
    data: {
      userId,
      organizationId,
      role: role === "owner" ? UserRole.owner : UserRole.waiter,
      createdAt: BigInt(Date.now()),
    },
  });
}

export async function getUsersForOrganization(organizationId: string): Promise<StoredUser[]> {
  const userOrganizations = await (prisma as any).userOrganization.findMany({
    where: { organizationId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return userOrganizations.map((uo: any) => toUser(uo.user));
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
  if (!user) {
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

export async function copyMenu(
  sourceMenuId: string,
  targetOrgId: string,
  newName?: string
): Promise<AppMenu> {
  const sourceMenu = await prisma.menu.findUnique({
    where: { id: sourceMenuId },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
      },
      dishes: true,
    },
  });

  if (!sourceMenu) {
    throw new Error("Source menu not found");
  }

  const sourceTagIds = Array.from(new Set(sourceMenu.dishes.map((d) => d.tagId).filter(Boolean) as string[]));
  const sourceTags = sourceTagIds.length > 0
    ? await prisma.tag.findMany({ where: { id: { in: sourceTagIds as string[] } } })
    : [];

  const tagMapping: Record<string, string> = {};
  for (const tag of sourceTags) {
    const existingTag = await prisma.tag.findFirst({
      where: { organizationId: targetOrgId, name: tag.name },
    });
    if (existingTag) {
      tagMapping[tag.id] = existingTag.id;
    } else {
      const newTag = await prisma.tag.create({
        data: {
          name: tag.name,
          emoji: tag.emoji,
          organizationId: targetOrgId,
        },
      });
      tagMapping[tag.id] = newTag.id;
    }
  }

  const newMenu = await prisma.menu.create({
    data: {
      name: newName || `${sourceMenu.name} (Copy)`,
      description: sourceMenu.description,
      logo: sourceMenu.logo,
      organizationId: targetOrgId,
      telegramBotToken: sourceMenu.telegramBotToken,
      telegramChatId: sourceMenu.telegramChatId,
      soundEnabled: sourceMenu.soundEnabled,
      showWaiterButton: sourceMenu.showWaiterButton,
      createdAt: BigInt(Date.now()),
    },
  });

  const categoryMapping: Record<string, string> = {};
  for (const category of sourceMenu.categories) {
    const newCategory = await prisma.category.create({
      data: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        menuId: newMenu.id,
      },
    });
    categoryMapping[category.id] = newCategory.id;
  }

  const dishCategoryLinks: { dishId: string; categoryId: string }[] = [];
  for (const dish of sourceMenu.dishes) {
    const newDish = await prisma.dish.create({
      data: {
        name: dish.name,
        description: dish.description,
        price: dish.price,
        image: dish.image,
        weight: dish.weight,
        calories: dish.calories,
        allergens: dish.allergens,
        tagId: dish.tagId ? tagMapping[dish.tagId] || null : null,
        isAvailable: dish.isAvailable,
        menuId: newMenu.id,
      },
    });

    const dishCategories = await prisma.dishCategory.findMany({
      where: { dishId: dish.id },
    });

    for (const dc of dishCategories) {
      const newCategoryId = categoryMapping[dc.categoryId];
      if (newCategoryId) {
        dishCategoryLinks.push({
          dishId: newDish.id,
          categoryId: newCategoryId,
        });
      }
    }
  }

  for (const link of dishCategoryLinks) {
    await prisma.dishCategory.create({
      data: {
        dishId: link.dishId,
        categoryId: link.categoryId,
      },
    });
  }

  return toMenu(newMenu);
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
      weight: input.weight ?? null,
      calories: input.calories ?? null,
      allergens: input.allergens ?? null,
      tagId: input.tag_id ?? null,
      isAvailable: true,
    } as any,
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
      ...(updates.weight !== undefined ? { weight: updates.weight } : {}),
      ...(updates.calories !== undefined ? { calories: updates.calories } : {}),
      ...(updates.allergens !== undefined ? { allergens: updates.allergens } : {}),
      ...(updates.tag_id !== undefined ? { tagId: updates.tag_id } : {}),
      ...(updates.is_available !== undefined ? { isAvailable: updates.is_available } : {}),
    } as any,
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
  return menu ? mapMenuSettings(menu) : {
    telegramBotToken: null,
    telegramChatId: null,
    soundEnabled: DEFAULT_SOUND_ENABLED,
    showWaiterButton: true,
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
      ...(settings.showWaiterButton !== undefined ? { showWaiterButton: settings.showWaiterButton } : {}),
    },
  });

  return mapMenuSettings(menu);
}

export async function getTags(organizationId: string): Promise<AppTag[]> {
  const tags = await prisma.tag.findMany({
    where: {
      organizationId,
    },
    orderBy: { name: "asc" },
  });

  return tags.map(toTag);
}

export async function getAllTags(): Promise<AppTag[]> {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
  });

  return tags.map(toTag);
}

export async function getTag(id: string): Promise<AppTag | undefined> {
  const tag = await prisma.tag.findUnique({ where: { id } });
  return tag ? toTag(tag) : undefined;
}

export async function getTagForOrganization(id: string, organizationId: string): Promise<AppTag | undefined> {
  const tag = await prisma.tag.findFirst({
    where: {
      id,
      organizationId,
    },
  });

  return tag ? toTag(tag) : undefined;
}

export async function createTag(input: TagCreateInput): Promise<AppTag> {
  const tag = await prisma.tag.create({
    data: {
      id: input.id,
      name: input.name,
      emoji: input.emoji || "⭐",
      organizationId: input.organization_id,
    },
  });

  return toTag(tag);
}

export async function updateTag(id: string, updates: TagUpdateInput): Promise<AppTag | undefined> {
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) {
    return undefined;
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.emoji !== undefined ? { emoji: updates.emoji } : {}),
    },
  });

  return toTag(tag);
}

export async function deleteTag(id: string): Promise<boolean> {
  const existing = await prisma.tag.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }

  await prisma.tag.delete({ where: { id } });
  return true;
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

export async function createReview(
  organizationId: string,
  rating: number,
  feedback: string | null,
  phone: string | null
): Promise<Review> {
  const review = await prisma.review.create({
    data: {
      organizationId,
      rating,
      feedback,
      phone,
    } as any,
  });

  return {
    id: review.id,
    organization_id: review.organizationId,
    rating: review.rating,
    feedback: review.feedback,
    phone: (review as any).phone || null,
    created_at: review.createdAt,
  };
}

export async function getOrganizationBySlugForReview(slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      telegramBotToken: true,
      telegramChatId: true,
      reviewRedirectUrl: true,
      reviewStarThreshold: true,
    },
  });

  return org;
}

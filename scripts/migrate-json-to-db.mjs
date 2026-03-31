import fs from "fs";
import path from "path";
import { PrismaClient, UserRole, WaiterCallStatus } from "@prisma/client";

const prisma = new PrismaClient();
const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "data.json");

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Source file not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function main() {
  const data = readJsonFile(sourcePath);

  await prisma.$transaction(async (tx) => {
    for (const org of data.organizations ?? []) {
      await tx.organization.upsert({
        where: { id: org.id },
        update: {
          name: org.name,
          slug: org.slug,
          createdAt: BigInt(org.created_at),
          telegramBotToken: org.settings?.telegramBotToken ?? null,
          telegramChatId: org.settings?.telegramChatId ?? null,
          soundEnabled: org.settings?.soundEnabled ?? true,
        },
        create: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          createdAt: BigInt(org.created_at),
          telegramBotToken: org.settings?.telegramBotToken ?? null,
          telegramChatId: org.settings?.telegramChatId ?? null,
          soundEnabled: org.settings?.soundEnabled ?? true,
        },
      });
    }

    for (const user of data.users ?? []) {
      await tx.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role === "owner" ? UserRole.owner : UserRole.waiter,
          organizationId: user.organization_id,
          createdAt: BigInt(user.created_at),
        },
        create: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role === "owner" ? UserRole.owner : UserRole.waiter,
          organizationId: user.organization_id,
          createdAt: BigInt(user.created_at),
        },
      });
    }

    for (const menu of data.menus ?? []) {
      await tx.menu.upsert({
        where: { id: menu.id },
        update: {
          organizationId: menu.organization_id,
          name: menu.name,
          description: menu.description ?? null,
          logo: menu.logo ?? null,
          createdAt: BigInt(menu.created_at),
          telegramBotToken: menu.settings?.telegramBotToken ?? null,
          telegramChatId: menu.settings?.telegramChatId ?? null,
          soundEnabled: menu.settings?.soundEnabled ?? true,
        },
        create: {
          id: menu.id,
          organizationId: menu.organization_id,
          name: menu.name,
          description: menu.description ?? null,
          logo: menu.logo ?? null,
          createdAt: BigInt(menu.created_at),
          telegramBotToken: menu.settings?.telegramBotToken ?? null,
          telegramChatId: menu.settings?.telegramChatId ?? null,
          soundEnabled: menu.settings?.soundEnabled ?? true,
        },
      });
    }

    for (const category of data.categories ?? []) {
      await tx.category.upsert({
        where: { id: category.id },
        update: {
          menuId: category.menu_id,
          name: category.name,
          description: category.description ?? null,
          sortOrder: category.sort_order,
        },
        create: {
          id: category.id,
          menuId: category.menu_id,
          name: category.name,
          description: category.description ?? null,
          sortOrder: category.sort_order,
        },
      });
    }

    for (const dish of data.dishes ?? []) {
      await tx.dish.upsert({
        where: { id: dish.id },
        update: {
          menuId: dish.menu_id,
          name: dish.name,
          description: dish.description ?? null,
          price: Number(dish.price ?? 0),
          image: dish.image ?? null,
        },
        create: {
          id: dish.id,
          menuId: dish.menu_id,
          name: dish.name,
          description: dish.description ?? null,
          price: Number(dish.price ?? 0),
          image: dish.image ?? null,
        },
      });
    }

    for (const link of data.dishCategories ?? []) {
      await tx.dishCategory.upsert({
        where: {
          dishId_categoryId: {
            dishId: link.dish_id,
            categoryId: link.category_id,
          },
        },
        update: {},
        create: {
          dishId: link.dish_id,
          categoryId: link.category_id,
        },
      });
    }

    for (const call of data.waiterCalls ?? []) {
      await tx.waiterCall.upsert({
        where: { id: call.id },
        update: {
          menuId: call.menu_id,
          tableNumber: call.table_number ?? null,
          createdAt: BigInt(call.created_at),
          status: call.status === "completed" ? WaiterCallStatus.completed : WaiterCallStatus.pending,
        },
        create: {
          id: call.id,
          menuId: call.menu_id,
          tableNumber: call.table_number ?? null,
          createdAt: BigInt(call.created_at),
          status: call.status === "completed" ? WaiterCallStatus.completed : WaiterCallStatus.pending,
        },
      });
    }
  });

  console.log("Migration from data.json completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

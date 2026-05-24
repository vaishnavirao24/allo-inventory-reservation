import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../lib/generated/prisma/client"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.")
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const products = [
  {
    name: "Industrial Hydraulic Pump",
    sku: "HYD-PUMP-001",
    description: "High-pressure hydraulic pump for industrial machinery.",
  },
  {
    name: "Pneumatic Control Valve",
    sku: "PNEU-VALVE-200",
    description: "Precision pneumatic valve for automated control systems.",
  },
  {
    name: "Electric Motor 5HP",
    sku: "ELEC-MOT-5HP",
    description: "Three-phase 5 horsepower electric motor.",
  },
]

const warehouses = [
  {
    name: "Austin Central",
    code: "AUS-CENTRAL",
    city: "Austin",
  },
  {
    name: "Denver North",
    code: "DEN-NORTH",
    city: "Denver",
  },
  {
    name: "Seattle West",
    code: "SEA-WEST",
    city: "Seattle",
  },
]

const stockLevels: Record<string, Record<string, number>> = {
  "HYD-PUMP-001": {
    "AUS-CENTRAL": 24,
    "DEN-NORTH": 12,
    "SEA-WEST": 6,
  },
  "PNEU-VALVE-200": {
    "AUS-CENTRAL": 75,
    "DEN-NORTH": 48,
    "SEA-WEST": 32,
  },
  "ELEC-MOT-5HP": {
    "AUS-CENTRAL": 18,
    "DEN-NORTH": 10,
    "SEA-WEST": 14,
  },
}

async function main() {
  const seededProducts = await Promise.all(
    products.map((product) =>
      prisma.product.upsert({
        where: { sku: product.sku },
        update: {
          name: product.name,
          description: product.description,
        },
        create: product,
      }),
    ),
  )

  const seededWarehouses = await Promise.all(
    warehouses.map((warehouse) =>
      prisma.warehouse.upsert({
        where: { code: warehouse.code },
        update: {
          name: warehouse.name,
          city: warehouse.city,
        },
        create: warehouse,
      }),
    ),
  )

  for (const product of seededProducts) {
    for (const warehouse of seededWarehouses) {
      const totalUnits = stockLevels[product.sku]?.[warehouse.code] ?? 0

      await prisma.stockLevel.upsert({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: warehouse.id,
          },
        },
        update: {
          totalUnits,
        },
        create: {
          productId: product.id,
          warehouseId: warehouse.id,
          totalUnits,
        },
      })
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })

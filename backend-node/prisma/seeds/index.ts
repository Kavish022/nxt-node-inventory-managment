import { PrismaClient, RoleName, UserAccountStatus, StockMovementType, PurchaseOrderStatus, SalesOrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ALL_PERMISSIONS, Permissions } from '../../src/constants/permissions';

export async function runAllSeeds(prisma: PrismaClient): Promise<void> {
  const startTime = Date.now();
  console.log('🌱 Starting Inventory Management System seeding...\n');

  // 1. Seed Permissions
  console.log('▶ [1/8] Seeding Permissions...');
  for (const permKey of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permKey },
      update: {},
      create: {
        key: permKey,
        description: `Permission to ${permKey.replace(':', ' ')}`,
      },
    });
  }

  // 2. Seed Roles
  console.log('▶ [2/8] Seeding Roles & Role Permissions...');
  const rolesData: { name: RoleName; description: string; permissions: string[] }[] = [
    {
      name: 'SUPER_ADMIN',
      description: 'Super Administrator with full unrestricted system access',
      permissions: ALL_PERMISSIONS,
    },
    {
      name: 'ADMIN',
      description: 'Administrator with management access across operations',
      permissions: ALL_PERMISSIONS.filter((p) => p !== Permissions.ROLES_WRITE),
    },
    {
      name: 'INVENTORY_MANAGER',
      description: 'Manages products, catalog, warehouses, stock levels and purchases',
      permissions: [
        Permissions.PRODUCTS_READ,
        Permissions.PRODUCTS_WRITE,
        Permissions.CATEGORIES_READ,
        Permissions.CATEGORIES_WRITE,
        Permissions.INVENTORY_READ,
        Permissions.INVENTORY_ADJUST,
        Permissions.INVENTORY_TRANSFER,
        Permissions.WAREHOUSES_READ,
        Permissions.SUPPLIERS_READ,
        Permissions.SUPPLIERS_WRITE,
        Permissions.CUSTOMERS_READ,
        Permissions.PURCHASE_ORDERS_READ,
        Permissions.PURCHASE_ORDERS_WRITE,
        Permissions.PURCHASE_ORDERS_APPROVE,
        Permissions.PURCHASE_ORDERS_RECEIVE,
        Permissions.SALES_ORDERS_READ,
        Permissions.REPORTS_READ,
        Permissions.REPORTS_EXPORT,
        Permissions.DASHBOARD_READ,
        Permissions.NOTIFICATIONS_READ,
      ],
    },
    {
      name: 'WAREHOUSE_MANAGER',
      description: 'Manages warehouse stocks, adjustments, and receipts',
      permissions: [
        Permissions.PRODUCTS_READ,
        Permissions.CATEGORIES_READ,
        Permissions.INVENTORY_READ,
        Permissions.INVENTORY_ADJUST,
        Permissions.INVENTORY_TRANSFER,
        Permissions.WAREHOUSES_READ,
        Permissions.PURCHASE_ORDERS_READ,
        Permissions.PURCHASE_ORDERS_RECEIVE,
        Permissions.SALES_ORDERS_READ,
        Permissions.SALES_ORDERS_FULFILL,
        Permissions.DASHBOARD_READ,
        Permissions.NOTIFICATIONS_READ,
      ],
    },
    {
      name: 'STAFF',
      description: 'Regular staff member for viewing items and creating orders',
      permissions: [
        Permissions.PRODUCTS_READ,
        Permissions.CATEGORIES_READ,
        Permissions.INVENTORY_READ,
        Permissions.WAREHOUSES_READ,
        Permissions.CUSTOMERS_READ,
        Permissions.CUSTOMERS_WRITE,
        Permissions.SALES_ORDERS_READ,
        Permissions.SALES_ORDERS_WRITE,
        Permissions.PURCHASE_ORDERS_READ,
        Permissions.DASHBOARD_READ,
      ],
    },
    {
      name: 'VIEWER',
      description: 'Read-only access to inventory metrics and reports',
      permissions: [
        Permissions.PRODUCTS_READ,
        Permissions.CATEGORIES_READ,
        Permissions.INVENTORY_READ,
        Permissions.WAREHOUSES_READ,
        Permissions.DASHBOARD_READ,
        Permissions.REPORTS_READ,
      ],
    },
  ];

  const dbRoles: Record<string, { id: number; name: RoleName }> = {};

  for (const r of rolesData) {
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
    dbRoles[r.name] = roleRecord;

    // Attach permissions
    const perms = await prisma.permission.findMany({
      where: { key: { in: r.permissions } },
    });

    for (const p of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleRecord.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: roleRecord.id,
          permissionId: p.id,
        },
      });
    }
  }

  // 3. Seed Users
  console.log('▶ [3/8] Seeding Users...');
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const managerPasswordHash = await bcrypt.hash('Manager@123456', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@123456', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@inventory.com' },
    update: { roleId: dbRoles['SUPER_ADMIN'].id },
    create: {
      email: 'admin@inventory.com',
      name: 'Alex Morgan (Super Admin)',
      passwordHash,
      roleId: dbRoles['SUPER_ADMIN'].id,
      accountStatus: UserAccountStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@inventory.com' },
    update: { roleId: dbRoles['INVENTORY_MANAGER'].id },
    create: {
      email: 'manager@inventory.com',
      name: 'Sarah Chen (Inventory Lead)',
      passwordHash: managerPasswordHash,
      roleId: dbRoles['INVENTORY_MANAGER'].id,
      accountStatus: UserAccountStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@inventory.com' },
    update: { roleId: dbRoles['STAFF'].id },
    create: {
      email: 'staff@inventory.com',
      name: 'David Miller (Warehouse Associate)',
      passwordHash: staffPasswordHash,
      roleId: dbRoles['STAFF'].id,
      accountStatus: UserAccountStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  // 4. Seed Warehouses
  console.log('▶ [4/8] Seeding Warehouses...');
  const whCentral = await prisma.warehouse.upsert({
    where: { code: 'WH-CENTRAL' },
    update: { managerId: managerUser.id },
    create: {
      code: 'WH-CENTRAL',
      name: 'Central Distribution Hub',
      address: '100 Logistics Blvd, Suite 400',
      city: 'Chicago',
      country: 'United States',
      managerId: managerUser.id,
    },
  });

  const whWest = await prisma.warehouse.upsert({
    where: { code: 'WH-WEST' },
    update: { managerId: managerUser.id },
    create: {
      code: 'WH-WEST',
      name: 'West Coast Logistics Center',
      address: '450 Pacific Coast Hwy',
      city: 'Long Beach',
      country: 'United States',
      managerId: managerUser.id,
    },
  });

  const whEast = await prisma.warehouse.upsert({
    where: { code: 'WH-EAST' },
    update: {},
    create: {
      code: 'WH-EAST',
      name: 'East Coast Gateway Depot',
      address: '88 Atlantic Way',
      city: 'Newark',
      country: 'United States',
    },
  });

  // 5. Seed Categories
  console.log('▶ [5/8] Seeding Categories...');
  const catElectronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics & Computers',
      slug: 'electronics',
      description: 'Laptops, peripherals, accessories, and networking components',
    },
  });

  const catOffice = await prisma.category.upsert({
    where: { slug: 'office-furniture' },
    update: {},
    create: {
      name: 'Office Furniture',
      slug: 'office-furniture',
      description: 'Ergonomic chairs, sit-stand desks, and workstations',
    },
  });

  const catPackaging = await prisma.category.upsert({
    where: { slug: 'warehouse-supplies' },
    update: {},
    create: {
      name: 'Packaging & Supplies',
      slug: 'warehouse-supplies',
      description: 'Corrugated boxes, thermal labels, and protective wrapping',
    },
  });

  // 6. Seed Suppliers & Customers
  console.log('▶ [6/8] Seeding Suppliers & Customers...');
  const supplierTech = await prisma.supplier.upsert({
    where: { email: 'sales@techflowcorp.com' },
    update: {},
    create: {
      name: 'TechFlow Components Inc',
      email: 'sales@techflowcorp.com',
      phone: '+1-555-0199',
      address: '100 Silicon Blvd',
      city: 'San Jose',
      country: 'United States',
      taxId: 'US-94-2849102',
    },
  });

  const supplierPack = await prisma.supplier.upsert({
    where: { email: 'orders@primepack.com' },
    update: {},
    create: {
      name: 'Prime Packaging Solutions',
      email: 'orders@primepack.com',
      phone: '+1-555-0244',
      address: '50 Industrial Pkwy',
      city: 'Atlanta',
      country: 'United States',
      taxId: 'US-58-1192840',
    },
  });

  const customerAcme = await prisma.customer.upsert({
    where: { email: 'procurement@acmecorp.com' },
    update: {},
    create: {
      name: 'Acme Enterprises',
      email: 'procurement@acmecorp.com',
      phone: '+1-555-3001',
      billingAddress: '500 Madison Ave, New York, NY',
      shippingAddress: '120 Logistics Center, Newark, NJ',
      city: 'New York',
      country: 'United States',
    },
  });

  const customerGlobal = await prisma.customer.upsert({
    where: { email: 'ops@globaldynamics.io' },
    update: {},
    create: {
      name: 'Global Dynamics LLC',
      email: 'ops@globaldynamics.io',
      phone: '+1-555-3002',
      billingAddress: '200 Michigan Ave, Chicago, IL',
      shippingAddress: '200 Michigan Ave, Chicago, IL',
      city: 'Chicago',
      country: 'United States',
    },
  });

  // 7. Seed Products & Inventory Settings
  console.log('▶ [7/8] Seeding Products & Stock Levels...');
  await prisma.inventorySetting.upsert({
    where: { id: 1 },
    update: { allowNegativeStock: false },
    create: { allowNegativeStock: false },
  });

  const productsData = [
    {
      sku: 'LOGI-MX3S-GRY',
      barcode: '097855160019',
      name: 'Logitech MX Master 3S Wireless Mouse',
      description: 'Ergonomic performance mouse with quiet clicks and 8K DPI sensor',
      categoryId: catElectronics.id,
      brand: 'Logitech',
      unitOfMeasure: 'pcs',
      costPrice: 65.00,
      sellingPrice: 99.99,
      minStockLevel: 15,
      maxStockLevel: 200,
      reorderQuantity: 50,
      stocks: [
        { warehouseId: whCentral.id, quantity: 85 },
        { warehouseId: whWest.id, quantity: 40 },
      ],
    },
    {
      sku: 'DELL-U2723QE-4K',
      barcode: '884116416241',
      name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor',
      description: 'IPS Black technology, 4K UHD, HDR 400, 90W power delivery',
      categoryId: catElectronics.id,
      brand: 'Dell',
      unitOfMeasure: 'pcs',
      costPrice: 380.00,
      sellingPrice: 579.99,
      minStockLevel: 8,
      maxStockLevel: 60,
      reorderQuantity: 20,
      stocks: [
        { warehouseId: whCentral.id, quantity: 24 },
        { warehouseId: whWest.id, quantity: 12 },
      ],
    },
    {
      sku: 'APPL-KB-TID-SLV',
      barcode: '194252432822',
      name: 'Apple Magic Keyboard with Touch ID & Keypad',
      description: 'Rechargeable wireless keyboard for Mac computers with Apple Silicon',
      categoryId: catElectronics.id,
      brand: 'Apple',
      unitOfMeasure: 'pcs',
      costPrice: 125.00,
      sellingPrice: 179.00,
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderQuantity: 30,
      stocks: [
        { warehouseId: whCentral.id, quantity: 5 }, // Low stock trigger
        { warehouseId: whWest.id, quantity: 3 },
      ],
    },
    {
      sku: 'CHAIR-ERG-PRO-BLK',
      barcode: '742689230192',
      name: 'Ergonomic Mesh Task Chair with Lumbar Support',
      description: 'Breathable dual-mesh back with adjustable headrest and 3D armrests',
      categoryId: catOffice.id,
      brand: 'ErgoComfort',
      unitOfMeasure: 'pcs',
      costPrice: 135.00,
      sellingPrice: 289.99,
      minStockLevel: 12,
      maxStockLevel: 80,
      reorderQuantity: 25,
      stocks: [
        { warehouseId: whCentral.id, quantity: 32 },
        { warehouseId: whEast.id, quantity: 18 },
      ],
    },
    {
      sku: 'BOX-CORR-16X12-25PK',
      barcode: '689201492011',
      name: 'Corrugated Shipping Boxes 16x12x8 (Pack of 25)',
      description: 'Heavy duty 200 lb test cardboard shipping cartons',
      categoryId: catPackaging.id,
      brand: 'PrimePack',
      unitOfMeasure: 'bundle',
      costPrice: 14.50,
      sellingPrice: 28.99,
      minStockLevel: 25,
      maxStockLevel: 300,
      reorderQuantity: 100,
      stocks: [
        { warehouseId: whCentral.id, quantity: 120 },
        { warehouseId: whWest.id, quantity: 80 },
        { warehouseId: whEast.id, quantity: 65 },
      ],
    },
    {
      sku: 'LBL-THM-4X6-4RL',
      barcode: '792018239014',
      name: 'Direct Thermal Shipping Labels 4"x6" (4 Rolls / 1000 Labels)',
      description: 'High-contrast smudge-free direct thermal courier shipping labels',
      categoryId: catPackaging.id,
      brand: 'PrimePack',
      unitOfMeasure: 'box',
      costPrice: 11.20,
      sellingPrice: 24.50,
      minStockLevel: 20,
      maxStockLevel: 250,
      reorderQuantity: 80,
      stocks: [
        { warehouseId: whCentral.id, quantity: 2 }, // Low stock trigger!
      ],
    },
  ];

  for (const item of productsData) {
    const { stocks, ...productFields } = item;
    const product = await prisma.product.upsert({
      where: { sku: productFields.sku },
      update: {
        costPrice: productFields.costPrice,
        sellingPrice: productFields.sellingPrice,
      },
      create: {
        ...productFields,
        createdById: adminUser.id,
      },
    });

    // Seed Warehouse stock and initial stock movements
    for (const st of stocks) {
      await prisma.warehouseStock.upsert({
        where: {
          uq_warehouse_product_stock: {
            warehouseId: st.warehouseId,
            productId: product.id,
          },
        },
        update: {
          quantity: st.quantity,
        },
        create: {
          warehouseId: st.warehouseId,
          productId: product.id,
          quantity: st.quantity,
          reservedQuantity: 0,
        },
      });

      const existingMovement = await prisma.stockMovement.findFirst({
        where: {
          productId: product.id,
          warehouseId: st.warehouseId,
          type: StockMovementType.OPENING,
        },
      });

      if (!existingMovement) {
        await prisma.stockMovement.create({
          data: {
            type: StockMovementType.OPENING,
            productId: product.id,
            warehouseId: st.warehouseId,
            quantity: st.quantity,
            resultingQuantity: st.quantity,
            unitCost: productFields.costPrice,
            notes: 'Initial warehouse opening stock inventory baseline',
            createdById: adminUser.id,
          },
        });
      }
    }
  }

  // 8. Seed Sample Purchase & Sales Orders
  console.log('▶ [8/8] Seeding Initial Orders...');
  const firstProduct = await prisma.product.findFirst({ where: { sku: 'LOGI-MX3S-GRY' } });
  const secondProduct = await prisma.product.findFirst({ where: { sku: 'DELL-U2723QE-4K' } });

  if (firstProduct && secondProduct) {
    // Seed Sample PO
    await prisma.purchaseOrder.upsert({
      where: { orderNumber: 'PO-2026-0001' },
      update: {},
      create: {
        orderNumber: 'PO-2026-0001',
        supplierId: supplierTech.id,
        warehouseId: whCentral.id,
        status: PurchaseOrderStatus.APPROVED,
        subtotal: 5100.00,
        taxAmount: 255.00,
        discountAmount: 0.00,
        total: 5355.00,
        notes: 'Replenishment order for Q4 electronics inventory',
        createdById: managerUser.id,
        approvedAt: new Date(),
        items: {
          create: [
            {
              productId: firstProduct.id,
              quantity: 50,
              unitPrice: 65.00,
              lineTotal: 3250.00,
            },
            {
              productId: secondProduct.id,
              quantity: 5,
              unitPrice: 370.00,
              lineTotal: 1850.00,
            },
          ],
        },
      },
    });

    // Seed Sample Sales Order
    await prisma.salesOrder.upsert({
      where: { orderNumber: 'SO-2026-0001' },
      update: {},
      create: {
        orderNumber: 'SO-2026-0001',
        customerId: customerAcme.id,
        warehouseId: whCentral.id,
        status: SalesOrderStatus.CONFIRMED,
        subtotal: 1099.98,
        taxAmount: 88.00,
        discountAmount: 0.00,
        total: 1187.98,
        notes: 'Corporate office workstation setup',
        createdById: staffUser.id,
        items: {
          create: [
            {
              productId: firstProduct.id,
              quantity: 5,
              unitPrice: 99.99,
              lineTotal: 499.95,
            },
            {
              productId: secondProduct.id,
              quantity: 1,
              unitPrice: 579.99,
              lineTotal: 579.99,
            },
          ],
        },
      },
    });
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Seeding completed successfully in ${duration}s!`);
}

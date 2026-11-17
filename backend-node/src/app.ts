import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import { securityMiddleware } from './middlewares/security.middleware';
import { corsMiddleware } from './middlewares/cors.middleware';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import { errorHandler } from './middlewares/errorHandler.middleware';

import { healthRoutes } from './modules/health/health.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/user/user.routes';
import { categoryRoutes } from './modules/category/category.routes';
import { productRoutes } from './modules/product/product.routes';
import { inventoryRoutes } from './modules/inventory/inventory.routes';
import { warehouseRoutes } from './modules/warehouse/warehouse.routes';
import { supplierRoutes } from './modules/supplier/supplier.routes';
import { customerRoutes } from './modules/customer/customer.routes';
import { purchaseOrderRoutes } from './modules/purchase-order/purchase-order.routes';
import { salesOrderRoutes } from './modules/sales-order/sales-order.routes';
import { notificationRoutes } from './modules/notification/notification.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { reportsRoutes } from './modules/reports/reports.routes';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi';

export function createApp(): Application {
  const app = express();

  // 1. Global Security, CORS & Logging Middlewares
  app.use(securityMiddleware);
  app.use(corsMiddleware);
  app.use(loggerMiddleware);

  // 2. Cookie & Body Parsing
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. API Rate Limiting
  app.use('/api', apiRateLimiter);

  // 4. API Route Registration (Supports both /api and /api/v1)
  const routePrefixes = ['/api', '/api/v1'];

  app.use(['/api/docs', '/api/v1/docs'], swaggerUi.serve, swaggerUi.setup(openApiSpec));

  routePrefixes.forEach((prefix) => {
    app.use(`${prefix}/health`, healthRoutes);
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/users`, userRoutes);
    app.use(`${prefix}/categories`, categoryRoutes);
    app.use(`${prefix}/products`, productRoutes);
    app.use(`${prefix}/inventory`, inventoryRoutes);
    app.use(`${prefix}/warehouses`, warehouseRoutes);
    app.use(`${prefix}/suppliers`, supplierRoutes);
    app.use(`${prefix}/customers`, customerRoutes);
    app.use(`${prefix}/purchase-orders`, purchaseOrderRoutes);
    app.use(`${prefix}/sales-orders`, salesOrderRoutes);
    app.use(`${prefix}/notifications`, notificationRoutes);
    app.use(`${prefix}/dashboard`, dashboardRoutes);
    app.use(`${prefix}/reports`, reportsRoutes);
  });

  // 5. Fallback 404 & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

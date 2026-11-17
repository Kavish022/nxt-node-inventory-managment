export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Production Inventory Management API',
    version: '1.0.0',
    description: 'Enterprise RESTful & Real-Time API for multi-warehouse inventory management, purchase & sales lifecycle, and reporting.',
  },
  servers: [
    { url: 'http://localhost:5001/api/v1', description: 'Local Development Server' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Service Health Check',
        responses: { 200: { description: 'System health status' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user with email & password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { email: { type: 'string' }, password: { type: 'string' } },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: { 200: { description: 'Authenticated successfully with HttpOnly cookies' } },
      },
    },
    '/dashboard/overview': {
      get: {
        summary: 'Retrieve inventory KPI metrics',
        responses: { 200: { description: 'Overview statistics' } },
      },
    },
    '/dashboard/analytics': {
      get: {
        summary: 'Retrieve chart datasets and distribution trends',
        responses: { 200: { description: 'Analytics data' } },
      },
    },
    '/products': {
      get: {
        summary: 'List products with stock levels',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Paginated product catalog' } },
      },
      post: {
        summary: 'Create a new product',
        responses: { 201: { description: 'Product created' } },
      },
    },
    '/inventory/adjust': {
      post: {
        summary: 'Adjust stock levels (Stock In, Stock Out, Reconciliation)',
        responses: { 200: { description: 'Stock adjusted and movement recorded' } },
      },
    },
    '/inventory/transfer': {
      post: {
        summary: 'Transfer inventory between warehouses',
        responses: { 200: { description: 'Transfer executed' } },
      },
    },
    '/purchase-orders': {
      get: { summary: 'List purchase orders' },
      post: { summary: 'Create purchase order' },
    },
    '/sales-orders': {
      get: { summary: 'List sales orders' },
      post: { summary: 'Create sales order' },
    },
    '/reports/valuation': {
      get: { summary: 'Stock valuation report (JSON or CSV)' },
    },
  },
};

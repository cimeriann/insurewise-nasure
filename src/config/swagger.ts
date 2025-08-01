import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NaSure API',
      version: '1.0.0',
      description: 'API documentation for NaSure',
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Local server',
      },
      {
        url: 'https://insurewise-nasure.onrender.com',
        description: 'Production server',
      },
      // You can add production server here too
    ],
  },
  apis: ['src/routes/*.ts', 'src/models/*.ts'], // Add paths to files with Swagger comments
};

export const swaggerSpec = swaggerJsdoc(options);

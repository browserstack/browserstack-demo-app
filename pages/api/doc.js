import { createSwaggerSpec } from 'next-swagger-doc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BrowserStack Demo API',
      version: '1.0.0',
    },
  },
  apiFolder: 'pages/api',
};

export default (req, res) => {
  try {
    const swaggerSpec = createSwaggerSpec(swaggerOptions);
    // File discovery order is not guaranteed; list endpoints alphabetically.
    swaggerSpec.paths = Object.fromEntries(
      Object.entries(swaggerSpec.paths).sort(([a], [b]) => a.localeCompare(b))
    );
    res.status(200).send(swaggerSpec);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create Swagger spec',
    });
  }
};

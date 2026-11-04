import { withSwagger } from 'next-swagger-doc';

const swaggerHandler = withSwagger({
  apiFolder: 'pages/api',
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BrowserStack Demo API',
      version: '1.0.0',
    },
  },
});
export default swaggerHandler();

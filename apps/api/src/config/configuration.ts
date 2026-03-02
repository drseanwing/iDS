export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL || 'postgresql://opengrade:opengrade@localhost:5432/opengrade',
  },
  auth: {
    keycloakUrl: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    keycloakRealm: process.env.KEYCLOAK_REALM || 'opengrade',
    keycloakClientId: process.env.KEYCLOAK_CLIENT_ID || 'opengrade-api',
    keycloakClientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'opengrade',
  },
});

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Backoffice Buys Softland API',
    version: '0.1.0',
    description: 'Documentación OpenAPI inicial para endpoints de health, config y auth.'
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Desarrollo local' }
  ],
  tags: [
    { name: 'Health' },
    { name: 'Config' },
    { name: 'Auth' },
    { name: 'Suppliers' },
    { name: 'PurchaseOrders' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Chequeo de salud del backend',
        responses: {
          '200': {
            description: 'Estado OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    service: { type: 'string' },
                    version: { type: 'string' },
                    uptime: { type: 'number' },
                    db: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        latencyMs: { type: 'number' },
                        error: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/config': {
      get: {
        tags: ['Config'],
        summary: 'Obtiene información pública de la app',
        responses: {
          '200': {
            description: 'Configuración de la app',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    api: { type: 'string' },
                    version: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Inicia sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validation error' },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresca tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', minLength: 10 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validation error' },
          '401': { description: 'Invalid or expired refresh token' }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Cierra sesión (revoca refresh token)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', minLength: 10 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validation error' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Devuelve usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/suppliers': {
      get: {
        tags: ['Suppliers'],
        summary: 'Lista proveedores (con búsqueda opcional)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'skip', in: 'query', schema: { type: 'integer', minimum: 0 } },
          { name: 'take', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }
        ],
        responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' } }
      },
      post: {
        tags: ['Suppliers'],
        summary: 'Crea proveedor',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  taxId: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                  isActive: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: { '201': { description: 'Created' }, '400': { description: 'Validation error' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' } }
      }
    },
    '/api/suppliers/{id}': {
      get: {
        tags: ['Suppliers'],
        summary: 'Obtiene proveedor por ID',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } } ],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' }, '401': { description: 'Unauthorized' } }
      },
      put: {
        tags: ['Suppliers'],
        summary: 'Actualiza proveedor',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } } ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SupplierUpdate' } }
          }
        },
        responses: { '200': { description: 'OK' }, '400': { description: 'Validation error' }, '404': { description: 'Not Found' } }
      },
      delete: {
        tags: ['Suppliers'],
        summary: 'Elimina proveedor',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } } ],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } }
      }
    },
    '/api/po': {
      get: {
        tags: ['PurchaseOrders'],
        summary: 'Lista órdenes de compra',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'supplierId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'skip', in: 'query', schema: { type: 'integer', minimum: 0 } },
          { name: 'take', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }
        ],
        responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } }
      },
      post: {
        tags: ['PurchaseOrders'],
        summary: 'Crea una orden de compra',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['supplierId', 'items'],
                properties: {
                  supplierId: { type: 'string', format: 'uuid' },
                  currency: { type: 'string', enum: ['ARS', 'USD', 'EUR'] },
                  notes: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['description', 'quantity', 'unitPrice'],
                      properties: {
                        description: { type: 'string' },
                        quantity: { type: 'integer', minimum: 1 },
                        unitPrice: { type: 'number', minimum: 0 },
                        taxPercent: { type: 'number', minimum: 0, maximum: 100 }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: { '201': { description: 'Created' }, '400': { description: 'Validation error' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/api/po/{id}': {
      get: {
        tags: ['PurchaseOrders'],
        summary: 'Obtiene una orden de compra por ID',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } } ],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' }, '401': { description: 'Unauthorized' } }
      },
      post: {
        tags: ['PurchaseOrders'],
        summary: 'Envía la orden a aprobación (instancia pasos desde la política)',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } } ],
        responses: { '200': { description: 'Submitted' }, '400': { description: 'Invalid state or no matching policy' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/api/po/{id}/steps': {
      get: {
        tags: ['PurchaseOrders'],
        summary: 'Lista los pasos de aprobación de la OC',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } } ],
        responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/api/po/{id}/steps/{order}/approve': {
      post: {
        tags: ['PurchaseOrders'],
        summary: 'Aprueba el paso actual de la OC (multi-nivel)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'order', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': { schema: { type: 'object', properties: { comment: { type: 'string' } } } }
          }
        },
        responses: { '200': { description: 'Approved' }, '400': { description: 'Step mismatch or validation error' }, '403': { description: 'Forbidden' } }
      }
    },
    '/api/po/{id}/steps/{order}/reject': {
      post: {
        tags: ['PurchaseOrders'],
        summary: 'Rechaza el paso actual de la OC (multi-nivel)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'order', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': { schema: { type: 'object', properties: { comment: { type: 'string' } } } }
          }
        },
        responses: { '200': { description: 'Rejected' }, '400': { description: 'Step mismatch or validation error' }, '403': { description: 'Forbidden' } }
      }
    },
    '/api/po/{id}/cancel': {
      post: {
        tags: ['PurchaseOrders'],
        summary: 'Cancela la OC y marca pasos pendientes como SKIPPED',
        security: [{ bearerAuth: [] }],
        parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } } ],
        responses: { '200': { description: 'Cancelled' }, '401': { description: 'Unauthorized' } }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      SupplierUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          taxId: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          address: { type: 'string' },
          isActive: { type: 'boolean' }
        }
      }
    }
  }
}

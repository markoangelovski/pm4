import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from './app-config.service.js';
import { Env } from './env.schema.js';

describe('AppConfigService', () => {
  let service: AppConfigService;

  const env: Env = {
    NODE_ENV: 'production',
    PORT: 4000,
    DATABASE_URL: 'postgres://localhost:5432/pm4',
    REDIS_URL: 'redis://localhost:6379',
    CORS_ORIGINS: ['https://pm4.example.com'],
    WEB_APP_URL: 'https://pm4.example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: keyof Env) => env[key],
          },
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('exposes typed getters over the validated env', () => {
    expect(service.nodeEnv).toBe('production');
    expect(service.isProduction).toBe(true);
    expect(service.port).toBe(4000);
    expect(service.databaseUrl).toBe('postgres://localhost:5432/pm4');
    expect(service.redisUrl).toBe('redis://localhost:6379');
    expect(service.corsOrigins).toEqual(['https://pm4.example.com']);
    expect(service.webAppUrl).toBe('https://pm4.example.com');
  });

  it('isProduction is false outside production', () => {
    env.NODE_ENV = 'development';
    expect(service.isProduction).toBe(false);
    env.NODE_ENV = 'production';
  });
});

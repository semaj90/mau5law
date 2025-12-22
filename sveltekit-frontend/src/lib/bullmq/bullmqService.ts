9: export interface CacheInvalidationJob { pattern: string; userId?: string; type?: string}
  10: // Job results export interface JobResult { success: boolean; data?: any; error? : string; processingTime: number; metadata?: { [key: string]: any }}
  11: 
  12: export class RabbitMQService { private redis: Redis; private redisConfig: unknown; private queues: Map<string, Queue> = new Map();
  13:  
> 14:  this.redis = new Redis();
  15:  
  16:  return { success: false, error: error instanceof Error ? error.message : 'Unknown error', processingTime: Date.now();
  17:  
  18:  await db.insert();
  19:
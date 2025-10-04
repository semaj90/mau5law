import type * as Kit from '@sveltejs/kit';

type RouteParams = {};

export type PageServerLoad = (event: Kit.ServerLoadEvent<RouteParams, Kit.ParentData, "/(authenticated)/all-routes">) => Promise<{
  availableRoutes: Array<{
    path: string;
    icon: string;
    description: string;
  }>;
  routeInventory: {
    fileRoutesSample: string[];
    counts: {
      config: number;
      fileBased: number;
      api: number;
      configMissingFiles: number;
      filesMissingConfig: number;
      consolidatable: number;
    };
  };
  serviceHealth: {
    system_overview: {
      healthy_services: number;
      total_services: number;
      uptime_hours: number;
      last_updated: string;
    };
    services: Array<any>;
    performance: {
      cpu_usage: number;
      memory_usage: number;
      disk_usage: number;
    };
  };
  recommendedRouteLayout: any;
}>;

type PageParent = Kit.AwaitedProperties<Kit.ParentData>;
export type PageServerData = Kit.AwaitedProperties<ReturnType<PageServerLoad>>;
export type PageData = PageParent & PageServerData;
export type ActionData = unknown;
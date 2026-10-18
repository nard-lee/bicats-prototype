import "react-router";

export interface AppRouteHandle {
  crumb?: (data?: any) => string;
}

declare module "react-router" {
  interface RouteHandle extends AppRouteHandle {}
}
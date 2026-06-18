import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_ROUTE = Symbol("IS_PUBLIC_ROUTE");

/** Marks a route or controller as reachable without JWT enforcement. */
export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);

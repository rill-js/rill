import { Types as TypesChain } from "@rill/chain";
import {
  IncomingMessage,
  Server,
  ServerResponse,
  Types as HttpT
} from "@rill/http";
import Rill from "./";
import { Context } from "./context";

export type Headers = HttpT.Headers;

export type SetupFunction = (app: Rill) => any;
export type SetupArg = SetupFunction | false | void;

export type NextFunction = TypesChain.NextFunction;
export type MiddlewareFunction = (ctx: Context, next?: NextFunction) => any;
export type MiddlewareArg = Stack | MiddlewareFunction | Rill | false | void;
export interface Stack extends Array<MiddlewareArg> {
  [index: number]: MiddlewareArg;
}

export type HttpRequestHandler = (
  this: Server,
  req: IncomingMessage,
  res?: ServerResponse
) => any;
export type HttpListenHandler = (this: Server) => any;

export type MethodShortcut = (
  pathname: string | MiddlewareArg,
  ...middlewares: MiddlewareArg[]
) => Rill;

export interface ListenOptions {
  ip?: string;
  port?: number;
  backlog?: number;
  tls?: any;
}

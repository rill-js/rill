import { Types as ChainT } from "@rill/chain";
import {
  IncomingMessage,
  Server,
  ServerResponse,
  Types as HttpT
} from "@rill/http";
import { TlsOptions as _TlsOptions } from "tls";
import Rill from "./";
import Context from "./context";

export namespace Types {
  export type Headers = HttpT.Headers;

  export type SetupFunction = (app: Rill) => any;
  export type SetupArg = SetupFunction | false | void;

  export type NextFunction = ChainT.NextFunction;
  export type MiddlewareFunction = ChainT.MiddlewareFunction<Context>;
  export type MiddlewareArg = ChainT.MiddlewareArg<Context>;
  export type Stack = ChainT.Stack<Context>;

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

  export type TlsOptions = _TlsOptions;
  export interface ListenOptions {
    ip?: string;
    port?: number;
    backlog?: number;
    tls?: TlsOptions;
  }
}

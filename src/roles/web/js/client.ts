/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface BuildInfo {
  version: string;
  hash: string;
}

export interface EnvInfo {
  mode: string;
}

export interface User {
  id: string;

  /** @format date-time */
  created: string;

  /** @format date-time */
  updated: string;
  displayName?: string;
  nameFirst: string;
  nameMiddle: string;
  nameLast: string;
}

export interface InfoResponse {
  buildInfo?: BuildInfo;
  environment: EnvInfo;
  user?: User;
  defaultWorkspace?: string;
  defaultStrategy?: string;
}

/**
 * Make all properties in T optional
 */
export interface PartialBotDefinition {
  workspaceId?: string;
  name?: string;
  symbols?: string;
  genome?: string;
  description?: string;
  id?: string;

  /** @format date-time */
  created?: string;

  /** @format date-time */
  updated?: string;
  displayName?: string;
}

/**
* NOTE: These constants are used in the database.
DO NOT remove of change values here. Add and deprecate.
*/
export enum BotMode {
  TestBack = "test-back",
  TestForward = "test-forward",
  Live = "live",
  TestLive = "test-live",
  Paused = "paused",
}

/**
 * Represents time resolutions for price intervals.
 */
export enum TimeResolution {
  Type1S = "1s",
  Type2S = "2s",
  Type1M = "1m",
  Type5M = "5m",
  Type15M = "15m",
  Type1H = "1h",
  Type1D = "1d",
  Type1W = "1w",
}

/**
 * Describes the run state of a strategy or bot.
 */
export enum RunState {
  New = "new",
  Initializing = "initializing",
  Active = "active",
  Paused = "paused",
  Stopped = "stopped",
  Error = "error",
}

export interface BotInstanceStateInternal {
  baseSymbolId: string;
  quoteSymbolId: string;
}

export enum GeneticBotFsmState {
  WaitForBuyOpp = "wait-for-buy-opp",
  WaitForSellOpp = "wait-for-sell-opp",
  WaitForBuyOrderConf = "wait-for-buy-order-conf",
  WaitForSellOrderConf = "wait-for-sell-order-conf",
  SellSurf = "sell-surf",
  BuySurf = "buy-surf",
}

export type BigNum = string;

export interface GeneticBotState {
  fsmState: GeneticBotFsmState;
  prevFsmState: GeneticBotFsmState;

  /** @format date-time */
  prevFsmStateChangeTs: string;
  signals: number[];
  prevQuantity: BigNum;
  prevPrice: BigNum;
  prevOrderId: string;
  stopLossPrice: BigNum;
  targetPrice: BigNum;
  verbose?: boolean;
}

export interface BotInstance {
  id: string;

  /** @format date-time */
  created: string;

  /** @format date-time */
  updated: string;
  displayName?: string;
  allocationId: string;
  definitionId: string;
  exchangeId: string;

  /**
   * NOTE: These constants are used in the database.
   * DO NOT remove of change values here. Add and deprecate.
   */
  modeId: BotMode;

  /** Represents time resolutions for price intervals. */
  resId: TimeResolution;
  typeId: string;
  name: string;
  type: string;
  build: string;

  /** @format date-time */
  prevTick: string;
  symbols: string;
  currentGenome?: string;
  normalizedGenome?: string;

  /** Describes the run state of a strategy or bot. */
  runState: RunState;
  stateInternal: BotInstanceStateInternal;
  stateJson: GeneticBotState;
}

/**
 * Make all properties in T optional
 */
export interface PartialBotInstance {
  allocationId?: string;
  definitionId?: string;
  exchangeId?: string;

  /**
   * NOTE: These constants are used in the database.
   * DO NOT remove of change values here. Add and deprecate.
   */
  modeId?: BotMode;

  /** Represents time resolutions for price intervals. */
  resId?: TimeResolution;
  typeId?: string;
  name?: string;
  type?: string;
  build?: string;

  /** @format date-time */
  prevTick?: string;
  symbols?: string;
  currentGenome?: string;
  normalizedGenome?: string;

  /** Describes the run state of a strategy or bot. */
  runState?: RunState;
  stateInternal?: BotInstanceStateInternal;
  stateJson?: BotInstance;
  id?: string;

  /** @format date-time */
  created?: string;

  /** @format date-time */
  updated?: string;
  displayName?: string;
}

/**
 * Make all properties in T optional
 */
export interface PartialBotRun {
  instanceId?: string;
  active?: boolean;

  /** @format date-time */
  from?: string;

  /** @format date-time */
  to?: string;
  id?: string;

  /** @format date-time */
  created?: string;

  /** @format date-time */
  updated?: string;
  displayName?: string;
}

export enum OrderState {
  Open = "open",
  Filling = "filling",
  Cancelled = "cancelled",
  Closed = "closed",
  Error = "error",
}

export enum OrderType {
  BuyLimit = "buy.limit",
  SellLimit = "sell.limit",
  BuyMarket = "buy.market",
  SellMarket = "sell.market",
}

/**
 * Make all properties in T optional
 */
export interface PartialOrder {
  botRunId?: string;
  baseSymbolId?: string;
  quoteSymbolId?: string;
  exchangeId?: string;
  stopLossOrderId?: string;
  relatedOrderId?: string;
  extOrderId?: string;
  stateId?: OrderState;
  typeId?: OrderType;

  /** @format date-time */
  opened?: string;

  /** @format date-time */
  closed?: string;
  quantity?: BigNum;
  price?: BigNum;
  gross?: BigNum;
  fees?: BigNum;
  strike?: BigNum;
  limit?: BigNum;
  stop?: BigNum;
  id?: string;

  /** @format date-time */
  created?: string;

  /** @format date-time */
  updated?: string;
  displayName?: string;
}

export interface ApiBotOrderDescriptor {
  /** Make all properties in T optional */
  def: PartialBotDefinition;

  /** Make all properties in T optional */
  instance: PartialBotInstance;

  /** Make all properties in T optional */
  run: PartialBotRun;

  /** Make all properties in T optional */
  order: PartialOrder;
}

export enum ApiTimeResolution {
  Type5M = "5m",
  Type15M = "15m",
  Type1H = "1h",
  Type4H = "4h",
}

/**
 * Mirrors BacktestRequest
 */
export interface ApiBacktestRequest {
  from: string;
  to: string;
  genome: string;
  res: ApiTimeResolution;
  symbols: string;

  /** @format double */
  maxWagerPct?: number;
  remove?: boolean;
  name?: string;
  returnEarly?: boolean;
}

export interface GenotypeInstanceDescriptor {
  id: string;

  /** @format date-time */
  created: string;

  /** @format date-time */
  updated: string;
  displayName?: string;
  name: string;
  symbols: string;
  resId: ApiTimeResolution;
  baseSymbolId: string;
  quoteSymbolId: string;
  genome: string;
  fsmState: GeneticBotFsmState;
  duration: object;

  /** @format double */
  numOrders: number;
  totalProfit: BigNum;
  totalFees: BigNum;
  avgProfitPerDay: BigNum;

  /** @format double */
  avgProfitPctPerDay: number;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "/src/roles/api";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  private encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  private addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  private addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter((key) => "undefined" !== typeof query[key]);
    return keys
      .map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)))
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string") ? JSON.stringify(input) : input,
    [ContentType.FormData]: (input: any) =>
      Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
            ? JSON.stringify(property)
            : `${property}`,
        );
        return formData;
      }, new FormData()),
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  private mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  private createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(`${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`, {
      ...requestParams,
      headers: {
        ...(type && type !== ContentType.FormData ? { "Content-Type": type } : {}),
        ...(requestParams.headers || {}),
      },
      signal: cancelToken ? this.createAbortSignal(cancelToken) : void 0,
      body: typeof body === "undefined" || body === null ? null : payloadFormatter(body),
    }).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title primordial
 * @version 1.0.0
 * @license UNLICENSED
 * @baseUrl /src/roles/api
 * @contact jasonlscharf@gmail.com
 *
 * Algorithmic trading platform
 */
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  info = {
    /**
     * No description
     *
     * @name GetInfo
     * @request GET:/info
     */
    getInfo: (params: RequestParams = {}) =>
      this.request<InfoResponse, any>({
        path: `/info`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  orders = {
    /**
     * No description
     *
     * @name GetBotOrderDescriptors
     * @request GET:/orders/{workspaceId}/strategies/{strategyId}/orders
     */
    getBotOrderDescriptors: (workspaceId: string, strategyId: string, params: RequestParams = {}) =>
      this.request<ApiBotOrderDescriptor[], any>({
        path: `/orders/${workspaceId}/strategies/${strategyId}/orders`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  sandbox = {
    /**
     * No description
     *
     * @name RunBacktest
     * @request POST:/sandbox/run
     */
    runBacktest: (data: ApiBacktestRequest, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/sandbox/run`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name GetBotResultsStatus
     * @request GET:/sandbox/results/status/{instanceIdOrName}
     */
    getBotResultsStatus: (instanceIdOrName: string, params: RequestParams = {}) =>
      this.request<{ runState: RunState }, any>({
        path: `/sandbox/results/status/${instanceIdOrName}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name GetBotResults
     * @request GET:/sandbox/results/{instanceIdOrName}
     */
    getBotResults: (instanceIdOrName: string, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/sandbox/results/${instanceIdOrName}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name GetPrices
     * @request GET:/sandbox/prices/{symbolPair}
     */
    getPrices: (symbolPair: string, query?: { res?: string; from?: string; to?: string }, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/sandbox/prices/${symbolPair}`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),
  };
  workspaces = {
    /**
     * No description
     *
     * @name GetRunningInstances
     * @request GET:/workspaces/{workspaceId}/strategies/{strategyId}/instances/{status}
     */
    getRunningInstances: (
      workspaceId: string,
      strategyId: string,
      status: string,
      query?: { limit?: number },
      params: RequestParams = {},
    ) =>
      this.request<GenotypeInstanceDescriptor[], any>({
        path: `/workspaces/${workspaceId}/strategies/${strategyId}/instances/${status}`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name GetTopBacktests
     * @request GET:/workspaces/{workspaceId}/strategies/{strategyId}/backtests/top
     */
    getTopBacktests: (
      workspaceId: string,
      strategyId: string,
      query?: { limit?: number },
      params: RequestParams = {},
    ) =>
      this.request<GenotypeInstanceDescriptor[], any>({
        path: `/workspaces/${workspaceId}/strategies/${strategyId}/backtests/top`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name GetWorkspaceLinks
     * @request GET:/workspaces/{workspaceId}/links
     */
    getWorkspaceLinks: (workspaceId: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/workspaces/${workspaceId}/links`,
        method: "GET",
        ...params,
      }),
  };
}

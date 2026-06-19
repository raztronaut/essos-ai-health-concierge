/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as lib_functions from "../lib/functions.js";
import type * as lib_util from "../lib/util.js";
import type * as lib_validators from "../lib/validators.js";
import type * as machine from "../machine.js";
import type * as model_activity from "../model/activity.js";
import type * as model_conversations from "../model/conversations.js";
import type * as model_escalations from "../model/escalations.js";
import type * as model_jobFailures from "../model/jobFailures.js";
import type * as model_memory from "../model/memory.js";
import type * as model_messages from "../model/messages.js";
import type * as model_patientCards from "../model/patientCards.js";
import type * as model_patients from "../model/patients.js";
import type * as model_pipeline from "../model/pipeline.js";
import type * as model_slack from "../model/slack.js";
import type * as model_telemetry from "../model/telemetry.js";
import type * as mutations from "../mutations.js";
import type * as queries from "../queries.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "lib/functions": typeof lib_functions;
  "lib/util": typeof lib_util;
  "lib/validators": typeof lib_validators;
  machine: typeof machine;
  "model/activity": typeof model_activity;
  "model/conversations": typeof model_conversations;
  "model/escalations": typeof model_escalations;
  "model/jobFailures": typeof model_jobFailures;
  "model/memory": typeof model_memory;
  "model/messages": typeof model_messages;
  "model/patientCards": typeof model_patientCards;
  "model/patients": typeof model_patients;
  "model/pipeline": typeof model_pipeline;
  "model/slack": typeof model_slack;
  "model/telemetry": typeof model_telemetry;
  mutations: typeof mutations;
  queries: typeof queries;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

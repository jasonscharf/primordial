const { describe, it } = intern.getInterface("bdd");
const { assert } = intern.getPlugin("chai");

import Command from "@theintern/leadfoot/Command";

import { Context } from "@theintern/leadfoot/Command";
import Element from "@theintern/leadfoot/Element";
import Remote from "intern/lib/executors/Node";
import Test from "intern/lib/Test";
import Suite from "intern/lib/Suite";
import { before } from "intern/lib/interfaces/tdd";
import env from "../common-backend/env";


export { Command, Context, Element, Remote, Suite, Test }
export { assert, before, describe, it, env }

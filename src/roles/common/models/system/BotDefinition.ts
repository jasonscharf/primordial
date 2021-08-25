import { MutableModel } from "../MutableEntity";


export interface BotDefinition extends MutableModel {
    workspaceId: string;
    name: string;
    symbols: string;
    genome: string;
    description?: string;
}

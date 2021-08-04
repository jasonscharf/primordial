import { MutableModel } from "../MutableEntity";


export interface BotDefinition extends MutableModel {
    workspaceId: string;
    genome: string;
    description?: string;
}

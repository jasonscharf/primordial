import { MutableModel } from "../MutableEntity";


export interface BotRun extends MutableModel {
    instanceId: string;
    active: boolean;
    from: Date;
    to: Date;
}

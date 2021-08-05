import { MutableModel } from "../MutableEntity";


export interface Workspace extends MutableModel {
    ownerId: string;
    description?: string;
}
